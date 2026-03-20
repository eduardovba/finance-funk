import { NextRequest, NextResponse } from 'next/server';
import { query, run, batch } from '@/lib/db';
import { requireAuth } from '@/lib/authGuard';
import { z } from 'zod';
import { validateBody, validateId, dateField, monthField, currencyField } from '@/lib/validation';
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

/**
 * Build the three batch statements that recalculate a month's rollup row.
 * Called after INSERT or DELETE to keep rollups consistent with the source data.
 */
function buildRollupStatements(userId: string, month: string) {
    return [
        // 1. Ensure the rollup row exists
        {
            sql: `INSERT OR IGNORE INTO budget_monthly_rollups (user_id, month, total_income_cents, total_expenses_cents, total_savings_cents, savings_rate_basis_points)
                  VALUES (?, ?, 0, 0, 0, 0)`,
            args: [userId, month],
        },
        // 2. Recalculate income
        {
            sql: `UPDATE budget_monthly_rollups
                  SET total_income_cents = (
                      SELECT COALESCE(SUM(bt.amount_cents), 0)
                      FROM budget_transactions bt
                      JOIN budget_categories bc ON bt.category_id = bc.id
                      WHERE bc.is_income = 1 AND bt.user_id = ? AND strftime('%Y-%m', bt.date) = ?
                  )
                  WHERE user_id = ? AND month = ?`,
            args: [userId, month, userId, month],
        },
        // 3. Recalculate expenses
        {
            sql: `UPDATE budget_monthly_rollups
                  SET total_expenses_cents = (
                      SELECT COALESCE(SUM(bt.amount_cents), 0)
                      FROM budget_transactions bt
                      JOIN budget_categories bc ON bt.category_id = bc.id
                      WHERE bc.is_income = 0 AND bt.user_id = ? AND strftime('%Y-%m', bt.date) = ?
                  )
                  WHERE user_id = ? AND month = ?`,
            args: [userId, month, userId, month],
        },
        // 4. Derive savings + savings rate
        {
            sql: `UPDATE budget_monthly_rollups
                  SET total_savings_cents = total_income_cents - total_expenses_cents,
                      savings_rate_basis_points = CASE
                          WHEN total_income_cents > 0
                          THEN ((total_income_cents - total_expenses_cents) * 10000) / total_income_cents
                          ELSE 0
                      END
                  WHERE user_id = ? AND month = ?`,
            args: [userId, month],
        },
    ];
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
