const { getDB } = require('./src/lib/db');
const path = require('path');

async function check() {
    const sqlite3 = require('sqlite3');
    const { open } = require('sqlite');

    // Manual open since we can't easily import ES modules or use current setup in raw script
    const db = await open({
        filename: path.join(process.cwd(), 'data', 'finance.db'),
        driver: sqlite3.Database
    });

    try {
        const columns = await db.all("PRAGMA table_info(ledger)");
        console.log('Ledger Columns:');
        columns.forEach(c => console.log(`- ${c.name} (${c.type})`));

        const firstRow = await db.get("SELECT * FROM ledger LIMIT 1");
        console.log('\nFirst Row:', firstRow);

        const fiRows = await db.all(`
            SELECT l.* FROM ledger l 
            JOIN assets a ON l.asset_id = a.id 
            WHERE a.asset_class = 'Fixed Income' 
            LIMIT 5
        `);
        console.log('\nFixed Income Rows:', fiRows);

    } catch (e) {
        console.error(e);
    } finally {
        await db.close();
    }
}

check();
