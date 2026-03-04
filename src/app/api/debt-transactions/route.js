import { NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { requireAuth } from '@/lib/authGuard';

export async function GET() {
    try {
        const user = await requireAuth();
        const sql = `
            SELECT 
                l.id, l.date, 
                a.name as lender, l.amount as value_brl, l.notes as obs
            FROM ledger l
            JOIN assets a ON l.asset_id = a.id
            WHERE a.asset_class = 'Debt' AND l.user_id = ?
        `;
        const rows = await query(sql, [user.id]);

        const data = rows.map(r => ({
            id: r.id,
            date: r.date,
            lender: r.lender,
            value_brl: r.value_brl,
            obs: r.obs
        }));

        return NextResponse.json(data);
    } catch (e) {
        if (e instanceof Response) return e;
        console.error('GET Debt Error:', e);
        return NextResponse.json({ error: 'Failed to fetch debt' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const user = await requireAuth();
        const body = await request.json();
        const { date, lender, value_brl, obs } = body;

        let assetId;
        const rows = await query('SELECT id FROM assets WHERE name = ? AND asset_class = "Debt" AND user_id = ?', [lender, user.id]);

        if (rows.length > 0) {
            assetId = rows[0].id;
        } else {
            const res = await run(
                `INSERT INTO assets (name, asset_class, currency, broker, user_id) VALUES (?, ?, ?, ?, ?)`,
                [lender, 'Debt', 'BRL', 'Manual', user.id]
            );
            assetId = res.lastID;
        }

        const res = await run(
            `INSERT INTO ledger (date, type, asset_id, amount, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [date, 'Liability', assetId, value_brl, 'BRL', obs, user.id]
        );

        return NextResponse.json({ success: true, id: res.lastID });
    } catch (e) {
        if (e instanceof Response) return e;
        console.error('POST Debt Error:', e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const user = await requireAuth();
        const body = await request.json();
        const { id, date, lender, value_brl, obs } = body;

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        let assetId;
        const rows = await query('SELECT id FROM assets WHERE name = ? AND asset_class = "Debt" AND user_id = ?', [lender, user.id]);

        if (rows.length > 0) {
            assetId = rows[0].id;
        } else {
            const res = await run(
                `INSERT INTO assets (name, asset_class, currency, broker, user_id) VALUES (?, ?, ?, ?, ?)`,
                [lender, 'Debt', 'BRL', 'Manual', user.id]
            );
            assetId = res.lastID;
        }

        await run(
            `UPDATE ledger SET date = ?, asset_id = ?, amount = ?, notes = ? WHERE id = ? AND user_id = ?`,
            [date, assetId, value_brl, obs, id, user.id]
        );

        return NextResponse.json({ success: true, id });
    } catch (e) {
        if (e instanceof Response) return e;
        console.error('PUT Debt Error:', e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const user = await requireAuth();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await run('DELETE FROM ledger WHERE id = ? AND user_id = ?', [id, user.id]);

        return NextResponse.json({ success: true });
    } catch (e) {
        if (e instanceof Response) return e;
        console.error('DELETE Debt Error:', e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
