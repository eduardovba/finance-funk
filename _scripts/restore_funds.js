const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/finance.db');
const JSON_PATH = path.join(__dirname, '../src/data/realEstate.json');

(async () => {
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    try {
        const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
        if (!data.funds || !data.funds.transactions) {
            console.log('No funds data found.');
            return;
        }

        console.log('🏗️  Restoring Real Estate Funds...');

        // Ensure bucket exists? 'RealEstate' or 'Funds'? 
        // System Blueprint says 'Real Estate' asset class.

        // 1. Transactions
        for (const tr of data.funds.transactions) {
            // tr: { date, fund: "FII - HGLG11", quantity, price, investment, currency }
            // Clean Name/Ticker
            let name = tr.fund;
            let ticker = null;
            if (name.includes(' - ')) {
                const parts = name.split(' - ');
                ticker = parts[1];
            }

            // Get/Create Asset
            let assetId;
            const existing = await db.get(`SELECT id FROM assets WHERE name = ? AND asset_class = 'Real Estate'`, [name]);
            if (existing) {
                assetId = existing.id;
            } else {
                const res = await db.run(
                    `INSERT INTO assets (name, ticker, broker, asset_class, currency, allocation_bucket) VALUES (?, ?, ?, ?, ?, ?)`,
                    [name, ticker, 'XP', 'Real Estate', tr.currency || 'BRL', 'RealEstate']
                );
                assetId = res.lastID;
            }

            // Insert Ledger
            // Check existence
            const [d, m, y] = tr.date.split('/');
            const dateISO = `${y}-${m}-${d}`;

            const exists = await db.get(`SELECT id FROM ledger WHERE asset_id = ? AND date = ? AND amount = ?`, [assetId, dateISO, -tr.investment]);

            if (!exists) {
                await db.run(
                    `INSERT INTO ledger (date, type, asset_id, quantity, price, amount, currency, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        dateISO,
                        'Investment', // Or Buy?
                        assetId,
                        tr.quantity,
                        tr.price || 0,
                        -tr.investment, // Outflow
                        tr.currency || 'BRL',
                        'Restored Fund'
                    ]
                );
            }
        }

        console.log('✅ Funds Restored.');

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await db.close();
    }
})();
