import { get, run } from './db';

/**
 * Get a value from the kv_store table.
 * Returns the parsed JSON value, or the defaultValue if not found.
 */
export async function kvGet(key, defaultValue = null) {
    const row = await get('SELECT value FROM kv_store WHERE key = ?', [key]);
    if (!row) return defaultValue;
    try {
        return JSON.parse(row.value);
    } catch {
        return row.value;
    }
}

/**
 * Set a value in the kv_store table.
 * Value is JSON-stringified before storage.
 */
export async function kvSet(key, value) {
    const json = JSON.stringify(value);
    await run(
        'INSERT OR REPLACE INTO kv_store (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [key, json]
    );
}
