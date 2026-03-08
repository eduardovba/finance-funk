'use server';

import { getPluggyClient, mapPluggyToFinanceFunk } from '@/lib/pluggy';
import { run, query, get } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

const DEBUG_SYNC = process.env.DEBUG_PLUGGY === 'true';

/**
 * Get the current user's ID from the session.
 * For server actions called from the UI, this will always have a session.
 * For webhook-like calls, we fall back to looking up user_id from connections.
 */
async function getCurrentUserId(itemId = null) {
    const session = await auth();
    if (session?.user?.id) return session.user.id;

    // Fallback: look up user_id from the connections table using itemId
    if (itemId) {
        const conn = await get('SELECT user_id FROM connections WHERE pluggy_item_id = ?', [itemId]);
        if (conn?.user_id) return conn.user_id;
    }

    throw new Error('Unauthorized: No authenticated user found');
}

/**
 * Update Asset Sync Status
 */
export async function updateAssetSyncStatus(assetId, status, category = null) {
    try {
        const userId = await getCurrentUserId();
        if (category) {
            await run(
                `UPDATE assets SET sync_status = ?, asset_class = ?, allocation_bucket = ? WHERE id = ? AND user_id = ?`,
                [status, category, category, assetId, userId]
            );
        } else {
            await run(`UPDATE assets SET sync_status = ? WHERE id = ? AND user_id = ?`, [status, assetId, userId]);
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
        const userId = await getCurrentUserId();
        const placeholders = assetIds.map(() => '?').join(',');
        await run(`UPDATE assets SET sync_status = 'ACTIVE' WHERE id IN (${placeholders}) AND user_id = ?`, [...assetIds, userId]);
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Batch Verify Error:', error);
        return { error: error.message };
    }
}

function logSync(data) {
    if (DEBUG_SYNC) console.log(`[Pluggy Sync] ${JSON.stringify(data)}`);
}

export async function createConnectToken() {
    try {
        await getCurrentUserId(); // Ensure user is authenticated
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
        const userId = await getCurrentUserId(itemId);
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
            `INSERT INTO connections (id, pluggy_item_id, institution_name, status, last_sync_at, institution_logo_url, user_id) 
             VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
             ON CONFLICT(pluggy_item_id) DO UPDATE SET 
             status = EXCLUDED.status, 
             institution_logo_url = COALESCE(EXCLUDED.institution_logo_url, connections.institution_logo_url),
             last_sync_at = CURRENT_TIMESTAMP`,
            [crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36), itemId, institutionName, item.status, institutionLogoUrl, userId]
        );

        // 2. Fetch Accounts (Cash)
        const accounts = await client.fetchAccounts(itemId);
        logSync({ stage: 'accounts', count: accounts.results?.length });

        if (accounts.results) {
            for (const account of accounts.results) {
                if (account.type === 'CREDIT_CARD' || account.subtype === 'CREDIT_CARD') {
                    if (DEBUG_SYNC) console.log(`- Skipping credit card account: ${account.name}`);
                    continue;
                }

                const mapped = mapPluggyToFinanceFunk(account);
                mapped.category = 'Cash';
                await upsertAsset(mapped, institutionName, itemId, userId);
            }
        }

        // 3. Fetch Investments
        const investments = await client.fetchInvestments(itemId);
        logSync({ stage: 'investments', count: investments.results?.length });

        if (investments.results) {
            if (DEBUG_SYNC) console.log(`Syncing ${investments.results.length} investments for ${institutionName}...`);
            logSync({ stage: 'investments_start', count: investments.results.length });

            for (const investment of investments.results) {
                try {
                    const hasValue = (investment.balance > 0) || (investment.quantity > 0) || (investment.amount > 0);
                    if (!hasValue) {
                        if (DEBUG_SYNC) console.log(`- Skipping ghost asset: ${investment.name}`);
                        continue;
                    }

                    const mapped = mapPluggyToFinanceFunk(investment);
                    if (DEBUG_SYNC) console.log(`- Mapping ${investment.name} (${investment.type}/${investment.subtype}) -> FF:${mapped.category}`);
                    await upsertAsset(mapped, institutionName, itemId, userId);
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
        const userId = await getCurrentUserId(itemId);
        const client = await getPluggyClient();
        try { await client.deleteItem(itemId); } catch (e) { console.warn('Failed to delete Pluggy item:', e.message); }

        await run(`DELETE FROM ledger WHERE asset_id IN (SELECT id FROM assets WHERE pluggy_item_id = ? AND user_id = ?) AND user_id = ?`, [itemId, userId, userId]);
        await run(`DELETE FROM assets WHERE pluggy_item_id = ? AND user_id = ?`, [itemId, userId]);
        await run(`DELETE FROM connections WHERE pluggy_item_id = ? AND user_id = ?`, [itemId, userId]);

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
async function upsertAsset(mapped, brokerName, itemId, userId) {
    const { name, ticker, category, balance, currency, pluggy_asset_id } = mapped;

    const uniqueTicker = `${ticker || name} [${pluggy_asset_id}]`;

    const existing = await get(`SELECT id, sync_status FROM assets WHERE pluggy_asset_id = ? AND user_id = ?`, [pluggy_asset_id, userId]);

    let assetId;
    if (existing) {
        assetId = existing.id;
        const newStatus = existing.sync_status || 'PENDING';

        await run(
            `UPDATE assets SET last_updated = CURRENT_TIMESTAMP, pluggy_item_id = ?, sync_status = ?, name = ?, ticker = ? WHERE id = ? AND user_id = ?`,
            [itemId, newStatus, name, uniqueTicker, existing.id, userId]
        );
    } else {
        const status = 'PENDING';
        const res = await run(
            `INSERT INTO assets (name, ticker, broker, asset_class, currency, allocation_bucket, pluggy_asset_id, pluggy_item_id, last_updated, sync_status, user_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`,
            [name, uniqueTicker, brokerName, category, currency, category, pluggy_asset_id, itemId, status, userId]
        );
        assetId = res.lastID;
    }

    // LEDGER POSITION FIX (The "Billionaire" bug)
    await run(`DELETE FROM ledger WHERE asset_id = ? AND notes = 'Pluggy Sync' AND user_id = ?`, [assetId, userId]);

    // SKIP LEDGER UPDATE IF IGNORED
    if (existing?.sync_status === 'IGNORED') {
        if (DEBUG_SYNC) console.log(`- Skipping ledger update for IGNORED asset: ${name}`);
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    await run(
        `INSERT INTO ledger (date, type, asset_id, quantity, amount, currency, notes, user_id) 
         VALUES (?, 'Investment', ?, ?, ?, ?, 'Pluggy Sync', ?)`,
        [today, assetId, mapped.quantity || 0, balance, currency, userId]
    );
}
