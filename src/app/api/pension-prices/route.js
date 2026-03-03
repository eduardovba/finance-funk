import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/kv';

const MAP_KEY = 'pension_fund_map';
const CACHE_KEY = 'pension_live_prices';

// Helper to read the mapping
const getMapping = async () => {
    try {
        return await kvGet(MAP_KEY, []);
    } catch (error) {
        console.error('Error reading pension map:', error);
        return [];
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

const saveCache = async (data) => {
    try {
        await kvSet(CACHE_KEY, data);
    } catch (error) {
        console.error('Error saving cache:', error);
    }
};

const fetchPrices = async () => {
    const mapping = await getMapping();
    const results = {};

    // Merge with existing cache
    const existing = await getCache();
    Object.assign(results, existing);

    await Promise.all(mapping.map(async (item) => {
        try {
            if (item.type === 'manual') {
                let price = item.price;
                if (item.isPence) price = price / 100;
                results[item.asset] = { price, currency: 'GBP', lastUpdated: new Date().toISOString() };
                return;
            }

            if (item.type === 'market-data') return;

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

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh');

    if (refresh === 'true') {
        const newData = await fetchPrices();
        await saveCache(newData);
        return NextResponse.json(newData);
    }

    const cached = await getCache();
    if (Object.keys(cached).length === 0) {
        const newData = await fetchPrices();
        await saveCache(newData);
        return NextResponse.json(newData);
    }

    return NextResponse.json(cached);
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { action } = body;

        if (action === 'test-scrape') {
            const { url, assetName } = body;
            if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

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

        if (action === 'save-config') {
            const { asset, url, ticker, type, selector, buyPath } = body;
            const mapping = await getMapping();

            const exists = mapping.find(m => m.asset === asset);
            if (exists) return NextResponse.json({ success: true, message: 'Existing' });

            const newItem = {
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

            mapping.push(newItem);
            await kvSet(MAP_KEY, mapping);

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
