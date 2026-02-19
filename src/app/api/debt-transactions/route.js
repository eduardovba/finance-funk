import { NextResponse } from 'next/server';
import { query, run } from '@/lib/db';

export async function GET() {
    try {
        const sql = `
            SELECT 
                l.id, l.date, 
                a.name as lender, l.amount as value_brl, l.notes as obs
            FROM ledger l
            JOIN assets a ON l.asset_id = a.id
            WHERE a.asset_class = 'Debt'
        `;
        const rows = await query(sql);

        const data = rows.map(r => ({
            id: r.id,
            date: r.date,
            lender: r.lender,
            value_brl: r.value_brl,
            obs: r.obs
        }));

        return NextResponse.json(data);
    } catch (e) {
        console.error('GET Debt Error:', e);
        return NextResponse.json({ error: 'Failed to fetch debt' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { date, lender, value_brl, obs } = body;

        let assetId;
        const rows = await query('SELECT id FROM assets WHERE name = ? AND asset_class = "Debt"', [lender]);

        if (rows.length > 0) {
            assetId = rows[0].id;
        } else {
            const res = await run(
                `INSERT INTO assets (name, asset_class, currency, broker) VALUES (?, ?, ?, ?)`,
                [lender, 'Debt', 'BRL', 'Manual']
            );
            assetId = res.lastID;
        }

        const res = await run(
            `INSERT INTO ledger (date, type, asset_id, amount, currency, notes) VALUES (?, ?, ?, ?, ?, ?)`,
            [date, 'Liability', assetId, value_brl, 'BRL', obs]
        );

        return NextResponse.json({ success: true, id: res.lastID });
    } catch (e) {
        console.error('POST Debt Error:', e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, date, lender, value_brl, obs } = body;

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        let assetId;
        const rows = await query('SELECT id FROM assets WHERE name = ? AND asset_class = "Debt"', [lender]);

        if (rows.length > 0) {
            assetId = rows[0].id;
        } else {
            const res = await run(
                `INSERT INTO assets (name, asset_class, currency, broker) VALUES (?, ?, ?, ?)`,
                [lender, 'Debt', 'BRL', 'Manual']
            );
            assetId = res.lastID;
        }

        await run(
            `UPDATE ledger SET date = ?, asset_id = ?, amount = ?, notes = ? WHERE id = ?`,
            [date, assetId, value_brl, obs, id]
        );

        return NextResponse.json({ success: true, id });
    } catch (e) {
        console.error('PUT Debt Error:', e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await run('DELETE FROM ledger WHERE id = ?', [id]);

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('DELETE Debt Error:', e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
