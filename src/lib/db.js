import { createClient } from '@libsql/client';
import path from 'path';

// Singleton client to prevent multiple connections in dev/hot-reload
let client = null;
let migrationsRun = false;

function getClient() {
    if (client) return client;

    // Use Turso remote in production, local file in development
    if (process.env.TURSO_DATABASE_URL) {
        client = createClient({
            url: process.env.TURSO_DATABASE_URL,
            authToken: process.env.TURSO_AUTH_TOKEN,
        });
    } else {
        const dbPath = path.join(process.cwd(), 'data', 'finance.db');
        client = createClient({
            url: `file:${dbPath}`,
        });
    }

    return client;
}

async function runMigrations() {
    if (migrationsRun) return;
    migrationsRun = true;

    const db = getClient();

    const migrations = [
        'ALTER TABLE ledger ADD COLUMN is_salary_contribution BOOLEAN DEFAULT 0',
        'ALTER TABLE ledger ADD COLUMN realized_roi_percent REAL',
        'ALTER TABLE monthly_ledger ADD COLUMN extraordinary_income REAL DEFAULT 0',
        `CREATE TABLE IF NOT EXISTS connections (
            id TEXT PRIMARY KEY,
            pluggy_item_id TEXT UNIQUE NOT NULL,
            institution_name TEXT NOT NULL,
            last_sync_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT NOT NULL,
            institution_logo_url TEXT
        )`,
        'ALTER TABLE assets ADD COLUMN pluggy_asset_id TEXT',
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_pluggy_id ON assets(pluggy_asset_id)',
        'ALTER TABLE assets ADD COLUMN pluggy_item_id TEXT',
        'ALTER TABLE assets ADD COLUMN last_updated DATETIME',
        "ALTER TABLE assets ADD COLUMN sync_status TEXT DEFAULT 'ACTIVE'",
        'ALTER TABLE connections ADD COLUMN institution_logo_url TEXT',
        `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            provider TEXT DEFAULT 'credentials',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS kv_store (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS brokers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            currency TEXT DEFAULT 'USD',
            user_id INTEGER REFERENCES users(id),
            asset_class TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(name, user_id)
        )`,
        // ── User profile avatar ──
        'ALTER TABLE users ADD COLUMN avatar_url TEXT',
        // ── Per-account data separation migrations ──
        'ALTER TABLE assets ADD COLUMN user_id INTEGER REFERENCES users(id)',
        'ALTER TABLE ledger ADD COLUMN user_id INTEGER REFERENCES users(id)',
        'ALTER TABLE connections ADD COLUMN user_id INTEGER REFERENCES users(id)',
        'ALTER TABLE brokers ADD COLUMN asset_class TEXT',
        // ── Asset logo cache ──
        `CREATE TABLE IF NOT EXISTS asset_logos (
            ticker TEXT PRIMARY KEY,
            logo_url TEXT NOT NULL,
            source TEXT,
            fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
    ];

    for (const sql of migrations) {
        try { await db.execute(sql); } catch (e) { /* already applied */ }
    }

    // ── Monthly_ledger & snapshots: recreate with composite UNIQUE(month, user_id) ──
    try {
        const hasUserIdCol = await db.execute(
            `SELECT COUNT(*) as cnt FROM pragma_table_info('monthly_ledger') WHERE name = 'user_id'`
        );
        if (Number(hasUserIdCol.rows[0].cnt) === 0) {
            console.log('Migrating monthly_ledger to add user_id...');
            await db.execute(`CREATE TABLE IF NOT EXISTS monthly_ledger_new (
                month TEXT,
                salary_savings REAL DEFAULT 0,
                fixed_income REAL DEFAULT 0,
                equity REAL DEFAULT 0,
                real_estate REAL DEFAULT 0,
                crypto REAL DEFAULT 0,
                debt REAL DEFAULT 0,
                pension REAL DEFAULT 0,
                total_income REAL DEFAULT 0,
                total_investments REAL DEFAULT 0,
                fixed_income_income REAL DEFAULT 0,
                equity_income REAL DEFAULT 0,
                real_estate_income REAL DEFAULT 0,
                extraordinary_income REAL DEFAULT 0,
                user_id INTEGER REFERENCES users(id),
                UNIQUE(month, user_id)
            )`);
            await db.execute(`INSERT OR IGNORE INTO monthly_ledger_new 
                (month, salary_savings, fixed_income, equity, real_estate, crypto, debt, pension, total_income, total_investments, fixed_income_income, equity_income, real_estate_income, extraordinary_income)
                SELECT month, salary_savings, fixed_income, equity, real_estate, crypto, debt, pension, total_income, total_investments, 
                    COALESCE(fixed_income_income, 0), COALESCE(equity_income, 0), COALESCE(real_estate_income, 0), COALESCE(extraordinary_income, 0) 
                FROM monthly_ledger`);
            await db.execute(`DROP TABLE monthly_ledger`);
            await db.execute(`ALTER TABLE monthly_ledger_new RENAME TO monthly_ledger`);
            console.log('monthly_ledger migration complete.');
        }
    } catch (e) {
        console.error('monthly_ledger migration failed:', e);
    }

    try {
        const hasUserIdCol = await db.execute(
            `SELECT COUNT(*) as cnt FROM pragma_table_info('snapshots') WHERE name = 'user_id'`
        );
        if (Number(hasUserIdCol.rows[0].cnt) === 0) {
            console.log('Migrating snapshots to add user_id...');
            await db.execute(`CREATE TABLE IF NOT EXISTS snapshots_new (
                month TEXT,
                content TEXT,
                user_id INTEGER REFERENCES users(id),
                UNIQUE(month, user_id)
            )`);
            // snapshots table may not exist yet
            try {
                await db.execute(`INSERT OR IGNORE INTO snapshots_new (month, content)
                    SELECT month, content FROM snapshots`);
                await db.execute(`DROP TABLE snapshots`);
            } catch (e) { /* snapshots table didn't exist yet, that's fine */ }
            await db.execute(`ALTER TABLE snapshots_new RENAME TO snapshots`);
            console.log('snapshots migration complete.');
        }
    } catch (e) {
        console.error('snapshots migration failed:', e);
    }

    // ── One-time data migration: assign all existing data to duduviana@gmail.com ──
    try {
        const duduviana = await db.execute({
            sql: "SELECT id FROM users WHERE email = 'duduviana@gmail.com'",
            args: [],
        });
        if (duduviana.rows.length > 0) {
            const uid = duduviana.rows[0].id;
            // Disable FK checks to avoid watchlist->assets FK mismatch
            try { await db.execute('PRAGMA foreign_keys = OFF'); } catch (e) { /* Turso may not support */ }
            const tables = ['assets', 'ledger', 'monthly_ledger', 'connections', 'snapshots'];
            for (const table of tables) {
                const result = await db.execute({
                    sql: `UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`,
                    args: [uid],
                });
                if (result.rowsAffected > 0) {
                    console.log(`Assigned ${result.rowsAffected} rows in ${table} to user ${uid} (duduviana@gmail.com)`);
                }
            }
            try { await db.execute('PRAGMA foreign_keys = ON'); } catch (e) { /* Turso may not support */ }
        }
    } catch (e) {
        console.error('Data ownership migration failed:', e);
    }

    // ONE-TIME REPAIR: Fixing the "Billionaire" bug and missing review button
    try {
        await db.execute(`
            UPDATE assets SET sync_status = 'PENDING' 
            WHERE pluggy_asset_id IS NOT NULL AND sync_status = 'ACTIVE'
        `);
        await db.execute(`
            DELETE FROM ledger 
            WHERE notes = 'Pluggy Sync' 
            AND id NOT IN (
                SELECT MAX(id) 
                FROM ledger 
                WHERE notes = 'Pluggy Sync' 
                GROUP BY asset_id
            )
        `);
        console.log('Database repair: deduplicated Pluggy Sync entries and reset status.');
    } catch (e) {
        console.error('Repair failed:', e);
    }

    // ONE-TIME MIGRATION: Create sold properties and Ink Court config that were previously hardcoded
    try {
        // Get user ID for duduviana
        const duduRes = await db.execute("SELECT id FROM users WHERE email = 'duduviana@gmail.com'");
        if (duduRes.rows.length > 0) {
            const uid = duduRes.rows[0].id;

            // Helper to check if asset exists
            const assetExists = async (name) => {
                const r = await db.execute({ sql: "SELECT id FROM assets WHERE name = ? AND user_id = ?", args: [name, uid] });
                return r.rows.length > 0 ? r.rows[0].id : null;
            };

            // --- Andyara 1 (Sold) ---
            let a1Id = await assetExists('Andyara 1');
            if (!a1Id) {
                await db.execute({ sql: "INSERT INTO assets (name, asset_class, broker, currency, sync_status, user_id) VALUES (?, 'Real Estate', 'Manual', 'BRL', 'ACTIVE', ?)", args: ['Andyara 1', uid] });
                const a1 = await db.execute({ sql: "SELECT id FROM assets WHERE name = 'Andyara 1' AND user_id = ?", args: [uid] });
                a1Id = a1.rows[0].id;
                // Purchase, Tax, Sale entries
                await db.execute({ sql: "INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: ['2015-01-01', 'Purchase', a1Id, 237000, 237000, 'BRL', 'Initial investment', uid] });
                await db.execute({ sql: "INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: ['2023-01-01', 'Stamp Duty', a1Id, -9074, 0, 'BRL', 'Stamp Duty', uid] });
                await db.execute({ sql: "INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: ['2023-06-01', 'Sale', a1Id, -360000, 360000, 'BRL', 'Property sold', uid] });
                console.log('Migration: Created Andyara 1 (sold property) with ledger entries.');
            }

            // --- Rua Montes Claros (Sold) ---
            let mcId = await assetExists('Rua Montes Claros');
            if (!mcId) {
                await db.execute({ sql: "INSERT INTO assets (name, asset_class, broker, currency, sync_status, user_id) VALUES (?, 'Real Estate', 'Manual', 'BRL', 'ACTIVE', ?)", args: ['Rua Montes Claros', uid] });
                const mc = await db.execute({ sql: "SELECT id FROM assets WHERE name = 'Rua Montes Claros' AND user_id = ?", args: [uid] });
                mcId = mc.rows[0].id;
                await db.execute({ sql: "INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: ['2018-01-01', 'Purchase', mcId, 681000, 681000, 'BRL', 'Initial investment', uid] });
                await db.execute({ sql: "INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: ['2024-01-01', 'Stamp Duty', mcId, -29748, 0, 'BRL', 'Stamp Duty', uid] });
                await db.execute({ sql: "INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: ['2024-06-01', 'Sale', mcId, -822920, 822920, 'BRL', 'Property sold', uid] });
                console.log('Migration: Created Rua Montes Claros (sold property) with ledger entries.');
            }

            // --- Ink Court: Ensure it has a Mortgage Setup config and a current valuation ---
            const inkId = await assetExists('Ink Court');
            if (inkId) {
                // Check if Mortgage Setup already exists
                const setupExists = await db.execute({ sql: "SELECT id FROM ledger WHERE asset_id = ? AND type = 'Mortgage Setup' AND user_id = ?", args: [inkId, uid] });
                if (setupExists.rows.length === 0) {
                    const config = JSON.stringify({ originalAmount: 541000, deposit: 60000, durationMonths: 408, interestRate: 6.24 });
                    await db.execute({ sql: "INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: ['2024-03-01', 'Mortgage Setup', inkId, 0, 0, 'GBP', config, uid] });
                    console.log('Migration: Created Ink Court mortgage setup config.');
                }
                // Check if it has a valuation entry (price > 0)
                const hasValuation = await db.execute({ sql: "SELECT id FROM ledger WHERE asset_id = ? AND price > 0 AND user_id = ?", args: [inkId, uid] });
                if (hasValuation.rows.length === 0) {
                    await db.execute({ sql: "INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: ['2026-02-19', 'Valuation Update', inkId, 0, 620000, 'GBP', 'Initial valuation', uid] });
                    console.log('Migration: Created Ink Court initial valuation (£620,000).');
                }
            }
        }
    } catch (e) {
        console.error('Sold properties migration failed:', e);
    }
}

/**
 * Get the database client. Runs migrations on first call.
 * Returns the @libsql/client instance.
 */
export async function getDB() {
    const db = getClient();
    await runMigrations();
    return db;
}

/**
 * Execute a SELECT query. Returns array of row objects.
 * Compatible with the previous sqlite `db.all()` return shape.
 */
export async function query(sql, params = []) {
    const db = getClient();
    await runMigrations();
    const result = await db.execute({ sql, args: params });
    return result.rows;
}

/**
 * Execute a SELECT query and return the first row, or undefined.
 * Compatible with the previous sqlite `db.get()` return shape.
 */
export async function get(sql, params = []) {
    const db = getClient();
    await runMigrations();
    const result = await db.execute({ sql, args: params });
    return result.rows[0] || undefined;
}

/**
 * Execute an INSERT/UPDATE/DELETE statement.
 * Returns { lastID, changes } for compatibility with the previous sqlite wrapper.
 */
export async function run(sql, params = []) {
    const db = getClient();
    await runMigrations();
    const result = await db.execute({ sql, args: params });
    return {
        lastID: Number(result.lastInsertRowid ?? 0),
        changes: result.rowsAffected,
        // Also expose the raw result for consumers that need it
        lastInsertRowid: result.lastInsertRowid,
        rowsAffected: result.rowsAffected,
    };
}
