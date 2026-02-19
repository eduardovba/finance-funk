const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/finance.db');

async function query(db, sql, params = []) {
    return db.all(sql, params);
}

async function testRealEstate() {
    console.log('Opening DB...');
    const db = await open({ filename: DB_PATH, driver: sqlite3.Database });
    console.log('DB Opened.');

    try {
        // 1. Fetch Properties (Manual assets)
        const propertiesRows = await query(db, `
            SELECT a.name, a.currency, l.amount, l.price as currentValue
            FROM assets a
            JOIN ledger l ON l.asset_id = a.id
            WHERE a.asset_class = 'Real Estate' AND a.broker = 'Manual'
        `);
        console.log(`Fetched ${propertiesRows.length} properties.`);

        const properties = propertiesRows.map(r => ({
            id: r.name.toLowerCase().replace(/\s+/g, '-'),
            name: r.name,
            currentValue: r.currentValue || 0,
        }));

        // 2. Fetch Ink Court
        const inkCourtRows = await query(db, `
            SELECT l.date, l.notes as item, l.amount, l.type
            FROM ledger l
            JOIN assets a ON l.asset_id = a.id
            WHERE a.name = 'Ink Court'
        `);
        console.log(`Fetched ${inkCourtRows.length} Ink Court items.`);

        const inkCourtLedger = inkCourtRows.map(r => ({
            month: r.date.substring(0, 7),
            item: r.item,
            amount: Math.abs(r.amount),
        }));

        // 3. Funds
        const fundRows = await query(db, `
            SELECT 
                l.date, l.id,
                a.name as fund, a.ticker, a.currency,
                l.quantity, l.price, l.amount
            FROM ledger l
            JOIN assets a ON l.asset_id = a.id
            WHERE a.asset_class = 'Real Estate'
            AND a.ticker IS NOT NULL 
            AND a.ticker != 'INK'
        `);
        console.log(`Fetched ${fundRows.length} fund transactions.`);

        const fundTransactions = fundRows.map(r => ({
            id: r.id,
            fund: r.fund,
            ticker: r.ticker,
        }));

        // 4. Holdings
        const holdingsRows = await query(db, `
            SELECT name, ticker, currency 
            FROM assets 
            WHERE asset_class = 'Real Estate' AND ticker IS NOT NULL AND ticker != 'INK'
        `);
        console.log(`Fetched ${holdingsRows.length} holdings.`);

        const holdings = holdingsRows.map(r => ({
            ticker: r.ticker,
            name: r.name,
        }));

        console.log('API Logic Success!');
        console.log('Holdings:', holdings);

    } catch (e) {
        console.error('API Logic Failed:', e);
    } finally {
        await db.close();
    }
}

testRealEstate();
