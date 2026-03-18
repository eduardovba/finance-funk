import { NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { requireAuth } from '@/lib/authGuard';
import { z } from 'zod';
import { validateBody, validateId, dateField, currencyField, optionalNumber, optionalString } from '@/lib/validation';

const PostCryptoSchema = z.object({
    ticker: z.string().min(1).max(20),
    platform: z.string().min(1).max(100),
    asset: optionalString,
    date: dateField,
    type: z.enum(['Buy', 'Sell']),
    investment: z.coerce.number(),
    quantity: z.coerce.number(),
    currency: currencyField.default('USD'),
    isSalaryContribution: z.boolean().optional().default(false),
    pnl: optionalNumber,
    costPerShare: optionalNumber
});

const PutCryptoSchema = z.object({
    id: z.coerce.number(),
    date: dateField,
    type: z.enum(['Buy', 'Sell', 'Investment', 'Divestment']),
    quantity: z.coerce.number(),
    investment: z.coerce.number(),
    currency: currencyField.default('USD'),
    pnl: optionalNumber,
    costPerShare: optionalNumber,
    isSalaryContribution: z.boolean().optional().default(false)
});

export async function GET() {
    try {
        const user = await requireAuth();

        const sql = `
            SELECT 
                l.id, l.date, l.type, 
                a.name as asset, a.ticker, a.broker as platform, l.currency,
                l.quantity, l.amount,
                l.realized_pnl as pnl, l.realized_roi_percent as roiPercent,
                l.notes,
                l.is_salary_contribution
            FROM ledger l
            JOIN assets a ON l.asset_id = a.id
            WHERE a.asset_class = 'Crypto' AND a.sync_status = 'ACTIVE' AND l.user_id = ?
            ORDER BY l.date DESC
        `;
        const rows = await query(sql, [user.id]);

        const finalData = rows.map(r => ({
            id: r.id.toString(),
            date: r.date,
            asset: r.asset,
            ticker: r.ticker,
            broker: r.platform,
            platform: r.platform,
            currency: r.currency,
            quantity: r.quantity,
            investment: -r.amount,
            pnl: r.pnl,
            roiPercent: r.roiPercent,
            type: r.type === 'Investment' ? 'Buy' : (r.type === 'Divestment' ? 'Sell' : r.type),
            isSalaryContribution: r.is_salary_contribution === 1
        }));

        return NextResponse.json(finalData);
    } catch (e) {
        if (e instanceof Response) return e;
        console.error('Database Error:', e);
        return NextResponse.json({ error: 'Failed to fetch crypto transactions' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const user = await requireAuth();
        const body = await request.json();
        const { data, error } = validateBody(PostCryptoSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        let assetId;
        const existing = await query(
            `SELECT id FROM assets WHERE ticker = ? AND broker = ? AND user_id = ?`,
            [data.ticker, data.platform, user.id]
        );

        if (existing.length > 0) {
            assetId = existing[0].id;
        } else {
            const res = await run(
                `INSERT INTO assets (name, ticker, broker, asset_class, currency, allocation_bucket, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [data.asset || data.ticker, data.ticker, data.platform, 'Crypto', 'USD', 'Crypto', user.id]
            );
            assetId = res.lastID;
        }

        const amount = data.type === 'Buy' ? -Math.abs(data.investment) : Math.abs(data.investment);

        const res = await run(
            `INSERT INTO ledger (date, type, asset_id, quantity, price, amount, currency, notes, is_salary_contribution, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.date,
                data.type === 'Buy' ? 'Investment' : 'Divestment',
                assetId,
                data.quantity,
                0,
                amount,
                data.currency || 'USD',
                'API Input',
                data.isSalaryContribution ? 1 : 0,
                user.id
            ]
        );

        return NextResponse.json({ success: true, id: res.lastID });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('POST Error:', error);
        return NextResponse.json({ error: 'Failed to add crypto transaction' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const user = await requireAuth();
        const body = await request.json();
        const { data, error } = validateBody(PutCryptoSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        const amount = (data.type === 'Buy' || data.type === 'Investment') ? -Math.abs(data.investment) : Math.abs(data.investment);
        const dbType = (data.type === 'Buy' || data.type === 'Investment') ? 'Investment' : 'Divestment';

        await run(
            `UPDATE ledger SET date = ?, type = ?, quantity = ?, amount = ?, price = ?, realized_pnl = ?, currency = ?, is_salary_contribution = ? WHERE id = ? AND user_id = ?`,
            [data.date, dbType, data.quantity, amount, data.costPerShare || 0, data.pnl || null, data.currency || 'USD', data.isSalaryContribution ? 1 : 0, data.id, user.id]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('PUT Error:', error);
        return NextResponse.json({ error: 'Failed to update crypto transaction' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const user = await requireAuth();
        const { searchParams } = new URL(request.url);
        const { id, error } = validateId(searchParams.get('id'));
        if (error) return NextResponse.json({ error }, { status: 400 });

        await run(`DELETE FROM ledger WHERE id = ? AND user_id = ?`, [id, user.id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('DELETE Error:', error);
        return NextResponse.json({ error: 'Failed to delete crypto transaction' }, { status: 500 });
    }
}
