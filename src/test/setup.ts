import { createClient, type Client } from '@libsql/client';

/**
 * Creates an in-memory SQLite database for tests.
 * Returns the raw @libsql/client instance.
 */
export function createTestDB(): Client {
    return createClient({ url: ':memory:' });
}

/**
 * SQL to create core tables needed for integration tests.
 */
export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    provider TEXT DEFAULT 'credentials',
    avatar_url TEXT,
    is_admin BOOLEAN DEFAULT 0,
    deleted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    ticker TEXT,
    broker TEXT,
    asset_class TEXT,
    currency TEXT DEFAULT 'USD',
    allocation_bucket TEXT,
    sync_status TEXT DEFAULT 'ACTIVE',
    pluggy_asset_id TEXT,
    pluggy_item_id TEXT,
    last_updated DATETIME,
    user_id INTEGER REFERENCES users(id),
    UNIQUE(ticker, broker, user_id)
);

CREATE TABLE IF NOT EXISTS ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    type TEXT,
    asset_id INTEGER REFERENCES assets(id),
    quantity REAL,
    price REAL,
    amount REAL,
    currency TEXT DEFAULT 'USD',
    notes TEXT,
    is_salary_contribution BOOLEAN DEFAULT 0,
    realized_pnl REAL,
    realized_roi_percent REAL,
    user_id INTEGER REFERENCES users(id)
);
`;

/**
 * Initialize the test database with core tables.
 */
export async function initTestDB(db: Client): Promise<void> {
    const statements = CREATE_TABLES_SQL.split(';').filter(s => s.trim());
    for (const sql of statements) {
        await db.execute(sql.trim());
    }
}
