import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { kvGet } from '@/lib/kv';
import { requireAuth } from '@/lib/authGuard';

export async function GET(): Promise<NextResponse> {
    try {
        const user = await requireAuth();

        // 1. Primary source: DB snapshots table
        let dbSnapshots = [];
        try {
            const rows = await query(`
                SELECT content FROM snapshots WHERE user_id = ? ORDER BY month ASC
            `, [user.id]);
            dbSnapshots = rows.map((r: any) => JSON.parse(r.content));
        } catch (dbErr) {
            console.error('Failed to read snapshots from DB:', dbErr);
        }

        // 2. Fallback source: kv_store
        let kvSnapshots = [];
        try {
            kvSnapshots = await kvGet<any[]>('historical_snapshots', [], user.id) || [];
        } catch (kvErr) {
            console.error('Failed to read snapshots from kv_store:', kvErr);
        }

        // 3. Merge: DB takes precedence, kv fills gaps
        const merged = new Map();
        kvSnapshots.forEach(s => {
            if (s.month) merged.set(s.month, s);
        });
        dbSnapshots.forEach(s => {
            if (s.month) merged.set(s.month, s); // DB overwrites
        });

        const data = Array.from(merged.values()).sort((a, b) => a.month.localeCompare(b.month));

        return NextResponse.json(data);
    } catch (e) {
        if (e instanceof Response) return e as unknown as NextResponse;
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }
}
