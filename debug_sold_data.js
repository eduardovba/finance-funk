const { getDB } = require("./src/lib/db");
const path = require("path");

async function debug() {
    const sqlite3 = require("sqlite3");
    const { open } = require("sqlite");

    const db = await open({
        filename: path.join(process.cwd(), 'data', 'finance.db'),
        driver: sqlite3.Database
    });

    console.log("--- Real Estate Assets ---");
    const assets = await db.all("SELECT * FROM assets WHERE asset_class = 'Real Estate'");
    console.log(JSON.stringify(assets, null, 2));

    console.log("\n--- Ledger for Andyara 1 & Montes Claros ---");
    const ledger = await db.all(`
        SELECT l.*, a.name as asset_name 
        FROM ledger l 
        JOIN assets a ON l.asset_id = a.id 
        WHERE a.name IN ('Andyara 1', 'Rua Montes Claros', 'Rua Montes Claros 828 - Apto 402')
    `);
    console.log(JSON.stringify(ledger, null, 2));

    await db.close();
}

debug().catch(console.error);
