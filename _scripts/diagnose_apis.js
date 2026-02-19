const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

// Mock db.js manually since we can't import ES modules easily in loose script without package.json "type": "module" change
// or passing flags. Simulating the logic is enough.

const DB_PATH = path.join(__dirname, '../data/finance.db');

async function query(sql, params = []) {
    const db = await open({ filename: DB_PATH, driver: sqlite3.Database });
    const result = await db.all(sql, params);
    await db.close();
    return result;
}

async function checkFixedIncome() {
    console.log('Checking Fixed Income Query...');
    try {
        const sql = `
            SELECT 
                l.id, l.date, l.type, 
                a.name as account, a.currency,
                l.amount, l.notes
            FROM ledger l
            JOIN assets a ON l.asset_id = a.id
            WHERE a.asset_class = 'Fixed Income'
            ORDER BY l.date DESC
            LIMIT 5
        `;
        const rows = await query(sql);
        console.log(`Fixed Income Rows: ${rows.length}`);
        if (rows.length > 0) console.log(rows[0]);
    } catch (e) {
        console.error('Fixed Income Query Failed:', e);
    }
}

async function checkLedgerData() {
    console.log('\nChecking Ledger Data Query...');
    try {
        const rows = await query('SELECT * FROM monthly_ledger ORDER BY month ASC LIMIT 5');
        console.log(`Monthly Ledger Rows: ${rows.length}`);
        if (rows.length > 0) console.log(rows[0]);
    } catch (e) {
        console.error('Monthly Ledger Query Failed:', e);
    }
}

async function checkHistory() {
    console.log('\nChecking History Query...');
    try {
        const rows = await query(`
            SELECT date, price as value
            FROM market_data
            WHERE ticker = 'NET_WORTH_BRL'
            ORDER BY date ASC
            LIMIT 5
        `);
        console.log(`History Rows: ${rows.length}`);
        if (rows.length > 0) console.log(rows[0]);
    } catch (e) {
        console.error('History Query Failed:', e);
    }
}

async function run() {
    await checkFixedIncome();
    await checkLedgerData();
    await checkHistory();
}

run();
