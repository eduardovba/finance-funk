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
        console.log('🧹 Clearing broken Fixed Income data...');
        // Delete ledger entries for Fixed Income assets
        // We can identify them by asset_class or note 'Restored Fixed Income' (for future)
        // But for now, we know they are the only ones in 'Fixed Income' class.

        await db.run(`
            DELETE FROM ledger 
            WHERE asset_id IN (SELECT id FROM assets WHERE asset_class = 'Fixed Income')
        `);

        // We can keep the Assets (Accounts), they are fine.

        console.log('📥 Reading Source...');
        const transactions = loadJS('fixedIncomeTransactions.js');

        console.log('🔄 Re-importing with fixes...');
        let count = 0;

        // Prepare Asset ID Map
        const assets = await db.all(`SELECT id, name FROM assets WHERE asset_class = 'Fixed Income'`);
        const assetMap = {};
        assets.forEach(a => assetMap[a.name] = a.id);

        // Helper to get asset id (handling name variations if any, though migration should have created them)
        const getAssetId = async (account) => {
            // Normalized name?
            // portfolioUtils.js had normalizeName().
            // logic: Nubank -> NuBank, etc.
            // We should match what's in DB.
            // The migration created assets using raw `tr.account` (and `tr.name`?? No, `tr.account` mostly).
            // Let's rely on DB map.
            // If missing, find case-insensitive or close match.
            if (assetMap[account]) return assetMap[account];

            // Try case insensitive
            const match = assets.find(a => a.name.toLowerCase() === account.toLowerCase());
            if (match) return match.id;

            // If really missing, create? (Shouldn't happen if migration ran, but safety)
            console.log(`Creating missing asset: ${account}`);
            const res = await db.run(`INSERT INTO assets (name, asset_class, currency) VALUES (?, 'Fixed Income', 'BRL')`, [account]);
            assetMap[account] = res.lastID;
            return res.lastID;
        };

        for (const tr of transactions) {
            const assetId = await getAssetId(tr.account || tr.name);

            // 1. Fix Date
            const [d, m, y] = tr.date.split('/');
            const dateISO = `${y}-${m}-${d}`;

            // 2. Insert Investment (Principal)
            // Fixed Income Value = Sum of Deposits. So Inflow is Positive.
            if (tr.investment && tr.investment !== 0) {
                await db.run(
                    `INSERT INTO ledger (date, type, asset_id, quantity, price, amount, currency, interest, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        dateISO,
                        tr.investment > 0 ? 'Deposit' : 'Withdrawal',
                        assetId,
                        0,
                        0,
                        tr.investment, // Positive for Deposit, Negative for Withdrawal
                        tr.currency || 'BRL',
                        0,
                        tr.notes || 'Imported Principal'
                    ]
                );
                count++;
            }

            // 3. Insert Interest
            if (tr.interest && tr.interest !== 0) {
                await db.run(
                    `INSERT INTO ledger (date, type, asset_id, quantity, price, amount, currency, interest, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        dateISO,
                        'Interest',
                        assetId,
                        0,
                        0,
                        tr.interest, // Positive Inflow
                        tr.currency || 'BRL',
                        tr.interest, // Store in interest column too for easier querying
                        'Imported Interest'
                    ]
                );
                count++;
            }
        }

        console.log(`✅ Re-imported ${count} ledger entries.`);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await db.close();
    }
})();
