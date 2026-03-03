const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { promisify } = require('util');

async function runMigration() {
    const dbPath = path.join(process.cwd(), 'data', 'finance.db');
    console.log(`Checking database at: ${dbPath}`);

    const db = new sqlite3.Database(dbPath);

    const dbRun = promisify(db.run.bind(db));
    const dbAll = promisify(db.all.bind(db));

    try {
        // 1. Create connections table
        await dbRun(`
            CREATE TABLE IF NOT EXISTS connections (
                id TEXT PRIMARY KEY,
                pluggy_item_id TEXT UNIQUE NOT NULL,
                institution_name TEXT NOT NULL,
                last_sync_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT NOT NULL,
                institution_logo_url TEXT
            );
        `);
        console.log('✅ Connections table ready.');

        // 2. Update assets table columns
        const assetColumns = await dbAll("PRAGMA table_info(assets)");

        const hasPluggyAssetId = assetColumns.some(c => c.name === 'pluggy_asset_id');
        const hasPluggyItemId = assetColumns.some(c => c.name === 'pluggy_item_id');
        const hasLastUpdated = assetColumns.some(c => c.name === 'last_updated');

        if (!hasPluggyAssetId) {
            await dbRun("ALTER TABLE assets ADD COLUMN pluggy_asset_id TEXT");
            await dbRun("CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_pluggy_id ON assets(pluggy_asset_id)");
            console.log('✅ Column pluggy_asset_id added to assets.');
        }

        if (!hasPluggyItemId) {
            await dbRun("ALTER TABLE assets ADD COLUMN pluggy_item_id TEXT");
            console.log('✅ Column pluggy_item_id added to assets.');
        }

        if (!hasLastUpdated) {
            await dbRun("ALTER TABLE assets ADD COLUMN last_updated DATETIME");
            console.log('✅ Column last_updated added to assets.');
        }

        // 3. Ensure institution_logo_url exists (if table already existed)
        const connColumns = await dbAll("PRAGMA table_info(connections)");
        if (!connColumns.some(c => c.name === 'institution_logo_url')) {
            await dbRun('ALTER TABLE connections ADD COLUMN institution_logo_url TEXT');
            console.log('✅ Added institution_logo_url to connections');
        }

        console.log('🚀 Migration completed successfully');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        db.close();
    }
}

runMigration();
