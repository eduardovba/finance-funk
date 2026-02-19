const fs = require('fs');
const path = require('path');

// Read the CSV
const csv = fs.readFileSync(path.join(__dirname, '../data/Equity Ledger.csv'), 'utf8');
const lines = csv.trim().split('\n');
const header = lines[0];

// Map of asset names to tickers
const TICKER_MAP = {
    // Brazilian stocks
    'BOVA11': 'BOVA11.SA', 'GGBR4': 'GGBR4.SA', 'VALE3': 'VALE3.SA',
    'BBAS3': 'BBAS3.SA', 'EGIE3': 'EGIE3.SA', 'CMIG4': 'CMIG4.SA', 'AURE3': 'AURE3.SA',
    'Top Dividendos': null, 'Real Investor': null,

    // Equity / Named holdings
    'Monzo - Equity': null, 'Green Gold Farms - Equity': null,

    // Trading 212 assets
    'Entergy': 'ETR', 'Fiserv': 'FISV', 'Alphabet': 'GOOG', 'Arista Networks': 'ANET',
    'Tesla': 'TSLA', 'Sony': 'SONY', 'Talen Energy': 'TLN', 'WPM': 'WPM', 'AEM': 'AEM',
    'AFRM': 'AFRM', 'GEV': 'GEV', 'HES': 'HES', 'NGVC': 'NGVC',
    'iShares BioTech': 'IBB', 'Lemonade': 'LMND', 'TPB': 'TPB', 'HM': 'HBM',
    'Natera': 'NTRA', 'JD': 'JD', 'Microstrategy': 'MSTR',
    'DoorDash': 'DASH', 'ADMA': 'ADMA', 'MWP': 'MWA', 'USA': 'UAMY',
    'SFM': 'SFM', 'CostCo': 'COST', 'NRG': 'NRG', 'Spotify': 'SPOT',
    'PR': 'PPTA', 'ABL': 'ABT', 'IHS': 'IHS', 'Corteva': 'CTVA',
    'Xpeng': 'XPEV', 'Coco': 'COCO', 'IBM': 'IBM', 'LBC': 'LB',
    'JF': 'JXN', 'RMBS': 'RMBS', 'Uber': 'UBER', 'PHM': 'PHM',
    'ORLA': 'ORLA', 'SGLN': 'SGLN', 'T2I': 'TTWO', 'CC': 'COKE',
    'ACM': 'ACMR', 'ASML': 'ASML', 'ZS': 'ZS', 'NVIDIA': 'NVDA',
    'EMCOR': 'EME', 'SMC': 'SMCI', 'NYT': 'NYT', 'Roku': 'ROKU',
    'Amazon': 'AMZN', 'COPG': 'COPG.L', 'GS': 'GILD', 'TWLO': 'TWLO',
    'GE': 'GE', 'SCHW': 'SCHW', 'RDDT': 'RDDT',

    // Amazon (broker) stock
    'Amazon Shares': 'AMZN',

    // Fidelity funds (no Yahoo ticker)
    'Fidelity Index US Fund P-Acc': null,
    'Fidelity Index Europe ex UK Fund P-Accumulation': null,
    'Fidelity Funds - Global Technology': null,
    'MSCI Turkey': null,
    'Ishares Physical Silver ETC': null,
};

function parseCurrencyValue(str) {
    if (!str || str === '#REF!') return null;
    str = str.trim();
    // Detect currency
    let currency = 'GBP';
    if (str.startsWith('R$') || str.startsWith('-R$')) currency = 'BRL';
    else if (str.startsWith('$') || str.startsWith('-$')) currency = 'USD';
    else if (str.startsWith('£') || str.startsWith('-£')) currency = 'GBP';

    // Remove currency symbols and quotes
    let clean = str.replace(/[£$R\s"]/g, '');
    // Handle negative with hyphen
    const negative = clean.startsWith('-');
    clean = clean.replace(/^-/, '');
    // Remove commas (thousands separator)
    clean = clean.replace(/,/g, '');

    let val = parseFloat(clean);
    if (isNaN(val)) return null;
    if (negative) val = -val;

    return { value: val, currency };
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else if (ch !== '\r') {
            current += ch;
        }
    }
    result.push(current.trim());
    return result;
}

const transactions = [];
let id = 1;

for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 6) continue;

    const [dateStr, broker, asset, investmentStr, quantityStr, costPerShareStr, pnlStr, roiStr] = cols;

    // Parse date (DD/MM/YYYY -> YYYY-MM-DD)
    const dateParts = dateStr.split('/');
    const isoDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;

    // Normalize broker
    let normalizedBroker = broker;
    if (broker === '0') normalizedBroker = 'XP';

    // Parse investment
    const inv = parseCurrencyValue(investmentStr);
    if (!inv) {
        console.warn(`Skipping row ${i + 1}: invalid investment "${investmentStr}" for ${asset}`);
        continue;
    }

    // Parse quantity
    let qty = parseFloat(quantityStr.replace(/[",]/g, ''));
    if (isNaN(qty)) qty = 0;

    // Parse cost per share
    const cps = parseCurrencyValue(costPerShareStr);
    const costPerShare = cps ? cps.value : 0;

    // Currency comes from investment value
    const currency = inv.currency;

    // Determine currency based on broker if needed
    let brokerCurrency = currency;
    if (normalizedBroker === 'Trading 212') brokerCurrency = 'GBP';
    else if (normalizedBroker === 'XP') brokerCurrency = 'BRL';
    else if (normalizedBroker === 'Amazon') brokerCurrency = 'USD';
    else if (normalizedBroker === 'Green Gold Farms') brokerCurrency = 'USD';
    else if (normalizedBroker === 'Monzo') brokerCurrency = 'GBP';
    else if (normalizedBroker === 'Fidelity') brokerCurrency = 'GBP';

    // Parse P&L
    const pnlParsed = parseCurrencyValue(pnlStr);
    const pnl = pnlParsed ? pnlParsed.value : null;

    // Parse ROI%
    let roi = null;
    if (roiStr) {
        const roiClean = roiStr.replace('%', '').replace(',', '.').trim();
        roi = parseFloat(roiClean);
        if (isNaN(roi)) roi = null;
    }

    // Lookup ticker
    let ticker = null;
    if (TICKER_MAP.hasOwnProperty(asset)) {
        ticker = TICKER_MAP[asset];
    }

    const tr = {
        id: `eq-${String(id++).padStart(3, '0')}`,
        date: isoDate,
        asset: asset,
        ticker: ticker,
        investment: inv.value,
        quantity: qty,
        costPerShare: costPerShare,
        currency: brokerCurrency,
        broker: normalizedBroker,
        pnl: pnl,
        roiPercent: roi,
    };

    transactions.push(tr);
}

// Write output
const outPath = path.join(__dirname, '../src/data/equity_transactions.json');
fs.writeFileSync(outPath, JSON.stringify(transactions, null, 2));

console.log(`✓ Wrote ${transactions.length} transactions to equity_transactions.json`);
console.log(`  Brokers: ${[...new Set(transactions.map(t => t.broker))].join(', ')}`);
console.log(`  With ticker: ${transactions.filter(t => t.ticker).length}`);
console.log(`  Without ticker: ${transactions.filter(t => !t.ticker).length}`);
console.log(`  Assets: ${[...new Set(transactions.map(t => t.asset))].length} unique`);

// Show the ones without a ticker
const noTicker = [...new Set(transactions.filter(t => !t.ticker).map(t => t.asset))];
console.log(`  No-ticker assets: ${noTicker.join(', ')}`);
