const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function debug() {
    const db = await open({
        filename: path.join(__dirname, 'data', 'finance.db'),
        driver: sqlite3.Database
    });

    console.log("--- Assets with Debt class ---");
    const assets = await db.all("SELECT * FROM assets WHERE asset_class = 'Debt'");
    console.log(JSON.stringify(assets, null, 2));

    console.log("\n--- Ledger entries for Debt assets ---");
    const ledger = await db.all(`
        SELECT l.*, a.name as asset_name 
        FROM ledger l 
        JOIN assets a ON l.asset_id = a.id 
        WHERE a.asset_class = 'Debt'
    `);
    console.log(JSON.stringify(ledger, null, 2));

    await db.close();
}

debug().catch(console.error);
