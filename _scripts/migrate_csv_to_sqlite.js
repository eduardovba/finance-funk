const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { parse } = require('csv-parse/sync');

// Calculate absolute paths based on project root
// Script is in /scripts, so project root is ../
const projectRoot = path.join(__dirname, '..');
const dbPath = path.join(projectRoot, 'data', 'finance.db');
const schemaPath = path.join(projectRoot, 'src', 'db', 'schema.sql');
const equityCsvPath = path.join(projectRoot, 'data', 'Equity.csv');
const mappingConfigPath = path.join(projectRoot, 'data', 'mapping_config.json');

console.log('Project Root:', projectRoot);
console.log('DB Path:', dbPath);
console.log('Equity CSV Path:', equityCsvPath);

// Ensure DB Directory exists
if (!fs.existsSync(path.dirname(dbPath))) {
    console.log('Creating DB directory...');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
} else if (fs.existsSync(dbPath)) {
    console.log('Deleting existing DB to start fresh...');
    fs.unlinkSync(dbPath);
}

let db;
try {
    db = new Database(dbPath);
    console.log('Connected to SQLite DB.');
} catch (e) {
    console.error('Failed to connect to DB:', e);
    process.exit(1);
}

function initDb() {
    try {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema);
        console.log('DB Initialized with Schema.');
    } catch (e) {
        console.error('Failed to initialize DB schema:', e);
        process.exit(1);
    }
}

function parseEquityCsv() {
    if (!fs.existsSync(equityCsvPath)) {
        console.error('Equity.csv not found at:', equityCsvPath);
        process.exit(1);
    }

    console.log('Reading Equity.csv...');
    const fileContent = fs.readFileSync(equityCsvPath, 'utf8');

    // Parse using csv-parse
    // We start from line 5 (0-indexed -> 4, but csv-parse 'from_line' is 1-indexed so 5)
    // Relax column count because some rows might have more/less cols
    const records = parse(fileContent, {
        relax_column_count: true,
        skip_empty_lines: true,
        from_line: 5
    });

    console.log(`Parsed ${records.length} records.`);

    const potentialAssets = new Set();
    const ledgerEntries = [];
    const watchlistEntries = [];

    records.forEach((row, i) => {
        // Log first few rows for debugging
        if (i < 3) console.log(`Row ${i}:`, row);

        // Ledger Section (Cols 9-13: Date, Name, Inv, Qty, Cost) -> Indices 9, 10, 11, 12, 13
        // Note: csv-parse might skip empty leading columns if not configured? 
        // No, standard CSV parser keeps empty cols.
        // Let's verify indices.

        const date = row[9];
        const name = row[10];
        const inv = row[11];
        const qty = row[12];
        const cost = row[13];

        if (date && name && date.match(/\d{2}\/\d{2}\/\d{4}/)) {
            ledgerEntries.push({ date, name, inv, qty, cost });
            potentialAssets.add(name.trim());
        }

        // Watchlist Section (Cols 15-17: Alias, Name+Ticker, Price) -> Indices 15, 16, 17
        const wlAlias = row[15];
        const wlName = row[16];
        const wlPrice = row[17];

        if (wlAlias && wlName) {
            watchlistEntries.push({ alias: wlAlias, full_name: wlName, price: wlPrice });
            potentialAssets.add(wlAlias.trim());
        }
    });

    console.log(`Found ${ledgerEntries.length} ledger entries.`);
    console.log(`Found ${watchlistEntries.length} watchlist entries.`);
    console.log(`Found ${potentialAssets.size} unique potential assets.`);

    return { potentialAssets: Array.from(potentialAssets), ledgerEntries, watchlistEntries };
}

function generateMappingConfig(assets) {
    let mapping = {};
    if (fs.existsSync(mappingConfigPath)) {
        console.log('Reading existing mapping_config.json...');
        try {
            mapping = JSON.parse(fs.readFileSync(mappingConfigPath, 'utf8'));
        } catch (e) {
            console.error('Failed to parse existing mapping config, starting fresh.');
        }
    }

    let hasNew = false;
    assets.forEach(asset => {
        if (!mapping.hasOwnProperty(asset)) {
            // Try to guess ticker from brackets e.g. "Name (XNAS:AMZN)"
            const match = asset.match(/\((?:[A-Z]+:)?([A-Z0-9]+)\)/);

            mapping[asset] = match ? match[1] : null;

            // Common cleanups/overrides
            if (asset.includes('Amazon')) mapping[asset] = 'AMZN';
            if (asset.includes('Tesla')) mapping[asset] = 'TSLA';

            hasNew = true;
        }
    });

    if (hasNew) {
        fs.writeFileSync(mappingConfigPath, JSON.stringify(mapping, null, 2));
        console.log('Updated mapping_config.json with new assets.');
        // Don't return false, proceed to auto-fill check
    }

    // Check if any nulls remain
    const missing = Object.entries(mapping).filter(([k, v]) => v === null);
    if (missing.length > 0) {
        console.log(`There are ${missing.length} missing tickers in mapping_config.json. Auto-filling them to proceed.`);

        missing.forEach(([key, val]) => {
            // Heuristic: Strip "T212 - " or "XP - "
            let generatedTicker = key.replace(/^(T212|XP|Monzo)\s-\s/, '');

            // If it looks like a percentage (e.g. "14.3%"), skip or handle? 
            // The CSV parser might have picked up garbage rows.
            if (key.match(/^\d+(\.\d+)?%$/)) {
                // Garbage row, ignore
                delete mapping[key];
                return;
            }

            // Fallback: Use the Cleaned Name as Ticker
            mapping[key] = generatedTicker;
        });

        // Save back the auto-filled mapping
        fs.writeFileSync(mappingConfigPath, JSON.stringify(mapping, null, 2));
    }

    return mapping;
}

