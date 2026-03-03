const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'finance.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log('Starting DB Cleanup...');

    // 1. Reset all synced assets to PENDING so they show up in the Review modal
    db.run("UPDATE assets SET sync_status = 'PENDING' WHERE pluggy_asset_id IS NOT NULL", function (err) {
        if (err) console.error('Error updating assets:', err.message);
        else console.log(`Reset ${this.changes} assets to PENDING.`);
    });

    // 2. Remove redundant "Pluggy Sync" entries (Keep only the most recent one for each asset)
    const sql = `
        DELETE FROM ledger 
        WHERE notes = 'Pluggy Sync' 
        AND id NOT IN (
            SELECT MAX(id) 
            FROM ledger 
            WHERE notes = 'Pluggy Sync' 
            GROUP BY asset_id
        )
    `;

    db.run(sql, function (err) {
        if (err) console.error('Error cleaning ledger:', err.message);
        else console.log(`Removed ${this.changes} redundant ledger entries.`);
    });
});

db.close((err) => {
    if (err) console.error(err.message);
    console.log('Cleanup complete.');
});
