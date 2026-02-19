const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/finance.db');
const DATA_DIR = path.join(__dirname, '../src/data');

const loadJS = (filename) => {
    try {
        const p = path.join(DATA_DIR, filename);
        if (!fs.existsSync(p)) return [];
        let content = fs.readFileSync(p, 'utf8');
        content = content.replace(/export\s+const\s+\w+\s+=\s+/, '').replace(/;\s*$/, '');
        return new Function('return ' + content)();
    } catch (e) {
        return [];
    }
};

(async () => {
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    try {
        console.log('🔧 Adding interest column...');
        try {
            await db.exec(`ALTER TABLE ledger ADD COLUMN interest REAL DEFAULT 0;`);
        } catch (e) {
            console.log('  - Column might already exist.');
        }

        console.log('📥 Reading Source...');
        const transactions = loadJS('fixedIncomeTransactions.js');
        console.log(`Found ${transactions.length} transactions.`);

        console.log('🔄 Patching Interest...');
        let updated = 0;

        for (const tr of transactions) {
            if (!tr.interest || tr.interest === 0) continue;

            // Match logic:
            // Asset Name = tr.account (+ normalization?)
            // Date = tr.date (DD/MM/YYYY -> YYYY-MM-DD)
            // Amount = -tr.investment

            const [d, m, y] = tr.date.split('/');
            const dateISO = `${y}-${m}-${d}`;

            // Asset name might be normalized in DB (e.g. "NuBank" vs "Nubank")
            // Try to find asset by name like...
            // Actually, best to match by Asset ID via Ledger.

            const row = await db.get(`
                SELECT l.id 
                FROM ledger l
                JOIN assets a ON l.asset_id = a.id
                WHERE l.date = ? 
                AND ABS(l.amount - ?) < 0.01
                AND a.asset_class = 'Fixed Income'
            `, [dateISO, -tr.investment]);

            if (row) {
                await db.run(`UPDATE ledger SET interest = ? WHERE id = ?`, [tr.interest, row.id]);
                updated++;
            } else {
                console.warn(`  ⚠️ No match for: ${tr.date} ${tr.account} Inv:${tr.investment} Int:${tr.interest}`);
            }
        }

        console.log(`✅ Restored interest for ${updated} records.`);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await db.close();
    }
})();
