import { getDB } from './src/lib/db.js';

async function fix() {
    console.log('Fixing Fixed Income Divestments...');
    const db = await getDB();

    // Convert 'Divestment' to 'Withdrawal' in Fixed Income where it applies
    // Wait, the ledger type is stored in `ledger.type`. 
    // And there's a reference to `asset_id` so we can check if it's Fixed Income.

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