function migrate(ledger, watchlist, mapping) {
    console.log('Starting migration to SQLite...');

    const insertAsset = db.prepare(`
        INSERT OR IGNORE INTO assets (ticker, name, asset_class, allocation_bucket) 
        VALUES (?, ?, ?, ?)
    `);

    const insertAlias = db.prepare(`
        INSERT OR IGNORE INTO aliases (alias, ticker) VALUES (?, ?)
    `);

    const insertLedger = db.prepare(`
        INSERT INTO ledger (ticker, broker, date, transaction_type, quantity, price_per_share, currency, exchange_rate_at_transaction)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertWatchlist = db.prepare(`
        INSERT OR REPLACE INTO watchlist (ticker, live_price, last_updated) VALUES (?, ?, CURRENT_TIMESTAMP)
    `);

    db.transaction(() => {
        // 1. Insert Assets & Aliases
        const distinctTickers = new Set(Object.values(mapping));

        distinctTickers.forEach(ticker => {
            if (!ticker) return;
            // Default attributes
            insertAsset.run(ticker, ticker, 'Equity', 'Equity');
        });

        Object.entries(mapping).forEach(([alias, ticker]) => {
            if (ticker) {
                insertAlias.run(alias, ticker);
            }
        });

        // 2. Insert Ledger
        let ledgerCount = 0;
        ledger.forEach(row => {
            const ticker = mapping[row.name.trim()];
            if (!ticker) return;

            const [d, m, y] = row.date.split('/');
            const isoDate = `${y}-${m}-${d}`;

            const cleanQty = parseFloat(row.qty.replace(/,/g, ''));
            // Remove non-numeric except dot and minus? regex needs care.
            // Replace currency symbols and spaces.
            const cleanInv = parseFloat(row.inv.replace(/[£$R,\s]/g, ''));
            const cleanCost = parseFloat(row.cost.replace(/[£$R,\s]/g, ''));

            const type = cleanQty > 0 ? 'Buy' : 'Sell';
            const currency = row.inv.includes('$') ? 'USD' : row.inv.includes('R$') ? 'BRL' : 'GBP';

            let broker = 'Unknown';
            if (row.name.startsWith('T212')) broker = 'Trading 212';
            else if (row.name.startsWith('XP')) broker = 'XP';
            else if (row.name.startsWith('Monzo')) broker = 'Monzo';
            else if (row.name.includes('Amazon')) broker = 'Amazon'; // Assumption
            else if (row.name.includes('Green Gold')) broker = 'Green Gold Farms';

            insertLedger.run(ticker, broker, isoDate, type, Math.abs(cleanQty), Math.abs(cleanCost), currency, 1.0);
            ledgerCount++;
        });
        console.log(`Inserted ${ledgerCount} ledger rows.`);

        // 3. Insert Watchlist
        let wlCount = 0;
        watchlist.forEach(row => {
            let ticker = mapping[row.alias.trim()];

            if (!ticker) {
                const match = row.full_name.match(/\((?:[A-Z]+:)?([A-Z0-9]+)\)/);
                if (match) ticker = match[1];
            }

            if (ticker) {
                const price = parseFloat(row.price.replace(/[£$R,\s]/g, ''));
                if (!isNaN(price)) {
                    insertWatchlist.run(ticker, price);
                    wlCount++;
                }
            }
        });
        console.log(`Inserted ${wlCount} watchlist rows.`);

    })();
    console.log('Migration completed successfully.');
}

// MAIN EXECUTION
try {
    console.log('--- Migration Script Started ---');
    const { potentialAssets, ledgerEntries, watchlistEntries } = parseEquityCsv();
    const mapping = generateMappingConfig(potentialAssets);

    if (mapping) {
        initDb();
        migrate(ledgerEntries, watchlistEntries, mapping);
    } else {
        console.log('Migration halted pending user mapping configuration.');
    }
} catch (e) {
    console.error('Migration failed with error:', e);
}
