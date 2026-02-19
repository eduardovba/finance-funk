const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../data/finance.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("Checking for Equity transactions in DB...");

    // Check if tables exist
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) {
            console.error("Error listing tables:", err);
            return;
        }
        console.log("Tables:", tables.map(t => t.name));

        if (tables.some(t => t.name === 'ledger')) {
            // Query for Equity-like transactions
            // We don't have an 'asset_class' column in ledger, but we might filter by type or join with assets table if it exists
            // Let's just dump first 5 rows to see structure
            db.all("SELECT * FROM ledger LIMIT 5", (err, rows) => {
                if (err) console.error("Error querying ledger:", err);
                else {
                    console.log("Sample Ledger Rows:", rows);

                    // Try to find Equity specific data
                    // Assuming 'asset_class' in 'assets' table?
                    db.all("SELECT * FROM assets WHERE asset_class = 'Equity' OR allocation_bucket = 'Equity'", (err, assets) => {
                        if (err) console.log("Error querying assets (or table missing):", err.message);
                        else console.log("Found Equity Assets:", assets.length, assets.slice(0, 3));
                    });

                    // Count ledger entries associated with Equity assets
                    const query = `
                        SELECT count(*) as count 
                        FROM ledger l
                        JOIN assets a ON l.ticker = a.ticker
                        WHERE a.asset_class = 'Equity' OR a.allocation_bucket = 'Equity'
                     `;
                    db.get(query, (err, row) => {
                        if (err) console.log("Error counting equity ledger:", err.message);
                        else console.log("Equity Ledger Count:", row ? row.count : 0);
                    });
                }
            });
        }
    });
});

db.close();
