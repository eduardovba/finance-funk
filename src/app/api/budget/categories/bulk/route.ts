import { NextRequest, NextResponse } from 'next/server';
import { batch } from '@/lib/db';
import { requireAuth } from '@/lib/authGuard';
import { z } from 'zod';
import { validateBody } from '@/lib/validation';

const BulkUpdateSchema = z.object({
    items: z.array(z.object({
        id: z.coerce.number().int(),
        monthly_target_cents: z.coerce.number().int().min(0),
    })).min(1),
});

type BulkUpdateBody = z.infer<typeof BulkUpdateSchema>;

export async function PATCH(request: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const body: unknown = await request.json();
        const { data, error } = validateBody<BulkUpdateBody>(BulkUpdateSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        // Build batch UPDATE statements
        const statements = data!.items.map(item => ({
            sql: 'UPDATE budget_categories SET monthly_target_cents = ? WHERE id = ? AND user_id = ?',
            args: [item.monthly_target_cents, item.id, user.id] as [number, number, string],
        }));

        await batch(statements);

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Budget categories bulk update error:', error);
        return NextResponse.json({ error: 'Failed to update categories' }, { status: 500 });
    }
}
