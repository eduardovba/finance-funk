const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'data', 'Fixed Income.csv');
const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split('\n');

const transactions = [];

// Ledger starts from line 6 (index 5)
// Date is in column 7 (index 6 after splitting by comma)
// Account: index 7
// Investment: index 8
// Interest: index 9
// Shares: index 10
// PricePerShare: index 11

for (let i = 5; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue;

    // Simple CSV parser for quoted values
    const parts = [];
    let current = '';
    let inQuotes = false;
    for (let char of rawLine) {
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            parts.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    parts.push(current);

    const date = parts[7];
    const account = parts[8];
    const investmentRaw = parts[9];
    const interestRaw = parts[10];
    const shares = parts[11];
    const pricePerShare = parts[12];

    if (!date || !account) continue;

    const parseVal = (val) => {
        if (!val || val === 'R$0' || val === '£0.00' || val === '0.00' || val === '0' || val === '-') return 0;
        let cleaned = val.replace(/[R$£,]/g, '').replace('$', '').trim();
        // Handle negative like "-123.45" or "-R$123.45"
        if (cleaned.startsWith('-')) {
            return -parseFloat(cleaned.substring(1));
        }
        return parseFloat(cleaned);
    };

    const detectCurrency = (val) => {
        if (val.includes('£')) return 'GBP';
        if (val.includes('$')) return 'USD';
        return 'BRL';
    };

    transactions.push({
        date,
        account,
        investment: parseVal(investmentRaw),
        interest: parseVal(interestRaw),
        currency: detectCurrency(investmentRaw || interestRaw || 'R$'),
        shares: shares ? parseFloat(shares.replace(/,/g, '')) : 0,
        pricePerShare: parseVal(pricePerShare)
    });
}

const outputDir = path.join(__dirname, 'src', 'data');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}
const outputPath = path.join(outputDir, 'fixedIncomeTransactions.json');
fs.writeFileSync(outputPath, JSON.stringify(transactions, null, 2));
console.log(`Successfully wrote ${transactions.length} transactions to ${outputPath}`);
