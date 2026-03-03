'use server';

import { getPluggyClient, mapPluggyToFinanceFunk } from '@/lib/pluggy';
import { run, query, get } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';

/**
 * Update Asset Sync Status
 */
export async function updateAssetSyncStatus(assetId, status, category = null) {
    try {
        if (category) {
            await run(
                `UPDATE assets SET sync_status = ?, asset_class = ?, allocation_bucket = ? WHERE id = ?`,
                [status, category, category, assetId]
            );
        } else {
            await run(`UPDATE assets SET sync_status = ? WHERE id = ?`, [status, assetId]);
        }
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Update Asset Sync Status Error:', error);
        return { error: error.message };
    }
}

/**
 * Batch Verify Assets
 */
export async function batchVerifyAssets(assetIds) {
    if (!Array.isArray(assetIds) || assetIds.length === 0) return { success: true };

    try {
        const placeholders = assetIds.map(() => '?').join(',');
        await run(`UPDATE assets SET sync_status = 'ACTIVE' WHERE id IN (${placeholders})`, assetIds);
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Batch Verify Error:', error);
        return { error: error.message };
    }
}

function logSync(data) {
    const logPath = path.join(process.cwd(), 'debug_sync.log');
    const timestamp = new Date().toISOString();
    const entry = `\n[${timestamp}] ${JSON.stringify(data, null, 2)}\n---`;
    fs.appendFileSync(logPath, entry);
}

export async function createConnectToken() {
    try {
        const client = await getPluggyClient();
        const response = await client.createConnectToken();
        return { token: response.accessToken };
    } catch (error) {
        console.error('Pluggy Connect Token Error:', error);
        throw new Error(`Pluggy Auth Error: ${error.message || 'Unknown error'}`);
    }
}

/**
 * Sync Item Server Action
 */
