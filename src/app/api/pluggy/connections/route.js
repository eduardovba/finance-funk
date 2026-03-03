import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        // Fetch connections
        const connections = await query(`SELECT id, pluggy_item_id, institution_name, last_sync_at, status, institution_logo_url FROM connections ORDER BY last_sync_at DESC`);

        // Fetch related assets for each connection
        const enriched = await Promise.all(connections.map(async (conn) => {
            const assets = await query(`
                SELECT a.*, l.amount as balance 
                FROM assets a
                JOIN (
                    SELECT asset_id, MAX(date) as max_date 
                    FROM ledger 
                    GROUP BY asset_id
                ) latest_ledger ON a.id = latest_ledger.asset_id
                JOIN ledger l ON l.asset_id = latest_ledger.asset_id AND l.date = latest_ledger.max_date
                WHERE a.pluggy_item_id = ?
            `, [conn.pluggy_item_id]);


            return {
                ...conn,
                assets: assets.map(a => ({
                    id: a.id,
                    name: a.name,
                    broker: a.broker,
                    category: a.asset_class,
                    currency: a.currency,
                    balance: a.balance,
                    sync_status: a.sync_status // Include sync_status
                }))
            };
        }));

        return NextResponse.json(enriched);
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 });
    }
}
