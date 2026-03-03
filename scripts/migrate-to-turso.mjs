/**
 * Migration script: Copy all data from local finance.db → Turso remote
 * 
 * Usage: node scripts/migrate-to-turso.mjs
 * 
 * Requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.local
 */

import { createClient } from '@libsql/client';
import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Parse .env.local manually (no dotenv dependency needed)
const envFile = readFileSync(path.join(projectRoot, '.env.local'), 'utf-8');
for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    const value = trimmed.slice(eqIdx + 1);
    process.env[key] = value;
}

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env.local');
    process.exit(1);
}

// Source: local file
const local = createClient({
    url: `file:${path.join(projectRoot, 'data', 'finance.db')}`,
});

// Destination: Turso remote
const remote = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
    console.log('🔍 Reading local database schema...');

    // Get all table names
    const tables = await local.execute(
        "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );

    console.log(`📋 Found ${tables.rows.length} tables: ${tables.rows.map(r => r.name).join(', ')}\n`);

    for (const table of tables.rows) {
        const tableName = table.name;
        const createSQL = table.sql;

        console.log(`\n━━━ ${tableName} ━━━`);

        // Create the table on Turso
        try {
            await remote.execute(createSQL);
            console.log(`  ✅ Created table`);
        } catch (e) {
            if (e.message?.includes('already exists')) {
                console.log(`  ⚠️  Table already exists, skipping creation`);
            } else {
                console.error(`  ❌ Error creating table: ${e.message}`);
                continue;
            }
        }

        // Read all rows from local
        const rows = await local.execute(`SELECT * FROM "${tableName}"`);

        if (rows.rows.length === 0) {
            console.log(`  📭 No data to migrate`);
            continue;
        }

        console.log(`  📦 Migrating ${rows.rows.length} rows...`);

        // Get column names from the first row
        const columns = rows.columns;

        // Insert in batches of 50 to avoid hitting limits
        const batchSize = 50;
        let migrated = 0;

        for (let i = 0; i < rows.rows.length; i += batchSize) {
            const batch = rows.rows.slice(i, i + batchSize);
            const statements = batch.map(row => {
                const placeholders = columns.map(() => '?').join(', ');
                const values = columns.map(col => row[col]);
                return {
                    sql: `INSERT OR IGNORE INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`,
                    args: values,
                };
            });

            try {
                await remote.batch(statements, 'write');
                migrated += batch.length;
            } catch (e) {
                console.error(`  ❌ Batch error at row ${i}: ${e.message}`);
                // Try inserting one by one to identify the problem row
                for (const stmt of statements) {
                    try {
                        await remote.execute(stmt);
                        migrated++;
                    } catch (e2) {
                        console.error(`  ⚠️  Skipped row: ${e2.message}`);
                    }
                }
            }
        }

        console.log(`  ✅ Migrated ${migrated}/${rows.rows.length} rows`);
    }

    // Also migrate indexes
    console.log('\n━━━ Indexes ━━━');
    const indexes = await local.execute(
        "SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL"
    );
    for (const idx of indexes.rows) {
        try {
            await remote.execute(idx.sql);
            console.log(`  ✅ Created index`);
        } catch (e) {
            if (e.message?.includes('already exists')) {
                console.log(`  ⚠️  Index already exists`);
            } else {
                console.error(`  ❌ ${e.message}`);
            }
        }
    }

    console.log('\n🎉 Migration complete!');
}

migrate().catch(e => {
    console.error('💥 Migration failed:', e);
    process.exit(1);
});
