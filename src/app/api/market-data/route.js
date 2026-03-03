import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/kv';

// ═══════════ CACHE CONFIG ═══════════
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const CACHE_KEY = 'market_data_cache';

// In-memory cache: Map<ticker, { data, timestamp }>
const tickerCache = new Map();
let cacheHydrated = false;

// ═══════════ CACHE HELPERS ═══════════
const hydrateFromDB = async () => {
    if (cacheHydrated) return;
    cacheHydrated = true;
    try {
        const raw = await kvGet(CACHE_KEY, null);
        if (raw) {
            for (const [ticker, entry] of Object.entries(raw)) {
                tickerCache.set(ticker, entry);
            }
            console.log(`[Cache] Hydrated ${tickerCache.size} tickers from DB`);
        }
    } catch (e) {
        console.error('[Cache] Failed to hydrate from DB:', e.message);
    }
};

const persistToDB = async () => {
    try {
        const obj = {};
        for (const [ticker, entry] of tickerCache.entries()) {
            obj[ticker] = entry;
        }
        await kvSet(CACHE_KEY, obj);
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
                } catch (e) { }
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

// ═══════════ API HANDLER ═══════════
export async function POST(request) {
    try {
        const { tickers, forceRefresh } = await request.json();

        if (!tickers || tickers.length === 0) {
            return NextResponse.json({ error: 'No tickers provided' }, { status: 400 });
        }

        // Hydrate cache from DB on first request
        await hydrateFromDB();

        const marketData = {};
        const staleTickers = [];

        // Phase 1: Collect cached data, identify stale tickers
        for (const ticker of tickers) {
            const cached = tickerCache.get(ticker);
            if (!forceRefresh && cached && isFresh(cached)) {
                marketData[ticker] = cached.data;
            } else {
                staleTickers.push(ticker);
                // If we have stale data, use it as a fallback while we refresh
                if (cached?.data) {
                    marketData[ticker] = cached.data;
                }
            }
        }

        const cachedCount = tickers.length - staleTickers.length;

        // Phase 2: Scrape only the stale/missing tickers
        if (staleTickers.length > 0) {
            console.log(`[Cache] Scraping ${staleTickers.length} stale tickers (${cachedCount} cached)`);

            const results = await Promise.all(staleTickers.map(fetchGoogleFinance));

            results.forEach(result => {
                if (result) {
                    marketData[result.symbol] = result;
                    tickerCache.set(result.symbol, {
                        data: result,
                        timestamp: Date.now()
                    });
                }
            });

            // Persist updated cache to DB
            await persistToDB();
        } else {
            console.log(`[Cache] All ${cachedCount} tickers served from cache`);
        }

        // Add cache metadata for transparency
        const oldestEntry = staleTickers.length === 0
            ? Math.min(...tickers.map(t => tickerCache.get(t)?.timestamp || Date.now()))
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
