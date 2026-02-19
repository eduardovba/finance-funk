const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

(async () => {
    const db = await open({
        filename: path.join(__dirname, '../data/finance.db'),
        driver: sqlite3.Database
    });

    // Check Amazon Shares
    // Need asset_id first
    const asset = await db.get("SELECT * FROM assets WHERE name LIKE '%Amazon%'");
    console.log('Asset:', asset);

    if (asset) {
        const rows = await db.all("SELECT * FROM ledger WHERE asset_id = ?", [asset.id]);
        console.log('Ledger Rows:', rows);
    }

    await db.close();
})();
