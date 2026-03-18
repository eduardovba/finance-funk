import { NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { requireAuth } from '@/lib/authGuard';
import { z } from 'zod';
import { validateBody, validateId, dateField, currencyField, optionalNumber, optionalString } from '@/lib/validation';

const PostTransactionSchema = z.object({
    date: dateField,
    description: optionalString,
    account: optionalString,
    broker: optionalString,
    category: optionalString,
    type: z.string().optional().default('Investment'),
    amount: optionalNumber,
    investment: optionalNumber,
    interest: optionalNumber,
    currency: currencyField.default('GBP'),
    notes: optionalString,
    quantity: optionalNumber,
    price: optionalNumber,
    isSalaryContribution: z.boolean().optional().default(false),
    pnl: optionalNumber,
    roiPercent: optionalNumber
});

const PutTransactionSchema = z.object({
    id: z.coerce.number(),
    date: dateField,
    type: z.string().optional().default('Investment'),
    investment: optionalNumber,
    interest: optionalNumber,
    amount: optionalNumber,
    description: optionalString,
    account: optionalString,
    broker: optionalString,
    category: optionalString,
    currency: currencyField.default('GBP'),
    notes: optionalString,
    quantity: optionalNumber,
    price: optionalNumber,
    isSalaryContribution: z.boolean().optional().default(false),
    pnl: optionalNumber,
    roiPercent: optionalNumber,
    asset_id: optionalNumber
});

export async function GET() {
    try {
        const user = await requireAuth();
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
      WHERE a.sync_status = 'ACTIVE' AND l.user_id = ?
      ORDER BY l.date DESC
    `;
        const rows = await query(sql, [user.id]);

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
        if (error instanceof Response) return error;
        console.error('Database Error:', error);
        return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const user = await requireAuth();
        const body = await request.json();
        const { data, error } = validateBody(PostTransactionSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        // Normalization
        const assetName = data.description || data.account || 'General Transaction';
        const currency = data.currency || 'GBP';
        const notes = data.notes || '';
        let amount = data.amount !== undefined ? data.amount : (data.investment || 0);
        let type = data.type || 'Investment';
        let category = data.category || (data.account ? 'Fixed Income' : 'Other');

        // If it's a pure interest payment from the FI form
        if (data.interest > 0 && (data.investment === 0 || data.investment === undefined)) {
            amount = data.interest;
            type = 'Interest';
        }

        const broker = data.account || data.broker || 'Manual';
        let assetId;
        const rows = await query('SELECT id FROM assets WHERE name = ? AND broker = ? AND user_id = ?', [assetName, broker, user.id]);

        if (rows.length > 0) {
            assetId = rows[0].id;
        } else {
            const res = await run(
                `INSERT INTO assets (name, asset_class, currency, broker, user_id) VALUES (?, ?, ?, ?, ?)`,
                [assetName, category, currency, broker, user.id]
            );
            assetId = res.lastID;
        }

        const res = await run(
            `INSERT INTO ledger (date, type, asset_id, amount, currency, notes, quantity, price, is_salary_contribution, realized_pnl, realized_roi_percent, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [data.date, type, assetId, amount, currency, notes, data.quantity || null, data.price || null, data.isSalaryContribution ? 1 : 0, data.pnl || null, data.roiPercent || null, user.id]
        );

        return NextResponse.json({ success: true, id: res.lastID });
    } catch (e) {
        if (e instanceof Response) return e;
        console.error('POST Error:', e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const user = await requireAuth();
        const body = await request.json();
        const { data, error } = validateBody(PutTransactionSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        let finalAmount = data.amount !== undefined ? data.amount : (data.type === 'Interest' ? data.interest : data.investment);

        // Re-check asset if description or account is provided (for edits)
        let assetId = data.asset_id;
        if (data.description || data.account) {
            const assetName = data.description || data.account || 'General Transaction';
            const broker = data.account || data.broker || 'Manual';
            const cat = data.category || 'Fixed Income';

            const rows = await query('SELECT id FROM assets WHERE name = ? AND broker = ? AND user_id = ?', [assetName, broker, user.id]);
            if (rows.length > 0) {
                assetId = rows[0].id;
            } else {
                const res = await run(
                    `INSERT INTO assets (name, asset_class, currency, broker, user_id) VALUES (?, ?, ?, ?, ?)`,
                    [assetName, cat, data.currency || 'GBP', broker, user.id]
                );
                assetId = res.lastID;
            }
        }

        await run(
            `UPDATE ledger SET date = ?, type = ?, asset_id = ?, amount = ?, currency = ?, notes = ?, quantity = ?, price = ?, is_salary_contribution = ?, realized_pnl = ?, realized_roi_percent = ? WHERE id = ? AND user_id = ?`,
            [data.date, data.type || 'Investment', assetId, finalAmount, data.currency, data.notes || '', data.quantity || null, data.price || null, data.isSalaryContribution ? 1 : 0, data.pnl || null, data.roiPercent || null, data.id, user.id]
        );

        return NextResponse.json({ success: true, id: data.id });
    } catch (e) {
        if (e instanceof Response) return e;
        console.error('PUT Error:', e);
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
        console.error('DELETE Error:', e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
