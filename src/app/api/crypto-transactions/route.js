import { NextResponse } from 'next/server';
import { query, run } from '@/lib/db';

export async function GET() {
    try {
        const sql = `
            SELECT 
                l.id, l.date, l.type, 
                a.name as asset, a.ticker, a.broker as platform, l.currency,
                l.quantity, l.amount,
                l.notes,
                l.is_salary_contribution
            FROM ledger l
            JOIN assets a ON l.asset_id = a.id
            WHERE a.asset_class = 'Crypto' AND a.sync_status = 'ACTIVE'
            ORDER BY l.date DESC
        `;
        const rows = await query(sql);

        // Buy rows have a negative amount (cash outflow), so -amount is a positive cost.
        // Sell rows have a positive amount (cash inflow), so -amount is a negative value (proceeds).
        const finalData = rows.map(r => ({
            id: r.id.toString(),
            date: r.date,
            asset: r.asset,
            ticker: r.ticker,
            platform: r.platform,
            currency: r.currency,
            quantity: r.quantity,
            investment: -r.amount, // Consistent with Equity: positive = cost, negative = proceeds
            type: r.type === 'Investment' ? 'Buy' : (r.type === 'Divestment' ? 'Sell' : r.type),
            isSalaryContribution: r.is_salary_contribution === 1
        }));

        return NextResponse.json(finalData);
    } catch (e) {
        console.error('Database Error:', e);
        return NextResponse.json({ error: 'Failed to fetch crypto transactions' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        // { date, ticker, platform, quantity, investment, type, asset }

        // 1. Get/Create Asset
        let assetId;
        const existing = await query(
            `SELECT id FROM assets WHERE ticker = ? AND broker = ?`,
            [body.ticker, body.platform]
        );

        if (existing.length > 0) {
            assetId = existing[0].id;
        } else {
            const res = await run(
                `INSERT INTO assets (name, ticker, broker, asset_class, currency, allocation_bucket) VALUES (?, ?, ?, ?, ?, ?)`,
                [body.asset || body.ticker, body.ticker, body.platform, 'Crypto', 'USD', 'Crypto']
            );
            assetId = res.lastID;
        }

        // 2. Insert Ledger
        // Frontend sends investment as cost (positive for buy).
        // Ledger expects amount (negative for buy).
        const amount = body.type === 'Buy' ? -Math.abs(body.investment) : Math.abs(body.investment);

        const res = await run(
            `INSERT INTO ledger (date, type, asset_id, quantity, price, amount, currency, notes, is_salary_contribution) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                body.date,
                body.type === 'Buy' ? 'Investment' : 'Divestment',
                assetId,
                body.quantity,
                0, // Price derived
                amount,
                'USD',
                'API Input',
                body.isSalaryContribution ? 1 : 0
            ]
        );

        return NextResponse.json({ success: true, id: res.lastID });
    } catch (error) {
        console.error('POST Error:', error);
        return NextResponse.json({ error: 'Failed to add crypto transaction' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, date, type, quantity, investment } = body;

        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        // Frontend sends investment as positive cost (Buy) or negative proceeds (Sell).
        // Ledger stores amount as negative for Buy (outflow) and positive for Sell (inflow).
        const amount = type === 'Buy' ? -Math.abs(investment) : Math.abs(investment);
        const dbType = type === 'Buy' ? 'Investment' : 'Divestment';

        await run(
            `UPDATE ledger SET date = ?, type = ?, quantity = ?, amount = ?, is_salary_contribution = ? WHERE id = ?`,
            [date, dbType, quantity, amount, body.isSalaryContribution ? 1 : 0, id]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('PUT Error:', error);
        return NextResponse.json({ error: 'Failed to update crypto transaction' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        await run(`DELETE FROM ledger WHERE id = ?`, [id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE Error:', error);
        return NextResponse.json({ error: 'Failed to delete crypto transaction' }, { status: 500 });
    }
}
