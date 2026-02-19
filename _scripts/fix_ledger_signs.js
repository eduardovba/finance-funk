const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

(async () => {
    const db = await open({
        filename: path.join(__dirname, '../data/finance.db'),
        driver: sqlite3.Database
    });

    console.log('Checking for inconsistent transactions (Qty < 0 but Amount < 0)...');

    // Find count
    const badRows = await db.all("SELECT * FROM ledger WHERE quantity < 0 AND amount < 0");
    console.log(`Found ${badRows.length} inconsistent rows.`);

    if (badRows.length > 0) {
        console.log('Example before fix:', badRows[0]);

        // FIX: Flip amount to positive, set type to 'Sell'
        // But only for Equity? JSON mainly had this issue in Equity.
        // Let's do it for all, as quantity < 0 usually implies Divestment/Sell in this context.

        await db.run(`
            UPDATE ledger 
            SET amount = ABS(amount), type = 'Sell'
            WHERE quantity < 0 AND amount < 0
        `);

        console.log('✅ Fixed rows.');
    }

    await db.close();
})();
