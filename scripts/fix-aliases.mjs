import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import path from 'path';

const env = readFileSync('.env.local', 'utf-8');
for (const l of env.split('\n')) {
    const i = l.indexOf('=');
    if (i > 0 && !l.startsWith('#')) process.env[l.slice(0, i)] = l.slice(i + 1);
}

const local = createClient({ url: 'file:' + path.join(process.cwd(), 'data', 'finance.db') });
const remote = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

// Drop and recreate aliases without the FK constraint, then insert
await remote.execute('DROP TABLE IF EXISTS aliases');

// Recreate without FK constraints
const createSQL = `CREATE TABLE aliases (
    alias TEXT PRIMARY KEY,
    ticker TEXT NOT NULL
)`;
await remote.execute(createSQL);
console.log('Recreated aliases table');

// Now insert with FK checks off
await remote.execute('PRAGMA foreign_keys = OFF');

const rows = await local.execute('SELECT * FROM aliases');
const cols = rows.columns;
let ok = 0;
for (const row of rows.rows) {
    try {
        const placeholders = cols.map(() => '?').join(',');
        const colNames = cols.map(c => '"' + c + '"').join(',');
        await remote.execute({ sql: `INSERT OR IGNORE INTO aliases (${colNames}) VALUES (${placeholders})`, args: cols.map(c => row[c]) });
        ok++;
    } catch (e) { console.log('skip:', e.message); }
}

await remote.execute('PRAGMA foreign_keys = ON');
console.log(`Migrated ${ok}/${rows.rows.length} aliases`);
