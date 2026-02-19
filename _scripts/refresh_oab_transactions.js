const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/pension_transactions.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Filter out old OAB transactions
const cleaned = data.filter(t => t.broker !== 'OAB');

// Add new OAB transaction
cleaned.push({
    "id": "pen_oab_manual_1",
    "date": "29/02/2024",
    "broker": "OAB",
    "asset": "OAB Prev Shares",
    "ticker": "OAB Prev Shares",
    "type": "Buy",
    "price": 6413.24,
    "quantity": 1,
    "value": 6413.24,
    "fee": 0,
    "notes": "Manual adjustment to match target: Cost 6413.24, Current 9559.95"
});

fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2));
console.log('Pension transactions updated successfully.');
