const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// -- Configuration --
const DB_PATH = path.join(__dirname, '..', 'data', 'finance.db');
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const BACKUP_SCRIPT = path.join(__dirname, 'backup-db.js');

// -- Data Loading Helpers --
const loadJSON = (filename) => {
    const p = path.join(DATA_DIR, filename);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
    return [];
};

const loadJS = (filename) => {
    // Manually parse ES6 export const ... = [...] syntax
    try {
        const p = path.join(DATA_DIR, filename);
        if (!fs.existsSync(p)) return [];

        let content = fs.readFileSync(p, 'utf8');
        // Remove "export const fixedIncomeTransactions =" and trailing semicolon
        content = content.replace(/export\s+const\s+\w+\s+=\s+/, '').replace(/;\s*$/, '');

        // The file content is "technically" JS code (keys might not be quoted, etc), 
        // but looking at the file, keys are NOT quoted (date: '...', account: '...'). 
        // JSON.parse deals with quoted keys.
        // We can use `eval` (safe-ish here as it is our local trusted file) or proper parser.
        // Let's use Function to evaluate it safely.

        return new Function('return ' + content)();
    } catch (e) {
        console.warn(`Could not parse ${filename}. Error: ${e.message}`);
        return [];
    }
};

// -- Main Migration Function --
(async () => {
    console.log('🚀 Starting Universal SQLite Migration...');

    // 1. Safety Backup
    try {
        console.log('📦 Creating Pre-Migration Backup...');
        execSync(`node ${BACKUP_SCRIPT}`, { stdio: 'inherit' });
    } catch (e) {
        console.error('❌ Backup Failed! Aborting migration.');
        process.exit(1);
    }

    // 2. Open DB Connection
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    try {
        await db.exec('BEGIN TRANSACTION');

        // 3. Schema Initialization
        console.log('🏗️  Initializing Schema...');

        // Drop existing tables to ensure clean slate (we have backup)
        await db.exec(`
            DROP TABLE IF EXISTS ledger;
            DROP TABLE IF EXISTS market_data;
            DROP TABLE IF EXISTS exchange_rates;
            DROP TABLE IF EXISTS assets;
        `);

        // Create Tables
        await db.exec(`
            CREATE TABLE IF NOT EXISTS assets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticker TEXT,
                name TEXT NOT NULL,
                asset_class TEXT NOT NULL,
                currency TEXT DEFAULT 'GBP',
                broker TEXT,
                allocation_bucket TEXT,
                UNIQUE(ticker, broker)
            );

            CREATE TABLE IF NOT EXISTS ledger (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date DATE NOT NULL,
                type TEXT NOT NULL,
                asset_id INTEGER,
                quantity REAL DEFAULT 0,
                price REAL DEFAULT 0,
                amount REAL DEFAULT 0,
                currency TEXT DEFAULT 'GBP',
                exchange_rate REAL DEFAULT 1.0,
                notes TEXT,
                FOREIGN KEY(asset_id) REFERENCES assets(id)
            );

            CREATE TABLE IF NOT EXISTS market_data (
                ticker TEXT,
                date DATE,
                price REAL,
                currency TEXT,
                PRIMARY KEY (ticker, date)
            );

            CREATE TABLE IF NOT EXISTS exchange_rates (
                pair TEXT,
                date DATE,
                rate REAL,
                PRIMARY KEY (pair, date)
            );
        `);

        // 4. Load Data Sources
        console.log('📥 Loading Data Sources...');
        const equityTr = loadJSON('equity_transactions.json');
        const cryptoTr = loadJSON('crypto_transactions.json');
        const pensionTr = loadJSON('pension_transactions.json');
        const debtTr = loadJSON('debt_transactions.json');
        const realEstateData = loadJSON('realEstate.json');
        const fixedIncomeTr = loadJS('fixedIncomeTransactions.js'); // .js file
        const fxRates = loadJSON('fx_rates.json');
        const historicalSnapshots = loadJSON('historical_snapshots.json');
        const pensionMap = loadJSON('pension_fund_map.json');

        // 5. Populate Exchange Rates
        console.log('💱 Populating Exchange Rates...');
        const stmtRate = await db.prepare('INSERT OR REPLACE INTO exchange_rates (pair, date, rate) VALUES (?, ?, ?)');
        // fx_rates.json structure: { "2023-01": { "USD": 1.2, "BRL": 6.5 }, ... }
        for (const [month, rates] of Object.entries(fxRates)) {
            // Use 1st of month for monthly rates
            const date = `${month}-01`;
            if (rates.USD) await stmtRate.run('GBP/USD', date, rates.USD);
            if (rates.BRL) await stmtRate.run('GBP/BRL', date, rates.BRL);
        }
        await stmtRate.finalize();

        // Helper: Get Rate
        const getRate = async (target, date) => {
            if (target === 'GBP') return 1;
            const month = date.substring(0, 7);
            const row = await db.get(
                `SELECT rate FROM exchange_rates WHERE pair = ? AND date <= ? ORDER BY date DESC LIMIT 1`,
                [`GBP/${target}`, `${month}-01`] // Approximate
            );
            return row ? row.rate : 1;
        };

        // 6. Asset Cataloging & Map
        console.log('📚 Cataloging Assets...');
        const assetMap = new Map(); // Key: "Ticker|Broker" or "Name|Broker" -> ID

        const getOrInsertAsset = async (name, ticker, broker, assetClass, currency, bucket) => {
            const key = ticker ? `${ticker}|${broker}` : `${name}|${broker}`;
            if (assetMap.has(key)) return assetMap.get(key);

            const result = await db.run(
                `INSERT INTO assets (name, ticker, broker, asset_class, currency, allocation_bucket) VALUES (?, ?, ?, ?, ?, ?)`,
                [name, ticker || null, broker || 'Unknown', assetClass, currency, bucket || assetClass]
            );
            assetMap.set(key, result.lastID);
            return result.lastID;
        };

        const stmtLedger = await db.prepare(`
            INSERT INTO ledger (date, type, asset_id, quantity, price, amount, currency, exchange_rate, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        // 7. Process Equity
        console.log('📈 Processing Equity...');
        let equityTotal = 0;
        for (const tr of equityTr) {
            const assetId = await getOrInsertAsset(
                tr.asset || tr.ticker,
                tr.ticker,
                tr.broker,
                'Equity',
                tr.currency || 'GBP',
                'Equity'
            );

            // Investment is typically negative flow (Cost). 
            // Database stores "Amount" as Transaction Value. 
            // Buy: Amount = Cost (Positive or Negative? Ledger typically signed).
            // Let's stick to: Flow = Amount. Money leaving wallet = Negative.
            // If tr.investment is positive in JSON (Cost), we make it negative for Ledger.
            const amount = tr.type === 'Sell' ? tr.investment : -Math.abs(tr.investment);

            await stmtLedger.run(
                tr.date,
                tr.type || 'Buy',
                assetId,
                tr.quantity,
                tr.costPerShare || 0,
                amount,
                tr.currency,
                1.0, // Should fetch rate? For now 1.0 or logic above. 
                `Imported Equity`
            );
            equityTotal += Math.abs(tr.investment); // Just summing volume for verifying
        }

        // 8. Process Crypto
        console.log('₿ Processing Crypto...');
        for (const tr of cryptoTr) {
            const assetId = await getOrInsertAsset(
                tr.asset || tr.ticker,
                tr.ticker,
                tr.platform || 'Crypto Wallet',
                'Crypto',
                'USD',
                'Crypto'
            );
            const amount = tr.type === 'Sell' ? tr.investment : -Math.abs(tr.investment);
            await stmtLedger.run(
                tr.date,
                tr.type,
                assetId,
                tr.quantity,
                0, // Price derived
                amount,
                tr.currency || 'USD',
                1.0,
                `Imported Crypto`
            );
        }

        // 9. Process Pensions
        console.log('👴 Processing Pensions...');
        for (const tr of pensionTr) {
            // Map bucket
            const mapEntry = pensionMap.find(m => m.asset === tr.asset);
            const bucket = mapEntry ? (mapEntry.allocationClass === 'Fixed Income' ? 'FixedIncome' : mapEntry.allocationClass) : 'Equity'; // Default

            const assetId = await getOrInsertAsset(
                tr.asset,
                null,
                tr.broker,
                'Pension',
                'GBP',
                bucket
            );

            const amount = tr.type === 'Buy' ? -Math.abs(tr.value) : Math.abs(tr.value);

            await stmtLedger.run(
                tr.date,
                tr.type,
                assetId,
                parseFloat(tr.quantity) || 0,
                parseFloat(tr.price) || 0,
                amount,
                'GBP',
                1.0,
                `Imported Pension`
            );
        }

        // 10. Process Real Estate
        console.log('🏠 Processing Real Estate...');
        // A. Properties
        if (realEstateData.properties) {
            for (const prop of realEstateData.properties) {
                const assetId = await getOrInsertAsset(
                    prop.name,
                    null,
                    'Manual',
                    'Real Estate',
                    prop.currency,
                    'RealEstate'
                );

                // Initial Purchase (Valuation/Investment)
                // We don't have a date in properties array usually, assume old.
                // Or check if there's a ledger for it.
                // For properties, we usually just track Current Value vs Investment.
                // Let's insert a "Valuation" entry for Current Value.
                await stmtLedger.run(
                    '2026-01-01', // Dummy date
                    'Valuation',
                    assetId,
                    1,
                    prop.currentValue,
                    prop.currentValue,
                    prop.currency,
                    1.0,
                    'Manual Property Valuation'
                );
            }
        }
        // B. Ink Court (Specific)
        if (realEstateData.inkCourt && realEstateData.inkCourt.ledger) {
            const assetId = await getOrInsertAsset(
                'Ink Court',
                'INK',
                'Direct',
                'Real Estate',
                'GBP',
                'RealEstate'
            );

            for (const item of realEstateData.inkCourt.ledger) {
                // Convert 'Month-YY' to Date
                let date = '2020-01-01';
                if (item.month) {
                    const [mmm, yy] = item.month.split('-');
                    const months = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
                    date = `20${yy}-${months[mmm]}-01`;
                }

                const amount = -(item.cost || item.amount || item.principal || 0); // Outflow
                await stmtLedger.run(
                    date,
                    item.source || 'Expense',
                    assetId,
                    0,
                    0,
                    amount,
                    'GBP',
                    1.0,
                    item.item || item.category
                );
            }
        }

        // 11. Process Fixed Income
        console.log('💰 Processing Fixed Income...');
        for (const tr of fixedIncomeTr) {
            const assetId = await getOrInsertAsset(
                tr.name || tr.account,
                null,
                tr.account,
                'Fixed Income',
                tr.currency || 'GBP',
                'FixedIncome'
            );

            const amount = -(tr.investment); // JSON investment is usually positive for "Invested amount"
            await stmtLedger.run(
                tr.date,
                'Investment',
                assetId,
                0,
                0,
                amount,
                tr.currency,
                1.0,
                tr.notes
            );
        }

        // 12. Process Debt
        console.log('💳 Processing Debt...');
        for (const tr of debtTr) {
            const assetId = await getOrInsertAsset(
                tr.lender,
                null,
                'Lender',
                'Debt',
                'BRL',
                'Debt'
            );
            // Debt "Value" is liability.
            // We can treat it as Positive Liability or Negative Net Worth.
            // In Ledger, "Taking Loan" is Inflow (+). "Paying Debt" is Outflow (-).
            // The JSON seems to list "Outstanding Debt"?
            // "value_brl": 15000.
            // Treat as Initial Balance (Liability).
            await stmtLedger.run(
                tr.date || '2024-01-01',
                'Liability',
                assetId,
                0,
                0,
                tr.value_brl, // Positive Liability
                'BRL',
                1.0,
                tr.obs
            );
        }

        // 13. Historical Snapshots
        console.log('📜 Processing History...');
        // Insert into market_data with fake ticker 'NET_WORTH' for easy graphing?
        // Or specific 'Snapshot' table?
        // Blueprint said MarketData or Snapshot. Let's use MarketData for simplicity if flexible.
        const stmtHistory = await db.prepare('INSERT OR REPLACE INTO market_data (ticker, date, price, currency) VALUES (?, ?, ?, ?)');
        for (const s of historicalSnapshots) {
            // s.month (YYYY-MM), s.totalGBP, s.totalBRL
            const date = `${s.month}-01`;
            await stmtHistory.run('NET_WORTH_GBP', date, s.totalGBP, 'GBP');
            await stmtHistory.run('NET_WORTH_BRL', date, s.totalBRL || s.networthBRL, 'BRL');
        }
        await stmtHistory.finalize();

        await stmtLedger.finalize();

        await db.exec('COMMIT');

        // 14. Verification
        console.log('\n📊 Automatic Verification');
        console.log('-------------------------');
        const count = await db.get('SELECT count(*) as c FROM ledger');
        console.log(`Total Ledger Entries: ${count.c}`);

        const assetsCount = await db.get('SELECT count(*) as c FROM assets');
        console.log(`Total Assets: ${assetsCount.c}`);

        if (count.c < 10) throw new Error('Too few transactions migrated!');

        console.log('\n✅ MIGRATION SUCCESSFUL!');

    } catch (e) {
        console.error('\n❌ MIGRATION FAILED. Rolling back...', e);
        await db.exec('ROLLBACK');
        process.exit(1);
    } finally {
        await db.close();
    }
})();
