/**
 * Seed script: Load existing JSON files into kv_store table on Turso
 * 
 * Usage: node scripts/seed-kv-store.mjs
 */

import { createClient } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Parse .env.local
const envFile = readFileSync(path.join(projectRoot, '.env.local'), 'utf-8');
for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    process.env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
}

const remote = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

// Create kv_store table if it doesn't exist
await remote.execute(`CREATE TABLE IF NOT EXISTS kv_store (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

const dataDir = path.join(projectRoot, 'src', 'data');

const files = [
    { file: 'app_settings.json', key: 'app_settings' },
    { file: 'forecast_settings.json', key: 'forecast_settings' },
    { file: 'dashboard_config.json', key: 'dashboard_config' },
    { file: 'allocation_targets.json', key: 'allocation_targets' },
    { file: 'asset_classes.json', key: 'asset_classes' },
    { file: 'live_assets.json', key: 'live_assets' },
    { file: 'historical_snapshots.json', key: 'historical_snapshots' },
    { file: 'market_data_cache.json', key: 'market_data_cache' },
    { file: 'pension_fund_map.json', key: 'pension_fund_map' },
    { file: 'pension_live_prices.json', key: 'pension_live_prices' },
];

console.log('Seeding kv_store table...\n');

for (const { file, key } of files) {
    const filePath = path.join(dataDir, file);
    if (!existsSync(filePath)) {
        console.log(`  ⏭  ${file} — not found, skipping`);
        continue;
    }

    try {
        const content = readFileSync(filePath, 'utf-8');
        // Validate it's valid JSON
        JSON.parse(content);

        await remote.execute({
            sql: 'INSERT OR REPLACE INTO kv_store (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
            args: [key, content],
        });
        console.log(`  ✅ ${key} — seeded (${(content.length / 1024).toFixed(1)} KB)`);
    } catch (e) {
        console.error(`  ❌ ${key} — ${e.message}`);
    }
}

console.log('\n🎉 Seeding complete!');
