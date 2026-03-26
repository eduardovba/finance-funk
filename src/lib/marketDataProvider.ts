/**
 * Market Data Provider — pluggable interface for fetching live asset prices.
 *
 * Currently uses Google Finance HTML scraping (fragile but free).
 * Can be swapped for Yahoo Finance, Alpha Vantage, Twelve Data, etc.
 */

// ═══════════ Provider Interface ═══════════

export interface MarketDataResult {
    symbol: string;
    price: number;
    changePercent: number;
    change1M: number;
    currency: string;
}

export interface MarketDataProvider {
    /** Human-readable name for logging */
    readonly name: string;
    /** Fetch a single quote. Returns null if the ticker is not found. */
    fetchQuote(ticker: string): Promise<MarketDataResult | null>;
}

// ═══════════ Google Finance Provider ═══════════

export class GoogleFinanceProvider implements MarketDataProvider {
    readonly name = 'Google Finance';

    async fetchQuote(ticker: string): Promise<MarketDataResult | null> {
        try {
            let queries: string[] = [];

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

                let price: number | null = null;
                let change = 0;
                let change1M = 0;
                let currency: string | null = null;

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
                    } catch (e) { console.warn(`[Market] Failed to parse ds:11 for ${ticker}:`, (e as Error).message); }
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
                        price,
                        changePercent: change,
                        change1M: change1M !== 0 ? change1M : change,
                        currency
                    };
                }
            }
        } catch (err) {
            console.error(`[GoogleFinance] Error scraping ${ticker}:`, err);
        }
        return null;
    }
}

// ═══════════ Provider Factory ═══════════

/**
 * Returns the configured market data provider.
 * Currently always returns GoogleFinanceProvider.
 * Future: check env vars or DB config to select provider.
 */
export function getMarketDataProvider(): MarketDataProvider {
    // Future: switch on process.env.MARKET_DATA_PROVIDER
    // case 'yahoo': return new YahooFinanceProvider();
    // case 'alpha_vantage': return new AlphaVantageProvider();
    return new GoogleFinanceProvider();
}
