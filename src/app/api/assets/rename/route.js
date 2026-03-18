import { NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { requireAuth } from '@/lib/authGuard';
import { z } from 'zod';
import { validateBody, requiredString } from '@/lib/validation';

const PatchRenameSchema = z.object({
    oldName: requiredString,
    newName: requiredString,
    broker: requiredString,
    assetClass: requiredString
});

export async function PATCH(request) {
    try {
        const user = await requireAuth();
        const body = await request.json();
        const { data, error } = validateBody(PatchRenameSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        const { oldName, newName, broker, assetClass } = data;

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
