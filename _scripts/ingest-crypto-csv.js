const fs = require('fs');
const path = require('path');
const csvPath = path.join(__dirname, '../data/Crypto Ledger.csv');
const jsonPath = path.join(__dirname, '../src/data/crypto_transactions.json');

const rawData = fs.readFileSync(csvPath, 'utf8');
const lines = rawData.split('\n').filter(l => l.trim() !== '');

const headers = lines[0].split(',').map(h => h.trim());
console.log('Headers:', headers);

const transactions = [];

// Helper to parse currency strings like "$1,234.56"
function parseValue(str) {
    if (!str) return 0;
    const clean = str.replace(/[$,"]/g, '');
    return parseFloat(clean);
}

// Map Ticker to Name (Basic mapping, can be expanded)
const COIN_NAMES = {
    'BTC': 'Bitcoin',
    'ETH': 'Ethereum',
    'SOL': 'Solana',
    'ADA': 'Cardano',
    'DOT': 'Polkadot',
    'DOGE': 'Dogecoin',
    'SHIB': 'Shiba Inu',
    'MATIC': 'Polygon',
    'AVAX': 'Avalanche',
    'LUNA': 'Terra Classic', // or Terra
    'USDT': 'Tether',
    'XRP': 'XRP',
    'BNB': 'Binance Coin',
    'LINK': 'Chainlink',
    'FTM': 'Fantom',
    'ATOM': 'Cosmos',
    'MANA': 'Decentraland',
    'SAND': 'The Sandbox',
    'HNT': 'Helium',
    'RUNE': 'THORChain'
};

let validCount = 0;

for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // CSV parsing is tricky with quoted fields containing commas.
    // Simple split by ',' won't work for "$1,234.56".
    // Regex to split by comma ignoring quotes
    const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);

    if (!parts || parts.length < 5) continue;

    // Remove quotes from parts if present
    const cleanParts = parts.map(p => p.replace(/^"|"$/g, ''));

    // Date,Crypto,Transaction,Quantity,Value,Cost/Coin,P&L
    const dateStr = cleanParts[0]; // 14/07/2021
    const ticker = cleanParts[1];
    const type = cleanParts[2]; // Buy/Sell
    const qtyStr = cleanParts[3];
    const valueStr = cleanParts[4];
    const pnlStr = cleanParts[6];

    // Parse Date DD/MM/YYYY -> YYYY-MM-DD
    const [day, month, year] = dateStr.split('/');
    const isoDate = `${year}-${month}-${day}`;

    let qty = parseValue(qtyStr);
    let value = parseValue(valueStr);
    const pnl = parseValue(pnlStr);

    // Logic:
    // Buy: +Qty, +Investment (Cost)
    // Sell: -Qty, -Investment (Proceeds)

    let investment = value;
    if (type === 'Sell') {
        qty = -Math.abs(qty);
        investment = -Math.abs(value);
    }

    const tr = {
        id: `crypto-${String(i).padStart(3, '0')}`,
        date: isoDate,
        ticker: ticker,
        asset: COIN_NAMES[ticker] || ticker, // Use full name if known
        type: type,
        quantity: qty,
        investment: investment,
        platform: 'Crypto Wallet', // Generic platform
        pnl: pnl || 0
    };

    transactions.push(tr);
    validCount++;
}

fs.writeFileSync(jsonPath, JSON.stringify(transactions, null, 2));
console.log(`Ingested ${validCount} crypto transactions.`);
