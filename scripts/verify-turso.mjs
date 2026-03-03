import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import path from 'path';

const env = readFileSync('.env.local', 'utf-8');
for (const l of env.split('\n')) {
    const i = l.indexOf('=');
    if (i > 0 && !l.startsWith('#')) process.env[l.slice(0, i)] = l.slice(i + 1);
}

const remote = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function checkData() {
    console.log(`Connecting to: ${process.env.TURSO_DATABASE_URL}`);
    console.log('--- Checking tables on Turso ---');

    const tablesResult = await remote.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    const tables = tablesResult.rows.map(r => r.name).sort();

    console.log(`Found ${tables.length} tables`);
    let totalRows = 0;

    for (const table of tables) {
        const countResult = await remote.execute(`SELECT COUNT(*) as c FROM "${table}"`);
        const count = countResult.rows[0].c;
        totalRows += Number(count);
        console.log(`- ${table.padEnd(20)}: ${String(count).padStart(4)} rows`);
    }

    console.log(`\nTotal rows across all tables: ${totalRows}`);

    // Quick probe of key data
    console.log('\n--- Checking specific records ---');
    const users = await remote.execute('SELECT * FROM users LIMIT 3');
    console.log('Sample Users:', users.rows.map(u => u.email).join(', '));

    const assets = await remote.execute('SELECT ticker FROM assets LIMIT 5');
    console.log('Sample Assets:', assets.rows.map(a => a.ticker).join(', '));
}

checkData().catch(console.error);
