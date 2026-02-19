import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        // Fetch historical snapshots from 'snapshots' table
        // This table stores the full JSON objects from the legacy snapshots file.
        const rows = await query(`
            SELECT content FROM snapshots ORDER BY month ASC
        `);

        // Parse JSON content
        const data = rows.map(r => JSON.parse(r.content));

        return NextResponse.json(data);
    } catch (e) {
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }
}
