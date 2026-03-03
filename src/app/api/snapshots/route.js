
import { NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { kvGet, kvSet } from '@/lib/kv';

const KEY = 'historical_snapshots';
export const dynamic = 'force-dynamic';

export async function GET() {
    const data = await kvGet(KEY, []);
    // Sort by month ascending
    data.sort((a, b) => a.month.localeCompare(b.month));
    return NextResponse.json(data);
}

export async function POST(request) {
    try {
        const newSnapshot = await request.json();

        // Validate required fields
        if (!newSnapshot.month || !newSnapshot.totalminuspensionsBRL) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        let data = await kvGet(KEY, []);

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

        await kvSet(KEY, data);

        // Also upsert into DB snapshots table so /api/history returns it
        try {
            const existing = await query('SELECT month FROM snapshots WHERE month = ?', [newSnapshot.month]);
            if (existing.length > 0) {
                await run('UPDATE snapshots SET content = ? WHERE month = ?', [JSON.stringify(newSnapshot), newSnapshot.month]);
            } else {
                await run('INSERT INTO snapshots (month, content) VALUES (?, ?)', [newSnapshot.month, JSON.stringify(newSnapshot)]);
            }
        } catch (dbErr) {
            console.error('Failed to sync snapshot to DB:', dbErr);
        }

        return NextResponse.json(newSnapshot);
    } catch (error) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month');

        if (!month) {
            return NextResponse.json({ error: 'Month parameter required' }, { status: 400 });
        }

        let data = await kvGet(KEY, []);
        const initialLength = data.length;
        data = data.filter(s => s.month !== month);

        if (data.length === initialLength) {
            return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
        }

        await kvSet(KEY, data);

        // Also remove from DB
        try {
            await run('DELETE FROM snapshots WHERE month = ?', [month]);
        } catch (dbErr) {
            console.error('Failed to delete snapshot from DB:', dbErr);
        }

        return NextResponse.json({ success: true, month });
    } catch (error) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
