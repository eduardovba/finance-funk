import { NextResponse } from 'next/server';
import { query, run } from '@/lib/db';

export async function GET() {
    try {
        const sql = `
            SELECT 
                l.id, l.date, l.type, 
                a.name as asset, a.ticker, a.broker as platform, l.currency,
                l.quantity, ABS(l.amount) as investment, -- Crypto JSON used positive for investment usually
                l.notes
            FROM ledger l
            JOIN assets a ON l.asset_id = a.id
            WHERE a.asset_class = 'Crypto'
            ORDER BY l.date DESC
        `;
        const rows = await query(sql);

        const data = rows.map(r => ({
            id: r.id.toString(),
            date: r.date,
            asset: r.asset,
            ticker: r.ticker,
            platform: r.platform,
            currency: r.currency,
            quantity: r.quantity,
            investment: r.type === 'Sell' || r.type === 'Divestment' ? r.investment : -r.investment, // Invert back for frontend if needed? Or check frontend logic.
            // Wait, standardizing on: Buy=Positive Cost, Sell=Negative Cost (Proceeds) or Vice Versa?
            // In Equity we did: Buy = -Amount (Cost). API returns -Amount as "investment".
            // Let's stick to that.
            // If Ledger Amount is negative (outflow), -Amount is positive cost.
            type: r.type === 'Investment' ? 'Buy' : (r.type === 'Divestment' ? 'Sell' : r.type)
        }));

        // Adjust for "investment" field expected by frontend
        // If row.investment above is ABS(amount), then:
        // Buy (Amount < 0) -> Investment = -Amount (Positive)
        // Sell (Amount > 0) -> Investment = -Amount (Negative)
        // Logic:
        const finalData = rows.map(r => ({
            id: r.id.toString(),
            date: r.date,
            asset: r.asset,
            ticker: r.ticker,
            platform: r.platform,
            currency: r.currency,
            quantity: r.quantity,
            investment: -r.amount, // Consistent with Equity
            type: r.type === 'Investment' ? 'Buy' : (r.type === 'Divestment' ? 'Sell' : r.type)
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
            `INSERT INTO ledger (date, type, asset_id, quantity, price, amount, currency, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                body.date,
                body.type === 'Buy' ? 'Investment' : 'Divestment',
                assetId,
                body.quantity,
                0, // Price derived
                amount,
                'USD',
                'API Input'
            ]
        );

        return NextResponse.json({ success: true, id: res.lastID });
    } catch (error) {
        console.error('POST Error:', error);
        return NextResponse.json({ error: 'Failed to add crypto transaction' }, { status: 500 });
    }
}
