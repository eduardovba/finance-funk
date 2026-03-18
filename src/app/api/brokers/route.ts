import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { requireAuth } from '@/lib/authGuard';
import { z } from 'zod';
import { validateBody } from '@/lib/validation';

const PostBrokerSchema = z.object({
    name: z.string().min(1, 'Broker name is required').max(100),
    currency: z.string().optional().default('USD'),
    assetClass: z.string().optional().nullable()
});

export async function GET(request: NextRequest): Promise<NextResponse> {
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
        if (e instanceof Response) return e as unknown as NextResponse;
        console.error('Database Error:', e);
        // Note: Table might not exist yet if migrations haven't run
        if ((e as Error).message && (e as Error).message.includes('no such table')) {
            return NextResponse.json([]);
        }
        return NextResponse.json({ error: 'Failed to fetch brokers' }, { status: 500 });
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const body: unknown = await request.json();
        const { data, error } = validateBody(PostBrokerSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        const res = await run(
            `INSERT INTO brokers (name, currency, user_id, asset_class) VALUES (?, ?, ?, ?)`,
            [data!.name.trim(), data!.currency || 'USD', user.id, data!.assetClass || null]
        );

        return NextResponse.json({ success: true, id: res.lastID, name: data!.name.trim(), currency: data!.currency || 'USD', assetClass: data!.assetClass || null });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('POST Error:', error);

        if ((error as Error).message && (error as Error).message.includes('UNIQUE constraint failed')) {
            return NextResponse.json({ error: 'Broker already exists' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to add broker' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
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
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('DELETE Error:', error);
        return NextResponse.json({ error: 'Failed to delete broker' }, { status: 500 });
    }
}
