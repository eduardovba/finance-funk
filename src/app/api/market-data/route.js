import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { tickers } = await request.json();

        if (!tickers || tickers.length === 0) {
            return NextResponse.json({ error: 'No tickers provided' }, { status: 400 });
        }

        const marketData = {};

        // Helper function to scrape Google Finance
        const fetchGoogleFinance = async (ticker) => {
            try {
                // Build list of query candidates based on ticker format
                let queries = [];

                if (ticker.endsWith('.SA')) {
                    // Brazilian stocks → BVMF exchange
                    queries = [`${ticker.replace('.SA', '')}:BVMF`];
                } else if (ticker.endsWith('.L')) {
                    // London Stock Exchange
                    queries = [`${ticker.replace('.L', '')}:LON`];
                } else if (ticker.includes('-') || ticker.includes('/')) {
                    // Currency pairs (GBP-BRL, GBP-USD) — pass as-is
                    queries = [ticker];
                } else {
                    // US stocks — try NASDAQ first, then NYSE
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

                    // Regex to find price in <div class="YMlKec fxKbKc">...</div>
                    const priceMatch = html.match(/class="YMlKec fxKbKc">([^<]+)<\/div>/);

                    if (priceMatch && priceMatch[1]) {
                        // Clean price string (remove currency symbol, convert comma to dot)
                        let priceStr = priceMatch[1].replace(/[^0-9,.-]/g, '');

                        // Handle Brazilian format (1.234,56 -> 1234.56) vs US (1,234.56 -> 1234.56)
                        if (priceStr.includes(',') && (!priceStr.includes('.') || priceStr.indexOf(',') > priceStr.indexOf('.'))) {
                            priceStr = priceStr.replace(/\./g, '').replace(',', '.');
                        } else {
                            priceStr = priceStr.replace(/,/g, '');
                        }

                        const price = parseFloat(priceStr);
                        if (isNaN(price)) continue;

                        // Parse change percent
                        let change = 0;
                        const changePercentMatch = html.match(/\(([-+]?\d{1,2},\d{2})%\)/);
                        if (changePercentMatch) {
                            change = parseFloat(changePercentMatch[1].replace(',', '.'));
                        }

                        return {
                            symbol: ticker,
                            price: price,
                            changePercent: change,
                            currency: ticker.endsWith('.SA') ? 'BRL' : ticker.endsWith('.L') ? 'GBP' : 'USD'
                        };
                    }
                }
            } catch (err) {
                console.error(`Error scraping ${ticker}:`, err);
            }
            return null;
        };

        // Fetch all concurrently
        const results = await Promise.all(tickers.map(fetchGoogleFinance));

        results.forEach(result => {
            if (result) {
                marketData[result.symbol] = result;
            }
        });

        return NextResponse.json(marketData);

    } catch (error) {
        console.error('Market data fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
    }
}
