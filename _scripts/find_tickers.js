const yahooFinance = require('yahoo-finance2').default;

const assets = [
    "BlackRock Consensus 85 Fund",
    "HL Growth Fund",
    "Aviva Pensions BlackRock US Equity Index Tracker",
    "Aviva Pensions International Index Tracking",
    "Fidelity Global Technology",
    "HSBC FTSE All-World Index",
    "iShares Overseas Government Bond Index",
    "iShares Physical Gold",
    "Fidelity Index US Fund",
    "Fidelity Index Europe ex UK Fund",
    "iShares Global Bonds",
    "Ishares US Bonds 20+ Years",
    "PLC Russell 2000",
    "Microstrategy",
    "MSCI Turkey",
    "L&G PMC 2045 - 2050 Target Date Fund 3"
];

async function run() {
    // Suppress console.info from library
    const originalInfo = console.info;
    console.info = () => { };

    for (const asset of assets) {
        try {
            console.log(`\n--- Searching for: ${asset} ---`);
            const result = await yahooFinance.search(asset);

            if (result.quotes && result.quotes.length > 0) {
                // Prioritize funds (MutualFund, ETF) in UK/London
                const sorted = result.quotes.sort((a, b) => {
                    const aScore = (a.exchange === 'LSE' || a.symbol.endsWith('.L')) ? 1 : 0;
                    const bScore = (b.exchange === 'LSE' || b.symbol.endsWith('.L')) ? 1 : 0;
                    return bScore - aScore;
                });

                sorted.slice(0, 5).forEach(q => {
                    console.log(`Symbol: ${q.symbol}`);
                    console.log(`Name: ${q.shortname || q.longname}`);
                    console.log(`Type: ${q.quoteType} | Exchange: ${q.exchange}`);
                    console.log('-');
                });
            } else {
                console.log(`No matches found.`);
            }
        } catch (e) {
            console.error(`Error searching ${asset}:`, e.message);
        }
    }
    console.info = originalInfo;
}

run();
