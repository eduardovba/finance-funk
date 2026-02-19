const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../data/Pensions.csv');
const JSON_PATH = path.join(__dirname, '../src/data/pension_transactions.json');

function parseCurrency(str) {
    if (!str) return 0;
    // Remove " £", ",", and trim
    const clean = str.replace(/[£,\s"]/g, '');
    return parseFloat(clean) || 0;
}

function ingest() {
    console.log('Reading CSV from:', CSV_PATH);
    const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
    const lines = csvContent.split('\n');

    console.log('Reading JSON from:', JSON_PATH);
    let transactions = [];
    if (fs.existsSync(JSON_PATH)) {
        transactions = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
    }

    let count = 0;
    let added = 0;

    // Skip potential headers if any, but we scanning all lines for "OAB Prev"
    lines.forEach((line, index) => {
        // Simple regex split to handle quoted commas? 
        // Data format: ,,,,,,,Date, Account, Investment, ...
        // Split by comma. 
        // Note: The CSV structure is complex with side-by-side tables.
        // We are looking for the Ledger section starting at column 7 (0-based col 7 is 8th column, but let's count).
        // Line 5: ,Accounts...,,Date,Account,...
        // Col 0: empty
        // ...
        // Col 6: empty?
        // Col 7: Date 
        // Col 8: Account "OAB Prev"
        // Col 9: Investment " £5,140.41 "

        // Let's use a regex to properly split CSV lines respecting quotes
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, '').trim());

        // Check if we have enough columns and if Col 8 is "OAB Prev"
        if (cols.length > 8 && cols[8] === 'OAB Prev') {
            const date = cols[7]; // DD/MM/YYYY
            const amount = parseCurrency(cols[9]);

            if (date && amount) {
                // Check if already exists to avoid duplicates
                // Using a simple check on date + asset + value
                const exists = transactions.find(t =>
                    t.date === date &&
                    t.asset === 'OAB' &&
                    Math.abs(t.value - amount) < 0.01
                );

                if (!exists) {
                    const tr = {
                        id: `pen_oab_${Date.now()}_${count}`,
                        date: date,
                        broker: 'OAB',
                        asset: 'OAB', // User requested "OAB shares"
                        ticker: 'OAB',
                        type: 'Buy',
                        price: 1.0, // Unit price 1
                        quantity: amount, // Qty = Value (since price is 1)
                        value: amount,
                        fee: 0,
                        notes: 'Imported from Pensions.csv'
                    };
                    transactions.push(tr);
                    added++;
                }
                count++;
            }
        }
    });

    console.log(`Found ${count} OAB transactions.`);
    console.log(`Added ${added} new transactions.`);

    if (added > 0) {
        fs.writeFileSync(JSON_PATH, JSON.stringify(transactions, null, 2));
        console.log('Updated pension_transactions.json');
    } else {
        console.log('No new transactions to add.');
    }
}

ingest();
