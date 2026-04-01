import { NextRequest, NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/kv';
import { z } from 'zod';
import { validateBody, optionalString } from '@/lib/validation';
import { applyRateLimit } from '@/lib/rateLimit';
import pensionMapJson from '@/data/pension_fund_map.json';

const MAP_KEY = 'pension_fund_map';
const CACHE_KEY = 'pension_live_prices';

const PostTestScrapeSchema = z.object({
    action: z.literal('test-scrape'),
    url: z.string().url('URL is required'),
    assetName: z.string().optional()
});

const PostSaveConfigSchema = z.object({
    action: z.literal('save-config'),
    asset: z.string().min(1),
    url: z.string().optional(),
    ticker: z.string().optional(),
    type: z.string().optional(),
    selector: z.string().optional(),
    buyPath: z.string().optional()
});

const PostPensionPriceSchema = z.union([PostTestScrapeSchema, PostSaveConfigSchema]);

// Helper to read the mapping — uses the JSON file as the canonical source,
// then merges any KV-stored entries (user-added funds) on top.
const getMapping = async (): Promise<any[]> => {
    try {
        const jsonEntries = [...(pensionMapJson as any[])];
        const kvEntries = await kvGet<any[]>(MAP_KEY, []) || [];
        // Merge: KV entries override JSON for matching asset names,
        // and new KV entries (user-added) are appended.
        const byAsset = new Map<string, any>();
        jsonEntries.forEach(e => byAsset.set(e.asset, e));
        kvEntries.forEach(e => { if (e.asset) byAsset.set(e.asset, e); });
        return Array.from(byAsset.values());
    } catch (error) {
        console.error('Error reading pension map:', error);
        return [...(pensionMapJson as any[])];
    }
};

const getCache = async () => {
    try {
        return await kvGet(CACHE_KEY, {});
    } catch (error) {
        console.error('Error reading cache:', error);
        return {};
    }
};

const saveCache = async (data: Record<string, any>) => {
    try {
        await kvSet(CACHE_KEY, data);
    } catch (error) {
        console.error('Error saving cache:', error);
    }
};

const fetchPrices = async () => {
    const mapping = await getMapping();
    const results: Record<string, any> = {};

    // Merge with existing cache
    const existing = await getCache();
    Object.assign(results, existing);

    await Promise.all((mapping || []).map(async (item: any) => {
        try {
            if (item.type === 'manual') {
                let price = item.price;
                if (item.isPence) price = price / 100;
                results[item.asset] = { price, currency: 'GBP', lastUpdated: new Date().toISOString() };
                return;
            }

            // Yahoo Finance API — structured JSON, most reliable for exchange-traded funds
            if (item.type === 'yahoo' && item.ticker) {
                try {
                    const yahooRes = await fetch(
                        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(item.ticker)}?interval=1d&range=1d`,
                        { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' } }
                    );
                    if (yahooRes.ok) {
                        const yahooData = await yahooRes.json();
                        const meta = yahooData?.chart?.result?.[0]?.meta;
                        if (meta?.regularMarketPrice) {
                            let price = meta.regularMarketPrice;
                            let currency = meta.currency || 'GBP';
                            // Yahoo returns GBp/GBX (pence) — convert to GBP
                            if (currency === 'GBp' || currency === 'GBX' || currency === 'GBx') {
                                price = price / 100;
                                currency = 'GBP';
                            }
                            results[item.asset] = { price, currency, lastUpdated: new Date().toISOString() };
                            return;
                        }
                    }
                    console.warn(`[Yahoo] No price for ${item.asset} (${item.ticker})`);
                } catch (e) {
                    console.error(`[Yahoo] Error fetching ${item.asset}:`, e);
                }
                return;
            }


            if (!item.url) return;

            const response = await fetch(item.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            if (!response.ok) {
                console.error(`Failed to fetch ${item.asset}: ${response.status}`);
                return;
            }

            let text = await response.text();
            let price = null;

            if (item.selector) {
                const escapedSelector = item.selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regexClass = new RegExp(`class=["']${escapedSelector}["'][^>]*>([^<]+)`, 'i');
                const regexId = new RegExp(`id=["']${escapedSelector}["'][^>]*>([^<]+)`, 'i');
                const match = text.match(regexClass) || text.match(regexId);

                if (match && match[1]) {
                    let priceStr = match[1].trim();
                    const isPence = item.isPence === true || priceStr.toLowerCase().includes('p');
                    priceStr = priceStr.replace(/[^\d.-]/g, '');
                    price = parseFloat(priceStr);
                    if (isPence) price = price / 100;
                }
            }

            if (price !== null && !isNaN(price)) {
                results[item.asset] = { price, currency: 'GBP', lastUpdated: new Date().toISOString() };
            }

        } catch (error) {
            console.error(`Error scraping ${item.asset}:`, error);
        }
    }));

    return results;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
    const limited = await applyRateLimit(request, 'marketData');
    if (limited) return limited;

    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh');

    if (refresh === 'true') {
        const newData = await fetchPrices();
        await saveCache(newData);
        return NextResponse.json(newData);
    }

    const cached = await getCache();
    if (Object.keys(cached || {}).length === 0) {
        const newData = await fetchPrices();
        await saveCache(newData);
        return NextResponse.json(newData);
    }

    return NextResponse.json(cached);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const limited = await applyRateLimit(request, 'marketData');
        if (limited) return limited;

        const body: unknown = await request.json();
        const { data, error } = validateBody(PostPensionPriceSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        if (data!.action === 'test-scrape') {
            const { url, assetName } = data! as any;

            console.log(`Testing scrape for ${assetName} at ${url}`);

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            if (!response.ok) return NextResponse.json({ error: 'Failed to fetch URL' }, { status: 400 });

            const text = await response.text();
            let price = null;
            let type = 'unknown';
            let selector = null;
            let scrapedName = null;

            const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
                scrapedName = titleMatch[1].split('|')[0].split('-')[0].trim();
            }
            if (!scrapedName || scrapedName.length < 5) {
                const h1Match = text.match(/<h1[^>]*>([^<]+)<\/h1>/i);
                if (h1Match && h1Match[1]) scrapedName = h1Match[1].trim();
            }

            const selectors = [
                { s: 'detail_value text-grey-800 mb-8 no-wrap', t: 'fidelity' },
                { s: 'bid price-divide', t: 'hl' },
                { s: 'mod-ui-data-list__value', t: 'ft' },
                { s: 'header-nav-data', t: 'blackrock' }
            ];

            for (const sel of selectors) {
                const escapedSelector = sel.s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regexClass = new RegExp(`class=["']${escapedSelector}["'][^>]*>([^<]+)`, 'i');
                const regexId = new RegExp(`id=["']${escapedSelector}["'][^>]*>([^<]+)`, 'i');
                const match = text.match(regexClass) || text.match(regexId);

                if (match && match[1]) {
                    let priceStr = match[1].trim();
                    const isPence = priceStr.toLowerCase().includes('p');
                    priceStr = priceStr.replace(/[^\d.-]/g, '');
                    price = parseFloat(priceStr);
                    if (isPence) price = price / 100;
                    if (price && !isNaN(price)) {
                        type = sel.t;
                        selector = sel.s;
                        break;
                    }
                }
            }

            if (!price) {
                const matches = text.match(/(?:£|\$|R\$)\s*\d+[.,]\d+/g);
                if (matches && matches.length > 0) {
                    price = parseFloat(matches[0].replace(/[^\d.-]/g, ''));
                }
            }

            return NextResponse.json({ price, type, selector, scrapedName });
        }

        if (data!.action === 'save-config') {
            const { asset, url, ticker, type, selector, buyPath } = data! as any;
            const mapping = await getMapping();

            const exists = (mapping || []).find((m: any) => m.asset === asset);
            if (exists) return NextResponse.json({ success: true, message: 'Existing' });

            const newItem: Record<string, any> = {
                asset,
                allocationClass: 'Equity'
            };

            if (buyPath === 'search') {
                newItem.ticker = ticker;
                newItem.type = 'market-data';
            } else {
                newItem.url = url;
                newItem.type = type || 'fidelity';
                newItem.selector = selector || '';
            }

            (mapping || []).push(newItem);
            await kvSet(MAP_KEY, mapping);

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
