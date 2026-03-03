const { getDB } = require('./src/lib/db');

async function check() {
    try {
        const db = await getDB();
        const columns = await db.all("PRAGMA table_info(assets)");
        console.log('Columns in assets table:');
        columns.forEach(c => console.log(`- ${c.name} (${c.type})`));
        process.exit(0);
    } catch (e) {
        console.error('Failed to check schema:', e);
        process.exit(1);
    }
}

check();
