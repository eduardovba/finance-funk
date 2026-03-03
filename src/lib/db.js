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
    ];

    for (const sql of migrations) {
        try { await db.execute(sql); } catch (e) { /* already applied */ }
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
