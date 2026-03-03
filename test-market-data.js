import { fetchGoogleFinance } from './fetch-test.js';

// Recreate the function to test
async function test() {
    const fetchGoogleFinance = async (ticker) => {
        try {
            let queries = [];
            if (ticker.endsWith('.SA')) queries = [`${ticker.replace('.SA', '')}:BVMF`];
            else if (ticker.endsWith('.L')) queries = [`${ticker.replace('.L', '')}:LON`];
            else if (ticker.includes('-') || ticker.includes('/')) queries = [ticker];
            else queries = [`${ticker}:NASDAQ`, `${ticker}:NYSE`];

            for (const query of queries) {
                const response = await fetch(`https://www.google.com/finance/quote/${query}`, {
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                if (!response.ok) continue;
                const html = await response.text();
                const ds2Match = html.match(/AF_initDataCallback\(\{key: 'ds:2'[\s\S]*?data:([\s\S]*?)(?:,\s*sideChannel:|\}\);)/);
                
                let price = null;
                let currency = null;
                if (ds2Match) {
                    let jsonStr = ds2Match[1].trim();
                    if (jsonStr.endsWith(',')) jsonStr = jsonStr.slice(0, -1);
                    const ds2Data = JSON.parse(jsonStr);
                    const root = ds2Data?.[0]?.[0];
                    if (Array.isArray(root?.[0])) {
                        const stats = root[0][5];
                        if (stats && Array.isArray(stats)) {
                            price = stats[0];
                            currency = root[0][4]; 
                        }
                    }
                }
                
                if (price !== null) {
                    if (!currency) currency = ticker.endsWith('.SA') ? 'BRL' : ticker.endsWith('.L') ? 'GBP' : 'USD';
                    if (currency === 'GBX' || currency === 'GBp') {
                        price = price / 100;
                        currency = 'GBP';
                    }
                    return { symbol: ticker, price, currency };
                }
            }
        } catch (err) {}
        return null;
    };
    
    console.log(await fetchGoogleFinance('URNM.L'));
    console.log(await fetchGoogleFinance('URNP.L'));
}
test();
