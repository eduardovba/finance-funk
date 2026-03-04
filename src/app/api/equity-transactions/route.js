import { NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { requireAuth } from '@/lib/authGuard';

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

        // 1. Get/Create Asset
        let assetId;
        const existing = await query(
            `SELECT id FROM assets WHERE ticker = ? AND broker = ? AND user_id = ?`,
            [body.ticker, body.broker, user.id]
        );

        if (existing.length > 0) {
            assetId = existing[0].id;
        } else {
            const res = await run(
                `INSERT INTO assets (name, ticker, broker, asset_class, currency, allocation_bucket, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [body.asset || body.ticker, body.ticker, body.broker, 'Equity', body.currency || 'USD', 'Equity', user.id]
            );
            assetId = res.lastID;
        }

        // 2. Insert Ledger
        const amount = body.type === 'Buy' ? -Math.abs(body.investment) : Math.abs(body.investment);
        const price = body.quantity ? Math.abs(body.investment / body.quantity) : 0;

        const res = await run(
            `INSERT INTO ledger (date, type, asset_id, quantity, price, amount, currency, notes, is_salary_contribution, realized_pnl, realized_roi_percent, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                body.date,
                body.type === 'Buy' ? 'Investment' : 'Divestment',
                assetId,
                body.quantity,
                price,
                amount,
                body.currency || 'USD',
                'API Input',
                body.is_salary_contribution ? 1 : (body.isSalaryContribution ? 1 : 0),
                body.pnl || null,
                body.roiPercent || null,
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
        const { id, date, type, quantity, investment, costPerShare, pnl, currency } = body;

        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        const amount = (type === 'Buy' || type === 'Investment') ? -Math.abs(investment) : Math.abs(investment);
        const dbType = (type === 'Buy' || type === 'Investment') ? 'Investment' : 'Divestment';

        await run(
            `UPDATE ledger SET date = ?, type = ?, quantity = ?, amount = ?, price = ?, realized_pnl = ?, realized_roi_percent = ?, currency = ?, is_salary_contribution = ? WHERE id = ? AND user_id = ?`,
            [date, dbType, quantity, amount, costPerShare, pnl, body.roiPercent, currency || 'USD', body.isSalaryContribution ? 1 : 0, id, user.id]
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
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        await run(`DELETE FROM ledger WHERE id = ? AND user_id = ?`, [id, user.id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('DELETE Error:', error);
        return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
    }
}
