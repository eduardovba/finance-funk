import { NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { requireAuth } from '@/lib/authGuard';

export async function GET(request) {
    try {
        const user = await requireAuth();
        const { searchParams } = new URL(request.url);
        const assetClass = searchParams.get('assetClass');

        let sql = `
            SELECT id, name, currency, asset_class, created_at
            FROM brokers
            WHERE user_id = ?
        `;
        const params = [user.id];

        if (assetClass) {
            sql += ` AND (asset_class = ? OR asset_class IS NULL)`;
            params.push(assetClass);
        }

        sql += ` ORDER BY name ASC`;

        const rows = await query(sql, params);
        return NextResponse.json({ brokers: rows });
    } catch (e) {
        if (e instanceof Response) return e;
        console.error('Database Error:', e);
        // Note: Table might not exist yet if migrations haven't run
        if (e.message && e.message.includes('no such table')) {
            return NextResponse.json([]);
        }
        return NextResponse.json({ error: 'Failed to fetch brokers' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const user = await requireAuth();
        const body = await request.json();

        if (!body.name) {
            return NextResponse.json({ error: 'Broker name is required' }, { status: 400 });
        }

        const res = await run(
            `INSERT INTO brokers (name, currency, user_id, asset_class) VALUES (?, ?, ?, ?)`,
            [body.name.trim(), body.currency || 'USD', user.id, body.assetClass || null]
        );

        return NextResponse.json({ success: true, id: res.lastID, name: body.name.trim(), currency: body.currency || 'USD', assetClass: body.assetClass || null });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('POST Error:', error);

        if (error.message && error.message.includes('UNIQUE constraint failed')) {
            return NextResponse.json({ error: 'Broker already exists' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to add broker' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const user = await requireAuth();
        const { searchParams } = new URL(request.url);
        const name = searchParams.get('name');

        if (!name) {
            return NextResponse.json({ error: 'Broker name is required' }, { status: 400 });
        }

        await run(
            `DELETE FROM brokers WHERE name = ? AND user_id = ?`,
            [name.trim(), user.id]
        );

        return NextResponse.json({ success: true, deletedName: name.trim() });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('DELETE Error:', error);
        return NextResponse.json({ error: 'Failed to delete broker' }, { status: 500 });
    }
}
