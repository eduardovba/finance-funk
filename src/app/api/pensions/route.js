import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const sql = `
            SELECT 
                l.id, l.date, l.type, 
                a.name as asset, a.broker, a.allocation_bucket,
                l.quantity, l.price, l.amount
            FROM ledger l
            JOIN assets a ON l.asset_id = a.id
            WHERE a.asset_class = 'Pension'
            ORDER BY l.date DESC
        `;
        const rows = await query(sql);

        const data = rows.map(r => ({
            id: r.id.toString(),
            date: r.date,
            asset: r.asset,
            broker: r.broker,
            allocationClass: r.allocation_bucket,
            quantity: r.quantity,
            price: r.price,
            value: Math.abs(r.amount), // Pension JSON 'value' usually positive
            type: r.type === 'Investment' ? 'Buy' : (r.type === 'Divestment' ? 'Sell' : r.type)
        }));

        return NextResponse.json(data);
    } catch (e) {
        return NextResponse.json({ error: 'Failed to fetch pensions' }, { status: 500 });
    }
}
