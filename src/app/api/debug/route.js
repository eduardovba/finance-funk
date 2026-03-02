import { NextResponse } from 'next/server';
import { query, run } from '@/lib/db';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const action = searchParams.get('action');

        if (action === 'delete-old-ledger') {
            await run(`DELETE FROM ledger WHERE date LIKE '2017%' OR date LIKE '2019%'`);
            return NextResponse.json({ success: true, message: 'Deleted 2017 and 2019 from ledger' });
        }

        const rogueLedgerRows = await query(`SELECT * FROM ledger WHERE date LIKE '2017%' OR date LIKE '2019%'`);
        const rogueAssets = await query(`SELECT * FROM assets WHERE id IN (SELECT asset_id FROM ledger WHERE date LIKE '2017%' OR date LIKE '2019%')`);

        return NextResponse.json({
            rogueLedgerRows,
            rogueAssets
        });
    } catch (e) {
        return NextResponse.json({ error: e.message });
    }
}
