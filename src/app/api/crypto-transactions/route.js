import { NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { requireAuth } from '@/lib/authGuard';

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

        let assetId;
        const existing = await query(
            `SELECT id FROM assets WHERE ticker = ? AND broker = ? AND user_id = ?`,
            [body.ticker, body.platform, user.id]
        );

        if (existing.length > 0) {
            assetId = existing[0].id;
        } else {
            const res = await run(
                `INSERT INTO assets (name, ticker, broker, asset_class, currency, allocation_bucket, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [body.asset || body.ticker, body.ticker, body.platform, 'Crypto', 'USD', 'Crypto', user.id]
            );
            assetId = res.lastID;
        }

        const amount = body.type === 'Buy' ? -Math.abs(body.investment) : Math.abs(body.investment);

        const res = await run(
            `INSERT INTO ledger (date, type, asset_id, quantity, price, amount, currency, notes, is_salary_contribution, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                body.date,
                body.type === 'Buy' ? 'Investment' : 'Divestment',
                assetId,
                body.quantity,
                0,
                amount,
                body.currency || 'USD',
                'API Input',
                body.isSalaryContribution ? 1 : 0,
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
        const { id, date, type, quantity, investment, currency, pnl } = body;

        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        const amount = (type === 'Buy' || type === 'Investment') ? -Math.abs(investment) : Math.abs(investment);
        const dbType = (type === 'Buy' || type === 'Investment') ? 'Investment' : 'Divestment';

        await run(
            `UPDATE ledger SET date = ?, type = ?, quantity = ?, amount = ?, price = ?, realized_pnl = ?, currency = ?, is_salary_contribution = ? WHERE id = ? AND user_id = ?`,
            [date, dbType, quantity, amount, body.costPerShare || 0, pnl || null, currency || 'USD', body.isSalaryContribution ? 1 : 0, id, user.id]
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
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        await run(`DELETE FROM ledger WHERE id = ? AND user_id = ?`, [id, user.id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('DELETE Error:', error);
        return NextResponse.json({ error: 'Failed to delete crypto transaction' }, { status: 500 });
    }
}
