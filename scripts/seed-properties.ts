/**
 * Seed script: Create sold properties (Andyara 1, Rua Montes Claros)
 * and Ink Court config that were previously hardcoded in db.ts migrations.
 *
 * Run manually: npx tsx scripts/seed-properties.ts
 * This is NOT run on every cold start.
 */

import { createClient, type Client, type InValue } from '@libsql/client';
import { readFileSync } from 'fs';
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

let client: Client;
if (process.env.TURSO_DATABASE_URL) {
    client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });
} else {
    const dbPath = path.join(projectRoot, 'data', 'finance.db');
    client = createClient({ url: `file:${dbPath}` });
}

const adminEmail = process.env.ADMIN_EMAIL;
if (!adminEmail) {
    console.error('❌ ADMIN_EMAIL not set in .env.local');
    process.exit(1);
}

const duduRes = await client.execute({
    sql: 'SELECT id FROM users WHERE email = ?',
    args: [adminEmail],
});
if (duduRes.rows.length === 0) {
    console.error(`❌ No user found with email ${adminEmail}`);
    process.exit(1);
}
const uid = (duduRes.rows[0] as Record<string, unknown>).id as InValue;

async function assetExists(name: string): Promise<InValue> {
    const r = await client.execute({
        sql: 'SELECT id FROM assets WHERE name = ? AND user_id = ?',
        args: [name, uid],
    });
    return r.rows.length > 0
        ? ((r.rows[0] as Record<string, unknown>).id as InValue)
        : null;
}

console.log('Seeding property data...\n');

// ── Andyara 1 (Sold) ──
let a1Id = await assetExists('Andyara 1');
if (!a1Id) {
    await client.execute({
        sql: "INSERT INTO assets (name, asset_class, broker, currency, sync_status, user_id) VALUES (?, 'Real Estate', 'Manual', 'BRL', 'ACTIVE', ?)",
        args: ['Andyara 1', uid],
    });
    const a1 = await client.execute({
        sql: "SELECT id FROM assets WHERE name = 'Andyara 1' AND user_id = ?",
        args: [uid],
    });
    a1Id = (a1.rows[0] as Record<string, unknown>).id as InValue;

    await client.execute({
        sql: 'INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: ['2015-01-01', 'Purchase', a1Id, 237000, 237000, 'BRL', 'Initial investment', uid],
    });
    await client.execute({
        sql: 'INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: ['2023-01-01', 'Stamp Duty', a1Id, -9074, 0, 'BRL', 'Stamp Duty', uid],
    });
    await client.execute({
        sql: 'INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: ['2023-06-01', 'Sale', a1Id, -360000, 360000, 'BRL', 'Property sold', uid],
    });
    console.log('  ✅ Andyara 1 (sold property) with ledger entries');
} else {
    console.log('  ⏭  Andyara 1 — already exists');
}

// ── Rua Montes Claros (Sold) ──
let mcId = await assetExists('Rua Montes Claros');
if (!mcId) {
    await client.execute({
        sql: "INSERT INTO assets (name, asset_class, broker, currency, sync_status, user_id) VALUES (?, 'Real Estate', 'Manual', 'BRL', 'ACTIVE', ?)",
        args: ['Rua Montes Claros', uid],
    });
    const mc = await client.execute({
        sql: "SELECT id FROM assets WHERE name = 'Rua Montes Claros' AND user_id = ?",
        args: [uid],
    });
    mcId = (mc.rows[0] as Record<string, unknown>).id as InValue;

    await client.execute({
        sql: 'INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: ['2018-01-01', 'Purchase', mcId, 681000, 681000, 'BRL', 'Initial investment', uid],
    });
    await client.execute({
        sql: 'INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: ['2024-01-01', 'Stamp Duty', mcId, -29748, 0, 'BRL', 'Stamp Duty', uid],
    });
    await client.execute({
        sql: 'INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: ['2024-06-01', 'Sale', mcId, -822920, 822920, 'BRL', 'Property sold', uid],
    });
    console.log('  ✅ Rua Montes Claros (sold property) with ledger entries');
} else {
    console.log('  ⏭  Rua Montes Claros — already exists');
}

// ── Ink Court: Ensure Mortgage Setup config + valuation ──
const inkId = await assetExists('Ink Court');
if (inkId) {
    const setupExists = await client.execute({
        sql: "SELECT id FROM ledger WHERE asset_id = ? AND type = 'Mortgage Setup' AND user_id = ?",
        args: [inkId, uid],
    });
    if (setupExists.rows.length === 0) {
        const config = JSON.stringify({
            originalAmount: 541000,
            deposit: 60000,
            durationMonths: 408,
            interestRate: 6.24,
        });
        await client.execute({
            sql: 'INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            args: ['2024-03-01', 'Mortgage Setup', inkId, 0, 0, 'GBP', config, uid],
        });
        console.log('  ✅ Ink Court mortgage setup config');
    } else {
        console.log('  ⏭  Ink Court mortgage setup — already exists');
    }

    const hasValuation = await client.execute({
        sql: 'SELECT id FROM ledger WHERE asset_id = ? AND price > 0 AND user_id = ?',
        args: [inkId, uid],
    });
    if (hasValuation.rows.length === 0) {
        await client.execute({
            sql: 'INSERT INTO ledger (date, type, asset_id, amount, price, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            args: ['2026-02-19', 'Valuation Update', inkId, 0, 620000, 'GBP', 'Initial valuation', uid],
        });
        console.log('  ✅ Ink Court initial valuation (£620,000)');
    } else {
        console.log('  ⏭  Ink Court valuation — already exists');
    }
} else {
    console.log('  ⏭  Ink Court — asset not found, skipping config');
}

console.log('\n🎉 Property seeding complete!');
