import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/kv';

// ═══════════ CACHE CONFIG ═══════════
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const CACHE_KEY = 'market_data_cache';

// Track in-flight background refresh to prevent duplicate scrapes
let backgroundRefreshInFlight = false;

// ═══════════ CACHE HELPERS ═══════════
const loadCacheFromDB = async () => {
    try {
        const raw = await kvGet(CACHE_KEY, null);
        if (raw && typeof raw === 'object') {
            return raw;
        }
    } catch (e) {
        console.error('[Cache] Failed to load from DB:', e.message);
    }
    return {};
};

const persistCacheToDB = async (cache) => {
    try {
        await kvSet(CACHE_KEY, cache);
    } catch (e) {
        console.error('[Cache] Failed to persist to DB:', e.message);
    }
};

const isFresh = (entry) => {
    if (!entry || !entry.timestamp) return false;
    return Date.now() - entry.timestamp < CACHE_TTL_MS;
};

// ═══════════ GOOGLE FINANCE SCRAPER ═══════════
const fetchGoogleFinance = async (ticker) => {
    try {
        let queries = [];

        if (ticker.endsWith('.SA')) {
            queries = [`${ticker.replace('.SA', '')}:BVMF`];
        } else if (ticker.endsWith('.L')) {
            queries = [`${ticker.replace('.L', '')}:LON`];
        } else if (ticker.includes('-') || ticker.includes('/')) {
            queries = [ticker];
        } else {
            queries = [`${ticker}:NASDAQ`, `${ticker}:NYSE`];
        }

        for (const query of queries) {
            const response = await fetch(`https://www.google.com/finance/quote/${query}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            if (!response.ok) continue;

            const html = await response.text();

            const ds2Match = html.match(/AF_initDataCallback\(\{key: 'ds:2'[\s\S]*?data:([\s\S]*?)(?:,\s*sideChannel:|\}\);)/);
            const ds11Match = html.match(/AF_initDataCallback\(\{key: 'ds:11'[\s\S]*?data:([\s\S]*?)\}\);/);

            let price = null;
            let change = 0;
            let change1M = 0;
            let currency = null;

            if (ds2Match) {
                try {
                    let jsonStr = ds2Match[1].trim();
                    if (jsonStr.endsWith(',')) jsonStr = jsonStr.slice(0, -1);
                    const ds2Data = JSON.parse(jsonStr);

                    const root = ds2Data?.[0]?.[0];
                    if (Array.isArray(root?.[0])) {
                        const stats = root[0][5];
                        if (stats && Array.isArray(stats)) {
                            price = stats[0];
                            change = stats[2];
                            currency = root[0][4];
                        }
                    } else if (typeof root?.[0] === 'string') {
                        price = root[8];
                        currency = root[5];
                    }
                } catch (e) { console.error('Error parsing ds:2 for', ticker, e); }
            }

            if (ds11Match) {
                try {
                    const ds11Data = ds11Match[1];
                    const pointsMatch = ds11Data.match(/\[\d+\.?\d*,\s*[-+]?\d+\.?\d*,\s*([-+]?\d+\.?\d*),\s*2,\s*2,\s*[23]\]/g);
                    if (pointsMatch && pointsMatch.length > 0) {
                        const lastPoint = pointsMatch[pointsMatch.length - 1];
                        const pctMatch = lastPoint.match(/[-+]?\d+\.?\d*/g);
                        if (pctMatch && pctMatch[2]) {
                            change1M = parseFloat(pctMatch[2]) * 100;
                        }
                    }
                } catch (e) { console.warn(`[Market] Failed to parse ds:11 for ${ticker}:`, e.message); }
            }

            if (price !== null) {
                if (!currency) {
                    currency = ticker.endsWith('.SA') ? 'BRL' : ticker.endsWith('.L') ? 'GBP' : 'USD';
                }

                if (currency === 'GBX' || currency === 'GBp') {
                    price = price / 100;
                    currency = 'GBP';
                }

                return {
                    symbol: ticker,
                    price: price,
                    changePercent: change,
                    change1M: change1M !== 0 ? change1M : change,
                    currency: currency
                };
            }
        }
    } catch (err) {
        console.error(`Error scraping ${ticker}:`, err);
    }
    return null;
};

// ═══════════ BACKGROUND REFRESH (SWR) ═══════════
const backgroundRefresh = async (staleTickers, dbCache) => {
    if (backgroundRefreshInFlight) return;
    backgroundRefreshInFlight = true;

    try {
        console.log(`[Cache] Background refresh: scraping ${staleTickers.length} stale tickers`);
        const results = await Promise.all(staleTickers.map(fetchGoogleFinance));

        results.forEach(result => {
            if (result) {
                dbCache[result.symbol] = {
                    data: result,
                    timestamp: Date.now()
                };
            }
        });

        await persistCacheToDB(dbCache);
        console.log(`[Cache] Background refresh complete: updated ${results.filter(Boolean).length} tickers`);
    } catch (e) {
        console.error('[Cache] Background refresh failed:', e.message);
    } finally {
        backgroundRefreshInFlight = false;
    }
};

// ═══════════ API HANDLER ═══════════
export async function POST(request) {
    try {
        const { tickers, forceRefresh } = await request.json();

        if (!tickers || tickers.length === 0) {
            return NextResponse.json({ error: 'No tickers provided' }, { status: 400 });
        }

        // Load cache from persistent DB (survives serverless cold starts)
        const dbCache = await loadCacheFromDB();

        const marketData = {};
        const staleTickers = [];

        // Phase 1: Collect cached data, identify stale tickers
        for (const ticker of tickers) {
            const cached = dbCache[ticker];
            if (!forceRefresh && cached && isFresh(cached)) {
                marketData[ticker] = cached.data;
            } else {
                staleTickers.push(ticker);
                // Return stale data immediately (SWR pattern)
                if (cached?.data) {
                    marketData[ticker] = cached.data;
                }
            }
        }

        const cachedCount = tickers.length - staleTickers.length;

        // Phase 2: Handle stale tickers
        if (staleTickers.length > 0 && forceRefresh) {
            // Force refresh: scrape synchronously and wait for results
            console.log(`[Cache] Force refresh: scraping ${staleTickers.length} tickers`);
            const results = await Promise.all(staleTickers.map(fetchGoogleFinance));

            results.forEach(result => {
                if (result) {
                    marketData[result.symbol] = result;
                    dbCache[result.symbol] = {
                        data: result,
                        timestamp: Date.now()
                    };
                }
            });

            await persistCacheToDB(dbCache);
        } else if (staleTickers.length > 0) {
            // SWR: return stale data immediately, refresh in background
            const hasStaleData = staleTickers.every(t => dbCache[t]?.data);
            if (hasStaleData) {
                // All stale tickers have cached data — return immediately, refresh in background
                console.log(`[Cache] SWR: returning stale data for ${staleTickers.length} tickers, refreshing in background`);
                backgroundRefresh(staleTickers, { ...dbCache });
            } else {
                // Some tickers have no cached data at all — must scrape synchronously
                const missingTickers = staleTickers.filter(t => !dbCache[t]?.data);
                const staleOnlyTickers = staleTickers.filter(t => dbCache[t]?.data);

                console.log(`[Cache] Scraping ${missingTickers.length} missing tickers (${staleOnlyTickers.length} served stale)`);

                // Scrape only the truly missing tickers synchronously
                const results = await Promise.all(missingTickers.map(fetchGoogleFinance));
                results.forEach(result => {
                    if (result) {
                        marketData[result.symbol] = result;
                        dbCache[result.symbol] = {
                            data: result,
                            timestamp: Date.now()
                        };
                    }
                });

                await persistCacheToDB(dbCache);

                // Background refresh the stale-but-present tickers
                if (staleOnlyTickers.length > 0) {
                    backgroundRefresh(staleOnlyTickers, { ...dbCache });
                }
            }
        } else {
            console.log(`[Cache] All ${cachedCount} tickers served from cache`);
        }

        // Add cache metadata for transparency
        const oldestEntry = staleTickers.length === 0
            ? Math.min(...tickers.map(t => dbCache[t]?.timestamp || Date.now()))
            : Date.now();

        marketData._cacheInfo = {
            cached: cachedCount,
            refreshed: staleTickers.length,
            total: tickers.length,
            lastRefreshed: new Date(oldestEntry).toISOString(),
            ttlMinutes: CACHE_TTL_MS / 60000
        };

        return NextResponse.json(marketData);

    } catch (error) {
        console.error('Market data fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
    }
}
