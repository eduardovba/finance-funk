const { getDB } = require('./src/lib/db');

async function check() {
    try {
        const db = await getDB();
        const row = await db.get("SELECT content FROM snapshots LIMIT 1");
        if (row) {
            console.log(JSON.stringify(JSON.parse(row.content), null, 2));
        } else {
            console.log('No snapshots found');
        }
        process.exit(0);
    } catch (e) {
        console.error('Failed to check snapshots:', e);
        process.exit(1);
    }
}

check();
