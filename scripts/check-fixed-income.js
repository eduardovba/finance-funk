const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function check() {
    const dbPath = path.join(__dirname, '..', 'data', 'finance.db');
    console.log(`Checking DB at ${dbPath}`);

    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    try {
        console.log('\n--- Assets (Fixed Income) ---');
        const assets = await db.all("SELECT * FROM assets WHERE asset_class = 'Fixed Income'");
        console.log(JSON.stringify(assets, null, 2));

        if (assets.length > 0) {
            const assetIds = assets.map(a => a.id);
            console.log(`\n--- Ledger Entries for Asset IDs: ${assetIds.join(', ')} ---`);
            const ledger = await db.all(`SELECT * FROM ledger WHERE asset_id IN (${assetIds.join(', ')}) LIMIT 10`);
            console.log(JSON.stringify(ledger, null, 2));

            const count = await db.get(`SELECT count(*) as c FROM ledger WHERE asset_id IN (${assetIds.join(', ')})`);
            console.log(`\nTotal Ledger Entries for Fixed Income: ${count.c}`);
        } else {
            console.log('No assets found with asset_class = "Fixed Income"');
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await db.close();
    }
}

check();
