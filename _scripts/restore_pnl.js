const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/finance.db');
const JSON_PATH = path.join(__dirname, '../src/data/equity_transactions.json');

(async () => {
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    try {
        console.log('🔧 Adding realized_pnl column...');
        try {
            await db.exec(`ALTER TABLE ledger ADD COLUMN realized_pnl REAL DEFAULT 0;`);
        } catch (e) {
            console.log('  - Column might already exist, skipping add.');
        }

        console.log('📥 Reading JSON source...');
        const jsonData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
        const pnlTransactions = jsonData.filter(t => t.pnl !== null && t.pnl !== undefined && t.pnl !== 0);
        console.log(`Found ${pnlTransactions.length} transactions with PnL.`);

        console.log('🔄 Patching Database...');
        let updated = 0;

        // Prepare check stmt
        // Match by Date, Asset Name, Quantity
        // Note: Ledger Quantity might be negative, JSON quantity might be negative or positive depending on fix.
        // My previous fix `fix_ledger_signs.js` set type='Sell' and amount > 0 for negative qty.
        // But the Quantity column itself in Ledger is still negative for Sells (as per standard ledger)?
        // Wait, `fix_ledger_signs` did: `UPDATE ledger SET amount = ABS(amount), type = 'Sell' WHERE quantity < 0`.
        // It did NOT change Quantity. So Quantity is still negative in DB for Sells.
        // In JSON, "Sell" usually has negative quantity.

        for (const tr of pnlTransactions) {
            // Find Asset ID
            const assetName = tr.asset;
            const ticker = tr.ticker;

            let assetRow = await db.get(`SELECT id FROM assets WHERE name = ?`, [assetName]);
            if (!assetRow && ticker) {
                assetRow = await db.get(`SELECT id FROM assets WHERE ticker = ?`, [ticker]);
            }

            if (!assetRow) {
                console.warn(`  ⚠️ Could not find asset: ${assetName} (${ticker})`);
                continue;
            }

            // Find Ledger Rows
            // Attempt strict match
            const row = await db.get(`
                SELECT id FROM ledger 
                WHERE asset_id = ? 
                AND date = ? 
                AND quantity = ?
            `, [assetRow.id, tr.date, tr.quantity]);

            if (row) {
                await db.run(`UPDATE ledger SET realized_pnl = ? WHERE id = ?`, [tr.pnl, row.id]);
                updated++;
            } else {
                console.warn(`  ⚠️ Could not match transaction: ${tr.date} ${assetName} Qty:${tr.quantity}`);
            }
        }

        console.log(`✅ Updated ${updated} records with PnL.`);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await db.close();
    }

})();
