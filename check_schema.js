const { getDB } = require('./src/lib/db');

async function check() {
    try {
        const db = await getDB();
        const properties = await db.all("PRAGMA table_info(properties)");
        const ledger = await db.all("PRAGMA table_info(ledger)");

        console.log('Properties table:');
        properties.forEach(c => console.log(`- ${c.name} (${c.type})`));

        console.log('\nLedger table:');
        ledger.forEach(c => console.log(`- ${c.name} (${c.type})`));

        process.exit(0);
    } catch (e) {
        console.error('Failed to check schema:', e);
        process.exit(1);
    }
}

check();
