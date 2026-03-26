import { NextRequest, NextResponse } from 'next/server';
import { query, run, batch } from '@/lib/db';
import { requireAuth } from '@/lib/authGuard';
import { z } from 'zod';
import { validateBody, validateId, dateField, monthField, currencyField } from '@/lib/validation';
import { buildRollupStatements } from '@/lib/budgetRollup';
import type { BudgetTransaction } from '@/types';

// ═══════════ Zod schemas ═══════════

const CreateTransactionSchema = z.object({
    category_id: z.coerce.number().int().optional().nullable(),
    amount_cents: z.coerce.number().int(),
    currency: currencyField.default('BRL'),
    description: z.string().optional().nullable(),
    date: dateField,                                      // enforced YYYY-MM-DD via regex
    is_recurring: z.boolean().default(false),
});

type CreateTransactionBody = z.infer<typeof CreateTransactionSchema>;

// ═══════════ Helpers ═══════════

/** Derive YYYY-MM from a YYYY-MM-DD date string */
function toMonth(dateStr: string): string {
    return dateStr.slice(0, 7);
}

// ═══════════ GET ═══════════

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month'); // optional YYYY-MM filter

        let rows: BudgetTransaction[];
        if (month) {
            rows = await query<BudgetTransaction>(
                `SELECT * FROM budget_transactions
                 WHERE user_id = ? AND strftime('%Y-%m', date) = ?
                 ORDER BY date DESC`,
                [user.id, month]
            );
        } else {
            rows = await query<BudgetTransaction>(
                'SELECT * FROM budget_transactions WHERE user_id = ? ORDER BY date DESC',
                [user.id]
            );
        }

        return NextResponse.json(rows);
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Budget transactions GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }
}

// ═══════════ POST ═══════════

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const body: unknown = await request.json();
        const { data, error } = validateBody<CreateTransactionBody>(CreateTransactionSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        const month = toMonth(data!.date);

        // Insert transaction + recalculate rollup — all in one ACID batch
        const insertStmt = {
            sql: `INSERT INTO budget_transactions (user_id, category_id, amount_cents, currency, description, date, is_recurring)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [
                user.id,
                data!.category_id ?? null,
                data!.amount_cents,
                data!.currency,
                data!.description ?? null,
                data!.date,
                data!.is_recurring ? 1 : 0,
            ],
        };

        await batch([insertStmt, ...buildRollupStatements(user.id, month)]);

        // Fetch the newly inserted row's id
        const inserted = await query<{ id: number }>(
            'SELECT id FROM budget_transactions WHERE user_id = ? ORDER BY id DESC LIMIT 1',
            [user.id]
        );

        return NextResponse.json({ success: true, id: inserted[0]?.id ?? 0 });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Budget transactions POST error:', error);
        return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
    }
}

// ═══════════ PATCH (update single transaction) ═══════════

const UpdateTransactionSchema = z.object({
    id: z.coerce.number().int().positive(),
    category_id: z.coerce.number().int().optional().nullable(),
    amount_cents: z.coerce.number().int().optional(),
    currency: currencyField.optional(),
    description: z.string().optional().nullable(),
    date: dateField.optional(),
    source: z.string().optional().nullable(),
});

export async function PATCH(request: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const body: unknown = await request.json();
        const parsed = UpdateTransactionSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
        }
        const data = parsed.data;

        // Fetch existing transaction to know old month
        const existing = await query<BudgetTransaction>(
            'SELECT * FROM budget_transactions WHERE id = ? AND user_id = ?',
            [data.id, user.id]
        );
        if (existing.length === 0) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        }

        const oldMonth = toMonth(existing[0].date);
        const newDate = data.date ?? existing[0].date;
        const newMonth = toMonth(newDate);

        // Build SET clause dynamically from provided fields
        const setClauses: string[] = [];
        const setArgs: (string | number | null)[] = [];

        if (data.category_id !== undefined) { setClauses.push('category_id = ?'); setArgs.push(data.category_id); }
        if (data.amount_cents !== undefined) { setClauses.push('amount_cents = ?'); setArgs.push(data.amount_cents); }
        if (data.currency !== undefined) { setClauses.push('currency = ?'); setArgs.push(data.currency); }
        if (data.description !== undefined) { setClauses.push('description = ?'); setArgs.push(data.description); }
        if (data.date !== undefined) { setClauses.push('date = ?'); setArgs.push(data.date); }
        if (data.source !== undefined) { setClauses.push('source = ?'); setArgs.push(data.source); }

        if (setClauses.length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        const updateStmt = {
            sql: `UPDATE budget_transactions SET ${setClauses.join(', ')} WHERE id = ? AND user_id = ?`,
            args: [...setArgs, data.id, user.id],
        };

        // Recalculate rollups for affected months
        const rollupStmts = buildRollupStatements(user.id, newMonth);
        if (oldMonth !== newMonth) {
            rollupStmts.push(...buildRollupStatements(user.id, oldMonth));
        }

        await batch([updateStmt, ...rollupStmts]);

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Budget transactions PATCH error:', error);
        return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
    }
}

// ═══════════ DELETE ═══════════

export async function DELETE(request: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const { searchParams } = new URL(request.url);
        const { id, error } = validateId(searchParams.get('id'));
        if (error) return NextResponse.json({ error }, { status: 400 });

        // Look up the transaction so we know which month's rollup to recalculate
        const existing = await query<{ date: string }>(
            'SELECT date FROM budget_transactions WHERE id = ? AND user_id = ?',
            [id, user.id]
        );

        if (existing.length === 0) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        }

        const month = toMonth(existing[0].date);

        // Delete + recalculate rollup — all in one ACID batch
        const deleteStmt = {
            sql: 'DELETE FROM budget_transactions WHERE id = ? AND user_id = ?',
            args: [id!, user.id],
        };

        await batch([deleteStmt, ...buildRollupStatements(user.id, month)]);

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Budget transactions DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
    }
}
