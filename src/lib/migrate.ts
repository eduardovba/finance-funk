import type { Client, InValue } from '@libsql/client';

interface Migration {
    version: number;
    name: string;
    /** Plain SQL statements, OR null to signal a programmatic migration */
    sql: string[] | null;
    /** Optional async function for migrations that need runtime logic */
    run?: (client: Client) => Promise<void>;
}

/**
 * Run all pending migrations. Uses a _migrations table to track what's been applied.
 * Each migration runs in order. Idempotent — safe to call on every startup.
 */
export async function runMigrations(client: Client): Promise<void> {
    // Create the tracking table if it doesn't exist
    await client.execute(`
        CREATE TABLE IF NOT EXISTS _migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Get the latest applied version
    const result = await client.execute('SELECT MAX(version) as v FROM _migrations');
    const currentVersion = Number(result.rows[0]?.v) || 0;

    const migrations = getMigrations();

    for (const migration of migrations) {
        if (migration.version <= currentVersion) continue;

        console.log(`[migrate] Applying migration ${migration.version}: ${migration.name}`);

        if (migration.run) {
            // Programmatic migration
            await migration.run(client);
        } else if (migration.sql) {
            // SQL-based migration
            for (const sql of migration.sql) {
                try {
                    await client.execute(sql);
                } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : String(e);
                    // Skip "already exists" / "duplicate column" errors for idempotency
                    if (msg.includes('already exists') || msg.includes('duplicate column')) {
                        continue;
                    }
                    throw e;
                }
            }
        }

        await client.execute({
            sql: 'INSERT INTO _migrations (version, name) VALUES (?, ?)',
            args: [migration.version, migration.name],
        });
        console.log(`[migrate] ✓ Migration ${migration.version} applied`);
    }
}

// ─── Migration definitions ──────────────────────────────────────────────────

function getMigrations(): Migration[] {
    return [
        {
            version: 1,
            name: 'initial_schema',
            sql: [
                `CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT,
                    provider TEXT DEFAULT 'credentials',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`,
                `CREATE TABLE IF NOT EXISTS assets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    ticker TEXT,
                    broker TEXT,
                    asset_class TEXT,
                    currency TEXT DEFAULT 'USD',
                    allocation_bucket TEXT,
                    pluggy_asset_id TEXT,
                    pluggy_item_id TEXT,
                    last_updated DATETIME,
                    sync_status TEXT DEFAULT 'ACTIVE',
                    user_id INTEGER REFERENCES users(id)
                )`,
                `CREATE TABLE IF NOT EXISTS ledger (
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
                )`,
                `CREATE TABLE IF NOT EXISTS connections (
                    id TEXT PRIMARY KEY,
                    pluggy_item_id TEXT UNIQUE NOT NULL,
                    institution_name TEXT NOT NULL,
                    last_sync_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    status TEXT NOT NULL,
                    institution_logo_url TEXT,
                    user_id INTEGER REFERENCES users(id)
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
                `CREATE TABLE IF NOT EXISTS asset_logos (
                    ticker TEXT PRIMARY KEY,
                    logo_url TEXT NOT NULL,
                    source TEXT,
                    fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`,
                `CREATE TABLE IF NOT EXISTS monthly_ledger (
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
                )`,
                `CREATE TABLE IF NOT EXISTS snapshots (
                    month TEXT,
                    content TEXT,
                    user_id INTEGER REFERENCES users(id),
                    UNIQUE(month, user_id)
                )`,
                'CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_pluggy_id ON assets(pluggy_asset_id)',
            ],
        },
        {
            version: 2,
            name: 'add_asset_columns',
            sql: [
                'ALTER TABLE assets ADD COLUMN pluggy_asset_id TEXT',
                'ALTER TABLE assets ADD COLUMN pluggy_item_id TEXT',
                'ALTER TABLE assets ADD COLUMN last_updated DATETIME',
                "ALTER TABLE assets ADD COLUMN sync_status TEXT DEFAULT 'ACTIVE'",
                'ALTER TABLE assets ADD COLUMN user_id INTEGER REFERENCES users(id)',
            ],
        },
        {
            version: 3,
            name: 'add_ledger_columns',
            sql: [
                'ALTER TABLE ledger ADD COLUMN is_salary_contribution BOOLEAN DEFAULT 0',
                'ALTER TABLE ledger ADD COLUMN realized_roi_percent REAL',
                'ALTER TABLE ledger ADD COLUMN user_id INTEGER REFERENCES users(id)',
            ],
        },
        {
            version: 4,
            name: 'add_connection_columns',
            sql: [
                'ALTER TABLE connections ADD COLUMN institution_logo_url TEXT',
                'ALTER TABLE connections ADD COLUMN user_id INTEGER REFERENCES users(id)',
            ],
        },
        {
            version: 5,
            name: 'add_user_fields',
            sql: [
                'ALTER TABLE users ADD COLUMN avatar_url TEXT',
                'ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0',
                'ALTER TABLE users ADD COLUMN deleted_at DATETIME',
            ],
        },
        {
            version: 6,
            name: 'add_monthly_ledger_extraordinary',
            sql: [
                'ALTER TABLE monthly_ledger ADD COLUMN extraordinary_income REAL DEFAULT 0',
            ],
        },
        {
            version: 7,
            name: 'drop_watchlist',
            sql: ['DROP TABLE IF EXISTS watchlist'],
        },
        {
            version: 8,
            name: 'recreate_monthly_ledger_with_user_id',
            sql: null,
            run: async (client: Client) => {
                const hasUserIdCol = await client.execute(
                    `SELECT COUNT(*) as cnt FROM pragma_table_info('monthly_ledger') WHERE name = 'user_id'`
                );
                if (Number((hasUserIdCol.rows[0] as Record<string, unknown>).cnt) === 0) {
                    console.log('[migrate] Migrating monthly_ledger to add user_id...');
                    await client.execute(`CREATE TABLE IF NOT EXISTS monthly_ledger_new (
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
                    await client.execute(`INSERT OR IGNORE INTO monthly_ledger_new
                        (month, salary_savings, fixed_income, equity, real_estate, crypto, debt, pension, total_income, total_investments, fixed_income_income, equity_income, real_estate_income, extraordinary_income)
                        SELECT month, salary_savings, fixed_income, equity, real_estate, crypto, debt, pension, total_income, total_investments,
                            COALESCE(fixed_income_income, 0), COALESCE(equity_income, 0), COALESCE(real_estate_income, 0), COALESCE(extraordinary_income, 0)
                        FROM monthly_ledger`);
                    await client.execute('DROP TABLE monthly_ledger');
                    await client.execute('ALTER TABLE monthly_ledger_new RENAME TO monthly_ledger');
                    console.log('[migrate] monthly_ledger migration complete.');
                }
            },
        },
        {
            version: 9,
            name: 'recreate_snapshots_with_user_id',
            sql: null,
            run: async (client: Client) => {
                const hasUserIdCol = await client.execute(
                    `SELECT COUNT(*) as cnt FROM pragma_table_info('snapshots') WHERE name = 'user_id'`
                );
                if (Number((hasUserIdCol.rows[0] as Record<string, unknown>).cnt) === 0) {
                    console.log('[migrate] Migrating snapshots to add user_id...');
                    await client.execute(`CREATE TABLE IF NOT EXISTS snapshots_new (
                        month TEXT,
                        content TEXT,
                        user_id INTEGER REFERENCES users(id),
                        UNIQUE(month, user_id)
                    )`);
                    try {
                        await client.execute(`INSERT OR IGNORE INTO snapshots_new (month, content)
                            SELECT month, content FROM snapshots`);
                        await client.execute('DROP TABLE snapshots');
                    } catch (_e) {
                        /* snapshots table didn't exist yet, that's fine */
                    }
                    await client.execute('ALTER TABLE snapshots_new RENAME TO snapshots');
                    console.log('[migrate] snapshots migration complete.');
                }
            },
        },
        {
            version: 10,
            name: 'assign_data_ownership',
            sql: null,
            run: async (client: Client) => {
                const adminEmail = process.env.ADMIN_EMAIL;
                if (!adminEmail) {
                    console.log('[migrate] ADMIN_EMAIL not set, skipping data ownership migration');
                    return;
                }
                const adminUser = await client.execute({
                    sql: 'SELECT id FROM users WHERE email = ?',
                    args: [adminEmail],
                });
                if (adminUser.rows.length === 0) return;

                const uid = (adminUser.rows[0] as Record<string, unknown>).id;
                const tables = ['assets', 'ledger', 'monthly_ledger', 'connections', 'snapshots'];
                for (const table of tables) {
                    try {
                        const result = await client.execute({
                            sql: `UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`,
                            args: [uid as InValue],
                        });
                        if (result.rowsAffected > 0) {
                            console.log(`[migrate] Assigned ${result.rowsAffected} rows in ${table} to user ${uid} (${adminEmail})`);
                        }
                    } catch (tableErr) {
                        console.warn(`[migrate] Skipped ${table} ownership migration:`, (tableErr as Error).message);
                    }
                }
            },
        },
        {
            version: 11,
            name: 'add_brokers_asset_class',
            sql: ['ALTER TABLE brokers ADD COLUMN asset_class TEXT'],
        },
        {
            version: 12,
            name: 'budget_tables',
            sql: [
                `CREATE TABLE IF NOT EXISTS budget_categories (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    name        TEXT NOT NULL,
                    icon        TEXT,
                    color       TEXT,
                    monthly_target_cents INTEGER NOT NULL DEFAULT 0,
                    parent_id   INTEGER REFERENCES budget_categories(id) ON DELETE SET NULL,
                    sort_order  INTEGER NOT NULL DEFAULT 0,
                    is_income   INTEGER NOT NULL DEFAULT 0
                )`,
                `CREATE TABLE IF NOT EXISTS budget_transactions (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    category_id     INTEGER REFERENCES budget_categories(id) ON DELETE SET NULL,
                    amount_cents    INTEGER NOT NULL,
                    currency        TEXT NOT NULL DEFAULT 'BRL',
                    description     TEXT,
                    date            TEXT NOT NULL,
                    is_recurring    INTEGER NOT NULL DEFAULT 0
                )`,
                `CREATE TABLE IF NOT EXISTS budget_monthly_rollups (
                    id                        INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id                   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    month                     TEXT NOT NULL,
                    total_income_cents        INTEGER NOT NULL DEFAULT 0,
                    total_expenses_cents      INTEGER NOT NULL DEFAULT 0,
                    total_savings_cents       INTEGER NOT NULL DEFAULT 0,
                    savings_rate_basis_points INTEGER NOT NULL DEFAULT 0,
                    UNIQUE(user_id, month)
                )`,
            ],
        },
        {
            version: 13,
            name: 'budget_transactions_add_source',
            sql: [
                `ALTER TABLE budget_transactions ADD COLUMN source TEXT`,
            ],
        },
        {
            version: 14,
            name: 'add_onboarding_fields',
            sql: [
                "ALTER TABLE users ADD COLUMN onboarding_completed INTEGER DEFAULT 0",
                "ALTER TABLE users ADD COLUMN onboarding_goal TEXT",
            ],
        },
        {
            version: 15,
            name: 'add_last_accessed',
            sql: [
                "ALTER TABLE users ADD COLUMN last_accessed_at DATETIME",
            ],
        },
        {
            version: 16,
            name: 'monthly_close_tasks',
            sql: [
                `CREATE TABLE IF NOT EXISTS monthly_close_tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    month TEXT NOT NULL,
                    task_type TEXT NOT NULL,
                    related_entity_id INTEGER,
                    related_entity_name TEXT,
                    is_completed INTEGER DEFAULT 0,
                    completed_at DATETIME,
                    UNIQUE(user_id, month, task_type, related_entity_id)
                )`,
            ],
        },
        {
            version: 17,
            name: 'monthly_close_custom_tasks',
            sql: [
                "ALTER TABLE monthly_close_tasks ADD COLUMN is_recurring INTEGER DEFAULT 0",
                "ALTER TABLE monthly_close_tasks ADD COLUMN custom_label TEXT",
                `CREATE TABLE IF NOT EXISTS monthly_close_templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    task_type TEXT NOT NULL DEFAULT 'CUSTOM',
                    related_entity_id INTEGER,
                    label TEXT NOT NULL,
                    is_active INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, label)
                )`,
            ],
        },
        {
            version: 18,
            name: 'monthly_close_checklist_dnd',
            sql: [
                "ALTER TABLE monthly_close_tasks ADD COLUMN sort_order INTEGER DEFAULT 0",
                `CREATE TABLE IF NOT EXISTS monthly_close_dismissed_suggestions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    label TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, label)
                )`
            ]
        }
    ];
}
