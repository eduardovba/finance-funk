import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Helper to read the mapping file
const getMapping = () => {
    try {
        const filePath = path.join(process.cwd(), 'src/data/pension_fund_map.json');
        const fileContent = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error('Error reading pension map:', error);
        return [];
    }
};

const CACHE_FILE = path.join(process.cwd(), 'src/data/pension_live_prices.json');

const getCache = () => {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const fileContent = fs.readFileSync(CACHE_FILE, 'utf8');
            return JSON.parse(fileContent);
        }
    } catch (error) {
        console.error('Error reading cache:', error);
    }
    return {};
};

const saveCache = (data) => {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving cache:', error);
    }
};

const fetchPrices = async () => {
    const mapping = getMapping();
    const results = {}; // key: asset name, value: { price, currency }

    // Preserve existing cache to avoid wiping out data on partial failures?
    // Or merge? Let's merge with existing cache.
    const existing = getCache();
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

            // Simple scraping logic based on item.selector
            // Need to handle regex construction safely
            if (item.selector) {
                const escapedSelector = item.selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                // Try to match specific class pattern or just the text inside the element?
                // The previous implementation used a regex for class="..."
                // Let's broaden it or use what worked.
                // Assuming previous regex worked:
                const regex = new RegExp(`class=["']${escapedSelector}["'][^>]*>([^<]+)`, 'i');
                const match = text.match(regex);

                if (match && match[1]) {
                    let priceStr = match[1].trim();
                    const isPence = item.isPence === true || priceStr.toLowerCase().includes('p');
                    // Remove non-numeric chars except dot and minus
                    priceStr = priceStr.replace(/[^\d.-]/g, '');
                    price = parseFloat(priceStr);
                    if (isPence) price = price / 100;
                }
            }

            // Allow for specific "regex" in mapping if selector isn't enough? 
            // For now, stick to previous logic.

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
        saveCache(newData);
        return NextResponse.json(newData);
    }

    // Default: Return cache. If empty, maybe trigger fetch? 
    const cached = getCache();
    // If cache is empty, we force fetch to ensure user sees something first time.
    if (Object.keys(cached).length === 0) {
        const newData = await fetchPrices();
        saveCache(newData);
        return NextResponse.json(newData);
    }

    return NextResponse.json(cached);
}
