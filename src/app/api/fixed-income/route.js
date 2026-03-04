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
                l.amount, l.notes, l.quantity,
                l.is_salary_contribution
            FROM ledger l
            JOIN assets a ON l.asset_id = a.id
            WHERE a.asset_class = 'Fixed Income' AND a.sync_status = 'ACTIVE' AND l.user_id = ?
            ORDER BY l.date DESC
        `;
        const rows = await query(sql, [user.id]);

        const data = rows.map(r => {
            const finalType = r.type === 'Divestment' ? 'Withdrawal' : r.type;
            let investment = finalType === 'Interest' ? 0 : r.amount;
            if (finalType === 'Withdrawal' && investment > 0) {
                investment = -investment;
            }

            return {
                id: r.id.toString(),
                date: r.date,
                asset: r.asset,
                ticker: r.ticker,
                broker: r.broker,
                currency: r.currency,
                investment,
                interest: finalType === 'Interest' ? r.amount : 0,
                quantity: r.quantity,
                notes: r.notes,
                isSalaryContribution: r.is_salary_contribution === 1,
                type: finalType
            };
        });

        return NextResponse.json(data);
    } catch (e) {
        if (e instanceof Response) return e;
        console.error('Database Error:', e);
        return NextResponse.json({ error: 'Failed to fetch fixed income' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const user = await requireAuth();
        const body = await request.json();

        // 1. Get/Create Asset
        let assetId;
        const existing = await query(
            `SELECT id FROM assets WHERE name = ? AND broker = ? AND asset_class = 'Fixed Income' AND user_id = ?`,
            [body.asset, body.broker, user.id]
        );

        if (existing.length > 0) {
            assetId = existing[0].id;
        } else {
            const res = await run(
                `INSERT INTO assets (name, ticker, broker, asset_class, currency, allocation_bucket, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [body.asset, body.asset, body.broker, 'Fixed Income', body.currency || 'BRL', 'Fixed Income', user.id]
            );
            assetId = res.lastID;
        }

        // 2. Insert Ledger
        let amount = body.type === 'Interest' ? Math.abs(body.interest) : Math.abs(body.investment);
        const finalType = body.type === 'Divestment' ? 'Withdrawal' : (body.type || 'Investment');

        if (finalType === 'Withdrawal') {
            amount = -Math.abs(amount);
        }

        const res = await run(
            `INSERT INTO ledger (date, type, asset_id, amount, currency, notes, is_salary_contribution, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                body.date,
                finalType,
                assetId,
                amount,
                body.currency || 'BRL',
                body.notes || 'Manual Entry',
                body.isSalaryContribution ? 1 : 0,
                user.id
            ]
        );

        return NextResponse.json({ success: true, id: res.lastID });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('POST Error:', error);
        return NextResponse.json({ error: 'Failed to add fixed income transaction' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const user = await requireAuth();
        const body = await request.json();
        const { id, date, type, investment, interest, notes, isSalaryContribution, currency } = body;

        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        let amount = type === 'Interest' ? Math.abs(interest) : Math.abs(investment);
        const finalType = type === 'Divestment' ? 'Withdrawal' : type;

        if (finalType === 'Withdrawal') {
            amount = -Math.abs(amount);
        }

        await run(
            `UPDATE ledger SET date = ?, type = ?, amount = ?, notes = ?, is_salary_contribution = ?, currency = ? WHERE id = ? AND user_id = ?`,
            [date, finalType, amount, notes, isSalaryContribution ? 1 : 0, currency || 'BRL', id, user.id]
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
