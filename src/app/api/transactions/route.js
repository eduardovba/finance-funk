import { NextResponse } from 'next/server';
import { query, run } from '@/lib/db';

export async function GET() {
    try {
        const sql = `
      SELECT 
        l.id, l.date, l.type, 
        a.name as asset, a.broker, a.asset_class,
        l.amount, l.currency, l.notes,
        l.is_salary_contribution,
        l.realized_pnl, l.realized_roi_percent,
        l.quantity, l.price
      FROM ledger l
      JOIN assets a ON l.asset_id = a.id
      WHERE a.sync_status = 'ACTIVE'
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
            raw_date: r.date,
            isSalaryContribution: r.is_salary_contribution === 1,
            pnl: r.realized_pnl,
            roiPercent: r.realized_roi_percent !== null ? r.realized_roi_percent : (
                (r.asset_class === 'Pension' && r.type === 'Sell' && r.amount > 0 && r.quantity > 0 && r.price > 0)
                    ? (() => {
                        const proceeds = r.amount;
                        const pnl = r.realized_pnl || 0;
                        const cost = proceeds - pnl;
                        return cost > 0 ? (pnl / cost) * 100 : null;
                    })()
                    : null
            ),
            quantity: r.quantity,
            price: r.price
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

        const broker = body.account || body.broker || 'Manual';
        let assetId;
        const rows = await query('SELECT id FROM assets WHERE name = ? AND broker = ?', [assetName, broker]);

        if (rows.length > 0) {
            assetId = rows[0].id;
        } else {
            const res = await run(
                `INSERT INTO assets (name, asset_class, currency, broker) VALUES (?, ?, ?, ?)`,
                [assetName, category, currency, broker]
            );
            assetId = res.lastID;
        }

        const res = await run(
            `INSERT INTO ledger (date, type, asset_id, amount, currency, notes, quantity, price, is_salary_contribution, realized_pnl, realized_roi_percent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [body.date, type, assetId, amount, currency, notes, body.quantity || null, body.price || null, body.isSalaryContribution ? 1 : 0, body.pnl || null, body.roiPercent || null]
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
        const { id, type, investment, interest, amount, description, account, category, currency } = body;
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        let finalAmount = amount !== undefined ? amount : (type === 'Interest' ? interest : investment);

        // Re-check asset if description or account is provided (for edits)
        let assetId = body.asset_id;
        if (description || account) {
            const assetName = description || account || 'General Transaction';
            const broker = account || body.broker || 'Manual';
            const cat = category || 'Fixed Income';

            const rows = await query('SELECT id FROM assets WHERE name = ? AND broker = ?', [assetName, broker]);
            if (rows.length > 0) {
                assetId = rows[0].id;
            } else {
                const res = await run(
                    `INSERT INTO assets (name, asset_class, currency, broker) VALUES (?, ?, ?, ?)`,
                    [assetName, cat, currency || 'GBP', broker]
                );
                assetId = res.lastID;
            }
        }

        await run(
            `UPDATE ledger SET date = ?, type = ?, asset_id = ?, amount = ?, currency = ?, notes = ?, quantity = ?, price = ?, is_salary_contribution = ?, realized_pnl = ?, realized_roi_percent = ? WHERE id = ?`,
            [body.date, type || 'Investment', assetId, finalAmount, body.currency, body.notes || '', body.quantity || null, body.price || null, body.isSalaryContribution ? 1 : 0, body.pnl || null, body.roiPercent || null, id]
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
