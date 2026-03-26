import { NextRequest, NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/kv';
import { z } from 'zod';
import { validateBody } from '@/lib/validation';
import { getMarketDataProvider, type MarketDataResult } from '@/lib/marketDataProvider';
import { applyRateLimit } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';
import { apiError } from '@/lib/apiError';

// ═══════════ CACHE CONFIG ═══════════
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const CACHE_KEY = 'market_data_cache';

// Track in-flight background refresh to prevent duplicate scrapes
let backgroundRefreshInFlight = false;

const PostMarketDataSchema = z.object({
    tickers: z.array(z.string().min(1)).min(1, 'No tickers provided'),
    forceRefresh: z.boolean().optional().default(false)
});

// ═══════════ TYPES ═══════════
interface CacheEntry {
    data: MarketDataResult;
    timestamp: number;
}

interface CacheInfo {
    cached: number;
    refreshed: number;
    total: number;
    lastRefreshed: string;
    ttlMinutes: number;
    provider: string;
}

type MarketDataCache = Record<string, CacheEntry>;
type MarketDataResponse = Record<string, MarketDataResult | CacheInfo> & { _cacheInfo?: CacheInfo };

// ═══════════ CACHE HELPERS ═══════════
const loadCacheFromDB = async (): Promise<MarketDataCache> => {
    try {
        const raw = await kvGet(CACHE_KEY, null);
        if (raw && typeof raw === 'object') {
            return raw as MarketDataCache;
        }
    } catch (e) {
        logger.error('Cache', e, { action: 'loadFromDB' });
    }
    return {};
};

const persistCacheToDB = async (cache: MarketDataCache): Promise<void> => {
    try {
        await kvSet(CACHE_KEY, cache);
    } catch (e) {
        logger.error('Cache', e, { action: 'persistToDB' });
    }
};

const isFresh = (entry: CacheEntry | undefined): boolean => {
    if (!entry || !entry.timestamp) return false;
    return Date.now() - entry.timestamp < CACHE_TTL_MS;
};

// ═══════════ PROVIDER ═══════════
const provider = getMarketDataProvider();

// ═══════════ BACKGROUND REFRESH (SWR) ═══════════
const backgroundRefresh = async (staleTickers: string[], dbCache: MarketDataCache): Promise<void> => {
    if (backgroundRefreshInFlight) return;
    backgroundRefreshInFlight = true;

    try {
        logger.info('Cache', `Background refresh: fetching ${staleTickers.length} stale tickers via ${provider.name}`);
        const results = await Promise.all(staleTickers.map(t => provider.fetchQuote(t)));

        results.forEach(result => {
            if (result) {
                dbCache[result.symbol] = {
                    data: result,
                    timestamp: Date.now()
                };
            }
        });

        await persistCacheToDB(dbCache);
        logger.info('Cache', `Background refresh complete: updated ${results.filter(Boolean).length} tickers`);
    } catch (e) {
        logger.error('Cache', e, { action: 'backgroundRefresh' });
    } finally {
        backgroundRefreshInFlight = false;
    }
};

// ═══════════ API HANDLER ═══════════
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const limited = await applyRateLimit(request, 'marketData');
        if (limited) return limited;

        const body: unknown = await request.json();
        const { data, error } = validateBody(PostMarketDataSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        const { tickers, forceRefresh } = data!;

        // Load cache from persistent DB (survives serverless cold starts)
        const dbCache: MarketDataCache = await loadCacheFromDB();

        const marketData: Record<string, MarketDataResult> = {};
        const staleTickers: string[] = [];

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
            // Force refresh: fetch synchronously and wait for results
            logger.info('Cache', `Force refresh: fetching ${staleTickers.length} tickers via ${provider.name}`);
            const results = await Promise.all(staleTickers.map(t => provider.fetchQuote(t)));

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
                logger.info('Cache', `SWR: returning stale data for ${staleTickers.length} tickers, refreshing in background`);
                backgroundRefresh(staleTickers, { ...dbCache });
            } else {
                // Some tickers have no cached data at all — must fetch synchronously
                const missingTickers = staleTickers.filter(t => !dbCache[t]?.data);
                const staleOnlyTickers = staleTickers.filter(t => dbCache[t]?.data);

                logger.info('Cache', `Fetching ${missingTickers.length} missing tickers via ${provider.name} (${staleOnlyTickers.length} served stale)`);

                // Fetch only the truly missing tickers synchronously
                const results = await Promise.all(missingTickers.map(t => provider.fetchQuote(t)));
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
            logger.info('Cache', `All ${cachedCount} tickers served from cache`);
        }

        // Add cache metadata for transparency
        const oldestEntry = staleTickers.length === 0
            ? Math.min(...tickers.map((t: string) => dbCache[t]?.timestamp || Date.now()))
            : Date.now();

        const response: MarketDataResponse = { ...marketData };
        response._cacheInfo = {
            cached: cachedCount,
            refreshed: staleTickers.length,
            total: tickers.length,
            lastRefreshed: new Date(oldestEntry).toISOString(),
            ttlMinutes: CACHE_TTL_MS / 60000,
            provider: provider.name
        };

        return NextResponse.json(response);

    } catch (error) {
        logger.error('MarketData', error);
        return apiError('Failed to fetch market data', 500, error);
    }
}
