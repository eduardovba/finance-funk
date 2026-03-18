
import { NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { kvGet, kvSet } from '@/lib/kv';
import { requireAuth } from '@/lib/authGuard';
import { z } from 'zod';
import { validateBody } from '@/lib/validation';

const KEY = 'historical_snapshots';
export const dynamic = 'force-dynamic';

const PostSnapshotSchema = z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM format'),
    totalminuspensionsBRL: z.coerce.number(),
    totalminuspensionsGBP: z.coerce.number().optional(),
    totalWithPensionsBRL: z.coerce.number().optional(),
    totalWithPensionsGBP: z.coerce.number().optional(),
    equityBRL: z.coerce.number().optional(),
    cryptoBRL: z.coerce.number().optional(),
    fixedIncomeBRL: z.coerce.number().optional(),
    realEstateBRL: z.coerce.number().optional(),
    pensionsBRL: z.coerce.number().optional(),
    debtBRL: z.coerce.number().optional(),
    fxRate: z.coerce.number().optional()
}).passthrough(); // Allow additional fields for forward compatibility

export async function GET() {
    try {
        const user = await requireAuth();
        const data = await kvGet(KEY, [], user.id);
        // Sort by month ascending
        data.sort((a, b) => a.month.localeCompare(b.month));
        return NextResponse.json(data);
    } catch (error) {
        if (error instanceof Response) return error;
        return NextResponse.json({ error: 'Failed to fetch snapshots' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const user = await requireAuth();
        const body = await request.json();
        const { data: newSnapshot, error } = validateBody(PostSnapshotSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        let data = await kvGet(KEY, [], user.id);

        // Check if snapshot for this month already exists
        const existingIndex = data.findIndex(s => s.month === newSnapshot.month);

        if (existingIndex >= 0) {
            // Overwrite existing
            data[existingIndex] = newSnapshot;
        } else {
            // Add new
            data.push(newSnapshot);
        }

        // Sort by month
        data.sort((a, b) => a.month.localeCompare(b.month));

        await kvSet(KEY, data, user.id);

        // Also upsert into DB snapshots table so /api/history returns it
        try {
            const existing = await query('SELECT month FROM snapshots WHERE month = ? AND user_id = ?', [newSnapshot.month, user.id]);
            if (existing.length > 0) {
                await run('UPDATE snapshots SET content = ? WHERE month = ? AND user_id = ?', [JSON.stringify(newSnapshot), newSnapshot.month, user.id]);
            } else {
                await run('INSERT INTO snapshots (month, content, user_id) VALUES (?, ?, ?)', [newSnapshot.month, JSON.stringify(newSnapshot), user.id]);
            }
        } catch (dbErr) {
            console.error('Failed to sync snapshot to DB:', dbErr);
        }

        return NextResponse.json(newSnapshot);
    } catch (error) {
        if (error instanceof Response) return error;
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}

export async function DELETE(request) {
    try {
        const user = await requireAuth();
        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month');

        if (!month) {
            return NextResponse.json({ error: 'Month parameter required' }, { status: 400 });
        }

        let data = await kvGet(KEY, [], user.id);
        const initialLength = data.length;
        data = data.filter(s => s.month !== month);

        if (data.length === initialLength) {
            return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
        }

        await kvSet(KEY, data, user.id);

        // Also remove from DB
        try {
            await run('DELETE FROM snapshots WHERE month = ? AND user_id = ?', [month, user.id]);
        } catch (dbErr) {
            console.error('Failed to delete snapshot from DB:', dbErr);
        }

        return NextResponse.json({ success: true, month });
    } catch (error) {
        if (error instanceof Response) return error;
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
