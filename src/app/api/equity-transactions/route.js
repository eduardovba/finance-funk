import { NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { requireAuth } from '@/lib/authGuard';
import { z } from 'zod';
import { validateBody, validateId, dateField, currencyField, optionalNumber, optionalString } from '@/lib/validation';

const PostEquitySchema = z.object({
    ticker: z.string().min(1).max(20),
    broker: z.string().min(1).max(100),
    asset: optionalString,
    date: dateField,
    type: z.enum(['Buy', 'Sell']),
    investment: z.coerce.number(),
    quantity: z.coerce.number(),
    currency: currencyField.default('USD'),
    is_salary_contribution: z.boolean().optional().default(false),
    isSalaryContribution: z.boolean().optional().default(false),
    pnl: optionalNumber,
    roiPercent: optionalNumber,
    costPerShare: optionalNumber
});

const PutEquitySchema = z.object({
    id: z.coerce.number(),
    date: dateField,
    type: z.enum(['Buy', 'Sell', 'Investment', 'Divestment']),
    quantity: z.coerce.number(),
    investment: z.coerce.number(),
    costPerShare: optionalNumber,
    pnl: optionalNumber,
    roiPercent: optionalNumber,
    currency: currencyField.default('USD'),
    isSalaryContribution: z.boolean().optional().default(false)
});

export async function GET() {
    try {
        const user = await requireAuth();
        const sql = `
            SELECT 
                l.id, l.date, l.type, 
                a.name as asset, a.ticker, a.broker, a.currency,
                l.quantity, l.price as costPerShare, 
                -l.amount as investment, -- Frontend expects Inverted Ledger (Buy = Cost (+), Sell = Proceeds (-))
                l.realized_pnl as pnl,
                l.realized_roi_percent as roiPercent,
                l.currency as txCurrency,
                l.is_salary_contribution
            FROM ledger l
            JOIN assets a ON l.asset_id = a.id
            WHERE a.asset_class = 'Equity' AND a.sync_status = 'ACTIVE' AND l.user_id = ?
            ORDER BY l.date DESC
        `;

        const rows = await query(sql, [user.id]);

        // Transform to match frontend expected JSON format
        const data = rows.map(r => ({
            id: r.id.toString(),
            date: r.date,
            asset: r.asset,
            ticker: r.ticker,
            broker: r.broker,
            currency: r.currency,
            quantity: r.quantity,
            costPerShare: r.costPerShare,
            investment: r.investment,
            pnl: r.pnl,
            roiPercent: r.roiPercent !== null ? r.roiPercent : (
                (r.pnl && r.investment < 0) ? (r.pnl / (Math.abs(r.investment) - r.pnl) * 100) : null
            ),
            type: r.type === 'Investment' ? 'Buy' : (r.type === 'Divestment' ? 'Sell' : r.type),
            isSalaryContribution: r.is_salary_contribution === 1
        }));

        return NextResponse.json(data);
    } catch (e) {
        if (e instanceof Response) return e;
        console.error('Database Error:', e);
        return NextResponse.json({ error: 'Failed to fetch equity transactions' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const user = await requireAuth();
        const body = await request.json();
        const { data, error } = validateBody(PostEquitySchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        // 1. Get/Create Asset
        let assetId;
        const existing = await query(
            `SELECT id FROM assets WHERE ticker = ? AND broker = ? AND user_id = ?`,
            [data.ticker, data.broker, user.id]
        );

        if (existing.length > 0) {
            assetId = existing[0].id;
        } else {
            const res = await run(
                `INSERT INTO assets (name, ticker, broker, asset_class, currency, allocation_bucket, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [data.asset || data.ticker, data.ticker, data.broker, 'Equity', data.currency || 'USD', 'Equity', user.id]
            );
            assetId = res.lastID;
        }

        // 2. Insert Ledger
        const amount = data.type === 'Buy' ? -Math.abs(data.investment) : Math.abs(data.investment);
        const price = data.quantity ? Math.abs(data.investment / data.quantity) : 0;

        const res = await run(
            `INSERT INTO ledger (date, type, asset_id, quantity, price, amount, currency, notes, is_salary_contribution, realized_pnl, realized_roi_percent, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.date,
                data.type === 'Buy' ? 'Investment' : 'Divestment',
                assetId,
                data.quantity,
                price,
                amount,
                data.currency || 'USD',
                'API Input',
                data.is_salary_contribution ? 1 : (data.isSalaryContribution ? 1 : 0),
                data.pnl || null,
                data.roiPercent || null,
                user.id
            ]
        );

        return NextResponse.json({ success: true, id: res.lastID });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('POST Error:', error);
        return NextResponse.json({ error: 'Failed to add transaction' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const user = await requireAuth();
        const body = await request.json();
        const { data, error } = validateBody(PutEquitySchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        const amount = (data.type === 'Buy' || data.type === 'Investment') ? -Math.abs(data.investment) : Math.abs(data.investment);
        const dbType = (data.type === 'Buy' || data.type === 'Investment') ? 'Investment' : 'Divestment';

        await run(
            `UPDATE ledger SET date = ?, type = ?, quantity = ?, amount = ?, price = ?, realized_pnl = ?, realized_roi_percent = ?, currency = ?, is_salary_contribution = ? WHERE id = ? AND user_id = ?`,
            [data.date, dbType, data.quantity, amount, data.costPerShare, data.pnl, data.roiPercent, data.currency || 'USD', data.isSalaryContribution ? 1 : 0, data.id, user.id]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('PUT Error:', error);
        return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
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
        return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
    }
}
