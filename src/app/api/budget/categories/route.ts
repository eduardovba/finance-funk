import { NextRequest, NextResponse } from 'next/server';
import { query, run, batch } from '@/lib/db';
import { requireAuth } from '@/lib/authGuard';
import { z } from 'zod';
import { validateBody, validateId } from '@/lib/validation';
import type { BudgetCategory } from '@/types';

// ═══════════ Zod schemas ═══════════

const CreateCategorySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    icon: z.string().optional().nullable(),
    color: z.string().optional().nullable(),
    monthly_target_cents: z.coerce.number().int().min(0).default(0),
    parent_id: z.coerce.number().int().optional().nullable(),
    sort_order: z.coerce.number().int().default(0),
    is_income: z.boolean().default(false),
});

type CreateCategoryBody = z.infer<typeof CreateCategorySchema>;

const UpdateCategorySchema = z.object({
    id: z.coerce.number().int(),
    name: z.string().min(1, 'Name is required'),
    icon: z.string().optional().nullable(),
    color: z.string().optional().nullable(),
    monthly_target_cents: z.coerce.number().int().min(0).default(0),
    parent_id: z.coerce.number().int().optional().nullable(),
    sort_order: z.coerce.number().int().default(0),
    is_income: z.boolean().default(false),
});

type UpdateCategoryBody = z.infer<typeof UpdateCategorySchema>;

// ═══════════ GET ═══════════

export async function GET(): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const rows = await query<BudgetCategory>(
            'SELECT * FROM budget_categories WHERE user_id = ? ORDER BY sort_order ASC, name ASC',
            [user.id]
        );
        return NextResponse.json(rows);
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Budget categories GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }
}

// ═══════════ POST ═══════════

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const body: unknown = await request.json();
        const { data, error } = validateBody<CreateCategoryBody>(CreateCategorySchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        const res = await run(
            `INSERT INTO budget_categories (user_id, name, icon, color, monthly_target_cents, parent_id, sort_order, is_income)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                user.id,
                data!.name,
                data!.icon ?? null,
                data!.color ?? null,
                data!.monthly_target_cents,
                data!.parent_id ?? null,
                data!.sort_order,
                data!.is_income ? 1 : 0,
            ]
        );

        return NextResponse.json({ success: true, id: res.lastID });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Budget categories POST error:', error);
        return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
    }
}

// ═══════════ PUT ═══════════

export async function PUT(request: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const body: unknown = await request.json();
        const { data, error } = validateBody<UpdateCategoryBody>(UpdateCategorySchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        // Ownership check: only update if this category belongs to the user
        await run(
            `UPDATE budget_categories
             SET name = ?, icon = ?, color = ?, monthly_target_cents = ?, parent_id = ?, sort_order = ?, is_income = ?
             WHERE id = ? AND user_id = ?`,
            [
                data!.name,
                data!.icon ?? null,
                data!.color ?? null,
                data!.monthly_target_cents,
                data!.parent_id ?? null,
                data!.sort_order,
                data!.is_income ? 1 : 0,
                data!.id,
                user.id,
            ]
        );

        return NextResponse.json({ success: true, id: data!.id });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Budget categories PUT error:', error);
        return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
    }
}

// ═══════════ DELETE ═══════════

export async function DELETE(request: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const { searchParams } = new URL(request.url);
        const { id, error } = validateId(searchParams.get('id'));
        if (error) return NextResponse.json({ error }, { status: 400 });

        // Ownership-scoped delete
        await run('DELETE FROM budget_categories WHERE id = ? AND user_id = ?', [id, user.id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Budget categories DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
    }
}

// ═══════════ PATCH (batch reorder) ═══════════

const ReorderSchema = z.object({
    items: z.array(z.object({
        id: z.coerce.number().int(),
        sort_order: z.coerce.number().int(),
    })).min(1),
});

type ReorderBody = z.infer<typeof ReorderSchema>;

export async function PATCH(request: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const body: unknown = await request.json();
        const { data, error } = validateBody<ReorderBody>(ReorderSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        // Build batch UPDATE statements — one per item, all in a single ACID transaction
        const statements = data!.items.map(item => ({
            sql: 'UPDATE budget_categories SET sort_order = ? WHERE id = ? AND user_id = ?',
            args: [item.sort_order, item.id, user.id] as [number, number, string],
        }));

        await batch(statements);

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Budget categories PATCH reorder error:', error);
        return NextResponse.json({ error: 'Failed to reorder categories' }, { status: 500 });
    }
}
