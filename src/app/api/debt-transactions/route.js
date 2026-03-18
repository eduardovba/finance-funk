import { NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { requireAuth } from '@/lib/authGuard';
import { z } from 'zod';
import { validateBody, validateId, dateField, optionalString } from '@/lib/validation';

const PostDebtSchema = z.object({
    date: dateField.optional(),
    lender: z.string().min(1, 'Lender is required'),
    value_brl: z.coerce.number({ required_error: 'value_brl is required' }),
    obs: optionalString
});

const PutDebtSchema = z.object({
    id: z.coerce.number(),
    date: dateField.optional(),
    lender: z.string().min(1, 'Lender is required'),
    value_brl: z.coerce.number(),
    obs: optionalString
});

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
        const { data, error } = validateBody(PostDebtSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        let assetId;
        const rows = await query('SELECT id FROM assets WHERE name = ? AND asset_class = ? AND user_id = ?', [data.lender, 'Debt', user.id]);

        if (rows.length > 0) {
            assetId = rows[0].id;
        } else {
            const res = await run(
                `INSERT INTO assets (name, asset_class, currency, broker, user_id) VALUES (?, ?, ?, ?, ?)`,
                [data.lender, 'Debt', 'BRL', 'Manual', user.id]
            );
            assetId = res.lastID;
        }

        const res = await run(
            `INSERT INTO ledger (date, type, asset_id, amount, currency, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [data.date, 'Liability', assetId, data.value_brl, 'BRL', data.obs || '', user.id]
        );

        return NextResponse.json({ success: true, id: res.lastID });
    } catch (e) {
        if (e instanceof Response) return e;
        console.error('POST Debt Error:', e);
        return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const user = await requireAuth();
        const body = await request.json();
        const { data, error } = validateBody(PutDebtSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        let assetId;
        const rows = await query('SELECT id FROM assets WHERE name = ? AND asset_class = ? AND user_id = ?', [data.lender, 'Debt', user.id]);

        if (rows.length > 0) {
            assetId = rows[0].id;
        } else {
            const res = await run(
                `INSERT INTO assets (name, asset_class, currency, broker, user_id) VALUES (?, ?, ?, ?, ?)`,
                [data.lender, 'Debt', 'BRL', 'Manual', user.id]
            );
            assetId = res.lastID;
        }

        await run(
            `UPDATE ledger SET date = ?, asset_id = ?, amount = ?, notes = ? WHERE id = ? AND user_id = ?`,
            [data.date, assetId, data.value_brl, data.obs, data.id, user.id]
        );

        return NextResponse.json({ success: true, id: data.id });
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
        const { id, error } = validateId(searchParams.get('id'));
        if (error) return NextResponse.json({ error }, { status: 400 });

        await run('DELETE FROM ledger WHERE id = ? AND user_id = ?', [id, user.id]);

        return NextResponse.json({ success: true });
    } catch (e) {
        if (e instanceof Response) return e;
        console.error('DELETE Debt Error:', e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
