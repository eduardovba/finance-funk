import { createClient, type Client, type InValue } from '@libsql/client';
import path from 'path';
import type { RunResult } from '@/types';
import { runMigrations } from '@/lib/migrate';

// ─── Singleton client ───────────────────────────────────────────────────────

let client: Client | null = null;
let migrationsRun = false;

function getClient(): Client {
    if (client) return client;

    if (process.env.TURSO_DATABASE_URL) {
        client = createClient({
            url: process.env.TURSO_DATABASE_URL,
            authToken: process.env.TURSO_AUTH_TOKEN,
        });
    } else {
        const dbPath = path.join(process.cwd(), 'data', 'finance.db');
        client = createClient({ url: `file:${dbPath}` });
    }

    return client;
}

// ─── Migrations + admin promotion ───────────────────────────────────────────

async function ensureMigrations(): Promise<void> {
    if (migrationsRun) return;
    migrationsRun = true;

    const db = getClient();
    await runMigrations(db);

    // Auto-promote ADMIN_EMAIL to admin (runtime check, not a migration)
    try {
        const adminEmail = process.env.ADMIN_EMAIL;
        if (adminEmail) {
            await db.execute({
                sql: 'UPDATE users SET is_admin = 1 WHERE email = ? AND is_admin = 0',
                args: [adminEmail.toLowerCase()],
            });
        }
    } catch (e) {
        console.error('Admin promotion failed:', e);
    }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get the database client. Runs migrations on first call.
 * Returns the @libsql/client instance.
 */
export async function getDB(): Promise<Client> {
    const db = getClient();
    await ensureMigrations();
    return db;
}

/**
 * Execute a SELECT query. Returns array of row objects.
 * Compatible with the previous sqlite `db.all()` return shape.
 */
export async function query<T = Record<string, unknown>>(sql: string, params: InValue[] = []): Promise<T[]> {
    const db = getClient();
    await ensureMigrations();
    const result = await db.execute({ sql, args: params });
    return result.rows as T[];
}

/**
 * Execute a SELECT query and return the first row, or undefined.
 * Compatible with the previous sqlite `db.get()` return shape.
 */
export async function get<T = Record<string, unknown>>(sql: string, params: InValue[] = []): Promise<T | undefined> {
    const db = getClient();
    await ensureMigrations();
    const result = await db.execute({ sql, args: params });
    return (result.rows[0] as T) || undefined;
}

/**
 * Execute an INSERT/UPDATE/DELETE statement.
 * Returns { lastID, changes } for compatibility with the previous sqlite wrapper.
 */
export async function run(sql: string, params: InValue[] = []): Promise<RunResult> {
    const db = getClient();
    await ensureMigrations();
    const result = await db.execute({ sql, args: params });
    return {
        lastID: Number(result.lastInsertRowid ?? 0),
        changes: result.rowsAffected,
        lastInsertRowid: result.lastInsertRowid ?? BigInt(0),
        rowsAffected: result.rowsAffected,
    };
}
