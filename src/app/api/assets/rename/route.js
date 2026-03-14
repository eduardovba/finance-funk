import { NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { requireAuth } from '@/lib/authGuard';

export async function PATCH(request) {
    try {
        const user = await requireAuth();
        const body = await request.json();
        const { oldName, newName, broker, assetClass } = body;

        if (!oldName || !newName || !broker || !assetClass) {
            return NextResponse.json({ error: 'Missing required fields: oldName, newName, broker, assetClass' }, { status: 400 });
        }

        if (oldName === newName) {
            return NextResponse.json({ success: true, message: 'No change needed' });
        }

        // Check if an asset with the new name already exists under the same broker
        const existing = await query(
            `SELECT id FROM assets WHERE name = ? AND broker = ? AND asset_class = ? AND user_id = ?`,
            [newName, broker, assetClass, user.id]
        );

        if (existing.length > 0) {
            return NextResponse.json({ error: `An asset named "${newName}" already exists under ${broker}` }, { status: 409 });
        }

        // Update the asset name (and ticker for Fixed Income where ticker = name)
        const result = await run(
            `UPDATE assets SET name = ?, ticker = CASE WHEN ticker = ? THEN ? ELSE ticker END WHERE name = ? AND broker = ? AND asset_class = ? AND user_id = ?`,
            [newName, oldName, newName, oldName, broker, assetClass, user.id]
        );

        if (result.changes === 0) {
            return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('Rename Asset Error:', error);
        return NextResponse.json({ error: 'Failed to rename asset' }, { status: 500 });
    }
}
