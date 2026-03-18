import { get, run } from './db';

/**
 * Get a value from the kv_store table, scoped to a user.
 * If userId is provided, keys are prefixed with `userId:`.
 * Falls back to the un-prefixed key for migration purposes.
 * Returns the parsed JSON value, or the defaultValue if not found.
 */
export async function kvGet<T = unknown>(key: string, defaultValue: T | null = null, userId: string | number | null = null): Promise<T | null> {
    const scopedKey = userId ? `${userId}:${key}` : key;

    // Try the scoped key first
    let row = await get<{ value: string }>('SELECT value FROM kv_store WHERE key = ?', [scopedKey]);

    // Fallback: if scoped key not found and we have a userId, check un-prefixed key and migrate it
    if (!row && userId) {
        row = await get<{ value: string }>('SELECT value FROM kv_store WHERE key = ?', [key]);
        if (row) {
            // Migrate: copy to scoped key and delete the old one
            await run(
                'INSERT OR REPLACE INTO kv_store (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
                [scopedKey, row.value]
            );
            await run('DELETE FROM kv_store WHERE key = ?', [key]);
        }
    }

    if (!row) return defaultValue;
    try {
        return JSON.parse(row.value) as T;
    } catch {
        return row.value as T;
    }
}

/**
 * Set a value in the kv_store table, scoped to a user.
 * If userId is provided, keys are prefixed with `userId:`.
 * Value is JSON-stringified before storage.
 */
export async function kvSet(key: string, value: unknown, userId: string | number | null = null): Promise<void> {
    const scopedKey = userId ? `${userId}:${key}` : key;
    const json = JSON.stringify(value);
    await run(
        'INSERT OR REPLACE INTO kv_store (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [scopedKey, json]
    );
}
