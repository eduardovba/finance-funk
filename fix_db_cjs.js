const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function fix() {
    const dbPath = path.join(__dirname, 'data', 'finance.db');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    const rows = await db.all(`
        SELECT l.id, l.type, l.amount 
        FROM ledger l 
        JOIN assets a ON l.asset_id = a.id 
        WHERE a.asset_class = 'Fixed Income' 
        AND l.type IN ('Divestment', 'Withdrawal')
    `);

    console.log(`Found ${rows.length} withdrawal records.`);

    for (const r of rows) {
        let amount = r.amount;
        if (amount > 0) {
            amount = -Math.abs(amount);
            console.log(`Fixing id ${r.id}: ${r.amount} -> ${amount}`);
        }

        await db.run(
            `UPDATE ledger SET type = 'Withdrawal', amount = ? WHERE id = ?`,
            [amount, r.id]
        );
    }
    console.log('Done fixing.');
}

fix().catch(console.error);
