import { NextRequest, NextResponse } from 'next/server';
import { batch } from '@/lib/db';
import { requireAuth } from '@/lib/authGuard';
import { z } from 'zod';
import { buildRollupStatements, type BatchStatement } from '@/lib/budgetRollup';

// ═══════════ Zod schema ═══════════

const BulkTransactionItem = z.object({
    category_id: z.coerce.number().int(),
    amount_cents: z.coerce.number().int().positive(),
    currency: z.string().default('GBP'),
    description: z.string().optional().nullable(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    is_recurring: z.boolean().default(false),
    source: z.string().optional().nullable(),
});

const BulkTransactionSchema = z.object({
    transactions: z.array(BulkTransactionItem).min(1).max(500),
});

const BulkDeleteSchema = z.object({
    ids: z.array(z.coerce.number().int()).min(1).max(100),
});

// ═══════════ POST ═══════════

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const body: unknown = await request.json();
        const parsed = BulkTransactionSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { transactions } = parsed.data;

        // 1. Build INSERT statements for each transaction
        const insertStatements: BatchStatement[] = transactions.map(tx => ({
            sql: `INSERT INTO budget_transactions (user_id, category_id, amount_cents, currency, description, date, is_recurring, source)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                user.id,
                tx.category_id,
                tx.amount_cents,
                tx.currency,
                tx.description ?? null,
                tx.date,
                tx.is_recurring ? 1 : 0,
                tx.source ?? null,
            ],
        }));

        // 2. Collect unique months and build rollup recalculations
        const uniqueMonths = [...new Set(transactions.map(tx => tx.date.slice(0, 7)))];
        const rollupStatements: BatchStatement[] = uniqueMonths.flatMap(
            month => buildRollupStatements(user.id, month)
        );

        // 3. Execute everything in one ACID batch
        await batch([...insertStatements, ...rollupStatements]);

        return NextResponse.json({ success: true, count: transactions.length });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Bulk transactions POST error:', error);
        return NextResponse.json(
            { error: 'Failed to bulk insert transactions' },
            { status: 500 }
        );
    }
}

// ═══════════ DELETE ═══════════

export async function DELETE(request: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const body: unknown = await request.json();
        const parsed = BulkDeleteSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const txIds = parsed.data.ids;
        if (txIds.length === 0) return NextResponse.json({ success: true, count: 0 });

        // 1. Fetch transactions to confirm ownership and extract months for rollup recalcs
        
        // Use a dynamic IN clause
        const placeholders = txIds.map(() => '?').join(',');
        
        // For Turso JS client, we need a single query call if possible, but lib/db might not export 'query'. 
        // Actually, we can use a raw fetch from database or if db exports query, import it. 
        // We see batch is imported. Does lib/db export query? Yes, we saw it in previous contexts.
        // I will import query at the top just in case.
        const { query } = await import('@/lib/db');
        
        const rows = await query(
            `SELECT id, date FROM budget_transactions WHERE user_id = ? AND id IN (${placeholders})`,
            [user.id, ...txIds]
        );

        if (rows.length === 0) return NextResponse.json({ success: true, count: 0 });

        const validIds = rows.map((r: any) => r.id as number);

        // 2. Delete valid transactions
        const deleteStatements: BatchStatement[] = validIds.map((id: number) => ({
            sql: `DELETE FROM budget_transactions WHERE id = ? AND user_id = ?`,
            args: [id, user.id],
        }));

        // 3. Rollup invalidation for the months affected
        const uniqueMonths = [...new Set(rows.map((r: any) => String(r.date ?? '').slice(0, 7)))];
        const rollupStatements: BatchStatement[] = uniqueMonths.flatMap(
            month => buildRollupStatements(user.id, month)
        );

        await batch([...deleteStatements, ...rollupStatements]);

        return NextResponse.json({ success: true, count: validIds.length });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Bulk transactions DELETE error:', error);
        return NextResponse.json(
            { error: 'Failed to bulk delete transactions' },
            { status: 500 }
        );
    }
}
