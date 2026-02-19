
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const projectRoot = path.join(__dirname, '..');
const dbPath = path.join(projectRoot, 'data', 'finance.db');
const cryptoDataPath = path.join(projectRoot, 'src', 'data', 'crypto_transactions.json');

async function migrateCrypto() {
    console.log('--- Starting Crypto Migration ---');

    if (!fs.existsSync(cryptoDataPath)) {
        console.error('Crypto data file not found:', cryptoDataPath);
        return;
    }

    const rawData = fs.readFileSync(cryptoDataPath, 'utf8');
    const transactions = JSON.parse(rawData);
    console.log(`Found ${transactions.length} crypto transactions.`);

    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    console.log('Connected to DB.');

    try {
        await db.run('BEGIN TRANSACTION');

        const insertAsset = await db.prepare(`
            INSERT OR IGNORE INTO assets (ticker, name, asset_class, allocation_bucket) 
            VALUES (?, ?, ?, ?)
        `);

        const insertLedger = await db.prepare(`
            INSERT INTO ledger (ticker, broker, date, transaction_type, quantity, price_per_share, currency, exchange_rate_at_transaction, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        let count = 0;
        for (const tr of transactions) {
            // Mapping
            // ticker -> ticker
            // asset -> name
            // platform -> broker
            // type -> transaction_type

            // Ensure Asset exists
            // Ticker for crypto might just be the symbol e.g. "BTC"
            // Asset name e.g. "Bitcoin"
            await insertAsset.run(tr.ticker, tr.asset || tr.ticker, 'Crypto', 'Crypto');

            // Ledger
            // Investment is Total Cost. 
            // Price per share = Investment / Quantity (if Buy)
            // If Sell, Investment is Proceeds? Previous JSON had positive investment for Buy, negative for Sell.
            // DB expects positive Quantity and Price, and Type determines logic.
            // But verify `migrate_csv_to_sqlite` logic:
            // "Math.abs(cleanQty), Math.abs(cleanCost)"

            const qty = Math.abs(tr.quantity);
            const inv = Math.abs(tr.investment);
            const price = qty > 0 ? inv / qty : 0; // Derived price

            // Validation?
            if (!tr.date) continue;

            await insertLedger.run(
                tr.ticker,
                tr.platform || 'Crypto Wallet',
                tr.date,
                tr.type,
                qty,
                price,
                'USD', // Most crypto logs here seem to be USD based on the file content I saw?
                // Wait, the file snippet showed "investment": 0.2 ...
                // File snippet didn't explicitly say currency.
                // However, `portfolioUtils.js` `getCryptoSummary` says: 
                // "const valUSD = price * h.qty;" and "const valGBP = valUSD / rates.USD;" 
                // forcing consumption as USD.
                // So we assume USD.
                1.0,   // Exchange rate (placeholder)
                `Imported ID: ${tr.id}`
            );
            count++;
        }

        await db.run('COMMIT');
        console.log(`Successfully migrated ${count} crypto transactions.`);
    } catch (e) {
        console.error('Migration failed:', e);
        await db.run('ROLLBACK');
    } finally {
        await db.close();
    }
}

migrateCrypto();
