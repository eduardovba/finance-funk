import { NextResponse } from 'next/server';
import { query, run } from '@/lib/db';

export async function GET() {
    try {
        const sql = `
      SELECT 
        l.id, l.date, l.type, 
        a.name as asset, a.broker, a.asset_class,
        l.amount, l.currency, l.notes
      FROM ledger l
      JOIN assets a ON l.asset_id = a.id
      ORDER BY l.date DESC
    `;
        const rows = await query(sql);

        const data = rows.map(r => ({
            id: r.id.toString(),
            date: r.date,
            description: r.asset + (r.notes ? ` - ${r.notes}` : ''),
            amount: r.amount,
            currency: r.currency,
            category: r.asset_class,
            type: r.type,
            raw_date: r.date
        }));

        return NextResponse.json(data);
    } catch (error) {
        console.error('Database Error:', error);
        return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();

        // Normalization
        const assetName = body.description || body.account || 'General Transaction';
        const currency = body.currency || 'GBP';
        const notes = body.notes || '';
        let amount = body.amount !== undefined ? body.amount : (body.investment || 0);
        let type = body.type || 'Investment';
        let category = body.category || (body.account ? 'Fixed Income' : 'Other');

        // If it's a pure interest payment from the FI form
        if (body.interest > 0 && (body.investment === 0 || body.investment === undefined)) {
            amount = body.interest;
            type = 'Interest';
        }

        let assetId;
        const rows = await query('SELECT id FROM assets WHERE name = ?', [assetName]);

        if (rows.length > 0) {
            assetId = rows[0].id;
        } else {
            const res = await run(
                `INSERT INTO assets (name, asset_class, currency, broker) VALUES (?, ?, ?, ?)`,
                [assetName, category, currency, 'Manual']
            );
            assetId = res.lastID;
        }

        const res = await run(
            `INSERT INTO ledger (date, type, asset_id, amount, currency, notes, quantity, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [body.date, type, assetId, amount, currency, notes, body.quantity || null, body.price || null]
        );

        return NextResponse.json({ success: true, id: res.lastID });
    } catch (e) {
        console.error('POST Error:', e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, type, investment, interest, amount } = body;

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        let finalAmount = amount !== undefined ? amount : (type === 'Interest' ? interest : investment);

        await run(
            `UPDATE ledger SET date = ?, type = ?, amount = ?, currency = ?, notes = ?, quantity = ?, price = ? WHERE id = ?`,
            [body.date, type || 'Investment', finalAmount, body.currency, body.notes || '', body.quantity || null, body.price || null, id]
        );

        return NextResponse.json({ success: true, id });
    } catch (e) {
        console.error('PUT Error:', e);
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
        console.error('DELETE Error:', e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
