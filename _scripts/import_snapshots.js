const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const DB_PATH = path.join(__dirname, '../data/finance.db');
const JSON_PATH = path.join(__dirname, '../legacy_csv_archive/historical_snapshots.json');

async function importSnapshots() {
    const db = await open({ filename: DB_PATH, driver: sqlite3.Database });

    try {
        const fileContent = fs.readFileSync(JSON_PATH, 'utf8');
        const snapshots = JSON.parse(fileContent);

        console.log(`Found ${snapshots.length} snapshots.`);

        const stmt = await db.prepare(`
            INSERT OR REPLACE INTO snapshots (month, content) VALUES (?, ?)
        `);

        let count = 0;
        for (const snap of snapshots) {
            // snap has "month": "2021-10"
            // We store the whole object as JSON text in 'content'
            await stmt.run(snap.month, JSON.stringify(snap));
            count++;
        }

        console.log(`Imported ${count} snapshots.`);
        await stmt.finalize();

    } catch (e) {
        console.error('Import failed:', e);
    } finally {
        await db.close();
    }
}

importSnapshots();