export async function syncItem(itemId) {
    if (!itemId) throw new Error('itemId is required');

    try {
        const client = await getPluggyClient();

        // 1. Update Connection Status & Brand
        const item = await client.fetchItem(itemId);
        const institutionId = item.connector?.id;
        let institutionLogoUrl = null;
        let institutionName = item.connector?.name || 'Connected Bank';

        if (institutionId) {
            try {
                const connector = await client.fetchConnector(institutionId);
                institutionLogoUrl = connector.imageUrl;
                institutionName = connector.name;
            } catch (e) {
                console.warn('Could not fetch connector details:', e.message);
            }
        }

        await run(
            `INSERT INTO connections (id, pluggy_item_id, institution_name, status, last_sync_at, institution_logo_url) 
             VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
             ON CONFLICT(pluggy_item_id) DO UPDATE SET 
             status = EXCLUDED.status, 
             institution_logo_url = COALESCE(EXCLUDED.institution_logo_url, connections.institution_logo_url),
             last_sync_at = CURRENT_TIMESTAMP`,
            [crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36), itemId, institutionName, item.status, institutionLogoUrl]
        );

        // 2. Fetch Accounts (Cash)
        const accounts = await client.fetchAccounts(itemId);
        logSync({ stage: 'accounts', count: accounts.results?.length, results: accounts.results });

        if (accounts.results) {
            for (const account of accounts.results) {
                // Skip credit cards for net worth
                // XP cards often have type='CREDIT' and subtype='CREDIT_CARD'
                if (account.type === 'CREDIT_CARD' || account.subtype === 'CREDIT_CARD') {
                    console.log(`- Skipping credit card account: ${account.name}`);
                    continue;
                }

                const mapped = mapPluggyToFinanceFunk(account);
                // Ensure accounts always map to Cash
                mapped.category = 'Cash';
                await upsertAsset(mapped, institutionName, itemId);
            }
        }

        // 3. Fetch Investments
        const investments = await client.fetchInvestments(itemId);
        logSync({ stage: 'investments', count: investments.results?.length, results: investments.results });

        if (investments.results) {
            console.log(`Syncing ${investments.results.length} investments for ${institutionName}...`);
            logSync({ stage: 'investments_start', count: investments.results.length });

            for (const investment of investments.results) {
                try {
                    // GHOST FILTER: Skip sold positions or zero-value provisions
                    const hasValue = (investment.balance > 0) || (investment.quantity > 0) || (investment.amount > 0);
                    if (!hasValue) {
                        console.log(`- Skipping ghost asset: ${investment.name}`);
                        continue;
                    }

                    const mapped = mapPluggyToFinanceFunk(investment);
                    console.log(`- Mapping ${investment.name} (${investment.type}/${investment.subtype}) -> FF:${mapped.category}`);
                    await upsertAsset(mapped, institutionName, itemId);
                } catch (assetErr) {
                    console.error(`Failed to sync asset ${investment.name}:`, assetErr);
                    logSync({ error: assetErr.message, asset: investment.name, stage: 'asset_loop' });
                }
            }
        }

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Pluggy Sync Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete Connection
 */
export async function deleteConnection(itemId) {
    if (!itemId) throw new Error('itemId is required');

    try {
        const client = await getPluggyClient();
        try { await client.deleteItem(itemId); } catch (e) { }

        await run(`DELETE FROM ledger WHERE asset_id IN (SELECT id FROM assets WHERE pluggy_item_id = ?)`, [itemId]);
        await run(`DELETE FROM assets WHERE pluggy_item_id = ?`, [itemId]);
        await run(`DELETE FROM connections WHERE pluggy_item_id = ?`, [itemId]);

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Delete Connection Error:', error);
        return { error: error.message };
    }
}


/**
 * UPSERT Logic for Assets
 */
async function upsertAsset(mapped, brokerName, itemId) {
    const { name, ticker, category, balance, currency, pluggy_asset_id } = mapped;

    // Fix: Ensure ticker is unique within the broker to avoid SQLITE_CONSTRAINT
    // Using full pluggy_asset_id to guarantee uniqueness across similar products
    const uniqueTicker = `${ticker || name} [${pluggy_asset_id}]`;

    const existing = await get(`SELECT id, sync_status FROM assets WHERE pluggy_asset_id = ?`, [pluggy_asset_id]);

    let assetId;
    if (existing) {
        assetId = existing.id;
        const newStatus = existing.sync_status || 'PENDING';

        await run(
            `UPDATE assets SET last_updated = CURRENT_TIMESTAMP, pluggy_item_id = ?, sync_status = ?, name = ?, ticker = ? WHERE id = ?`,
            [itemId, newStatus, name, uniqueTicker, existing.id]
        );
    } else {
        const status = 'PENDING';
        const res = await run(
            `INSERT INTO assets (name, ticker, broker, asset_class, currency, allocation_bucket, pluggy_asset_id, pluggy_item_id, last_updated, sync_status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
            [name, uniqueTicker, brokerName, category, currency, category, pluggy_asset_id, itemId, status]
        );
        assetId = res.lastID;
    }

    // LEDGER POSITION FIX (The "Billionaire" bug)
    // For synced assets, the ledger should only represent the "Current Position".
    // 1. We remove any previous "Pluggy Sync" entries for this asset to avoid cumulative summing.
    await run(`DELETE FROM ledger WHERE asset_id = ? AND notes = 'Pluggy Sync'`, [assetId]);

    // 2. SKIP LEDGER UPDATE IF IGNORED
    // If the user intentionally ignored this asset, we don't add a new ledger entry.
    // This ensures its value stays at 0 (or previous manual value) in the dashboard.
    if (existing?.sync_status === 'IGNORED') {
        console.log(`- Skipping ledger update for IGNORED asset: ${name}`);
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    // FIX: Set amount to balance (positive) because Finance Funk expects Asset Value = Sum(ledger.amount)
    await run(
        `INSERT INTO ledger (date, type, asset_id, quantity, amount, currency, notes) 
         VALUES (?, 'Investment', ?, ?, ?, ?, 'Pluggy Sync')`,
        [today, assetId, mapped.quantity || 0, balance, currency]
    );
}
