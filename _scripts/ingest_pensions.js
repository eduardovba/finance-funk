const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(process.cwd(), 'data', 'Pensions.csv');
const OUTPUT_PATH = path.join(process.cwd(), 'src', 'data', 'pension_transactions.json');

// Broker Mapping Heuristics
const BROKER_MAP = {
    'Fidelity': 'Fidelity',
    'Aviva': 'Fidelity', // Based on context, Aviva might be inside Fidelity or separate? "Aviva Pensions BlackRock..."
    'HL': 'Hargreaves Lansdown',
    'LG': 'Legal & General',
    'OAB': 'OAB',
    'BlackRock': 'Fidelity', // Assumption based on "BlackRock Consensus" appearing near Fidelity rows
    'Ishares': 'Fidelity', // Assumption
    'Microstrategy': 'Hargreaves Lansdown', // Assumption
    'HSBC': 'Fidelity',
    'PLC': 'Fidelity',
    'L&G': 'Legal & General',
    'Legal': 'Legal & General',
    'Hargreaves': 'Hargreaves Lansdown'
};

function parseLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function parseCurrency(str) {
    if (!str) return 0;
    // Remove " £", ",", " "
    const clean = str.replace(/[£, "]/g, '');
    return parseFloat(clean) || 0;
}

function determineBroker(assetName) {
    if (!assetName) return 'Unknown';
    if (assetName.includes('Fidelity')) return 'Fidelity';
    if (assetName.includes('HL') || assetName.includes('Hargreaves')) return 'Hargreaves Lansdown';
    if (assetName.includes('LG') || assetName.includes('L&G') || assetName.includes('Legal')) return 'Legal & General';
    if (assetName.includes('OAB')) return 'OAB';
    if (assetName.includes('Aviva')) return 'Fidelity'; // Assumption
    if (assetName.includes('BlackRock')) return 'Fidelity'; // Assumption
    if (assetName.includes('Ishares')) return 'Fidelity'; // Assumption
    if (assetName.includes('Microstrategy')) return 'Hargreaves Lansdown'; // Assumption
    if (assetName.includes('HSBC')) return 'Fidelity';
    if (assetName.includes('PLC')) return 'Fidelity';
    if (assetName.includes('MSCI Turkey')) return 'Hargreaves Lansdown'; // Guess

    return 'Other';
}

function run() {
    const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = fileContent.split('\n');

    // Ledger is columns H-M (indices 7-12)
    // H: Date (7)
    // I: Account (8)
    // J: Investment (9)
    // K: Interest (10)
    // L: Quantity (11)
    // M: P&L (12)

    const transactions = [];
    let idCounter = 1;

    // Start from row 6 (index 5)
    for (let i = 5; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const cols = parseLine(line);
        if (cols.length < 13) continue;

        const date = cols[7];
        const account = cols[8];
        const investmentStr = cols[9];
        // Interest col 10
        const quantityStr = cols[11];
        // P&L col 12

        if (!date || !account) continue;

        // Skip headers if any repeated
        if (date === 'Date') continue;

        const investment = parseCurrency(investmentStr);
        const quantity = parseCurrency(quantityStr);
        const broker = determineBroker(account);

        // Type inference
        // Positive investment = Buy? Negative = Sell?
        // Wait, normally Investment cost is positive.
        // Row 89: Investment "-3600". Quantity "-1159".
        // This is a Sell.
        // Row 6: Investment "6119". Quantity "865".
        // This is a Buy.

        const type = investment < 0 ? 'Sell' : 'Buy';

        transactions.push({
            id: `pen_${idCounter++}`,
            date: date,
            broker: broker,
            asset: account, // Using Account as Asset Name
            ticker: account, // Use Name as Ticker for now, consistent with EquityTab fallback
            type: type,
            price: quantity !== 0 ? Math.abs(investment / quantity) : 0, // Calculate price derived from inv/qty
            quantity: Math.abs(quantity),
            value: Math.abs(investment), // Store absolute value
            fee: 0, // No fee column in range?
            notes: ''
        });
    }

    // Write to JSON
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(transactions, null, 2));
    console.log(`Ingested ${transactions.length} transactions to ${OUTPUT_PATH}`);

    // Log unique brokers to verify
    const brokers = [...new Set(transactions.map(t => t.broker))];
    console.log('Brokers found:', brokers);

    // Log unique assets to verify
    const assets = [...new Set(transactions.map(t => t.asset))];
    console.log('Assets found:', assets);
}

run();
