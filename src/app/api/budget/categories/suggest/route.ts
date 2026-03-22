import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/authGuard';

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireAuth();

        // 1) 90-day average spend per category (Expenses only)
        // Group by category, sum all transactions over the last 90 days.
        const spendRows = await query<{
            category_id: number;
            total_cents: number;
        }>(
            `SELECT
               bc.id AS category_id,
               COALESCE(SUM(bt.amount_cents), 0) AS total_cents
             FROM budget_categories bc
             LEFT JOIN budget_transactions bt
               ON bt.category_id = bc.id
               AND bt.user_id = bc.user_id
               AND bt.date >= date('now', '-90 days')
             WHERE bc.user_id = ?
               AND bc.is_income = 0
             GROUP BY bc.id`,
            [user.id]
        );

        const suggestions = spendRows.map(row => {
            const monthlyAvgCents = Math.round(row.total_cents / 3);
            const suggested_cents = Math.ceil(monthlyAvgCents / 1000) * 1000;
            return {
                category_id: row.category_id,
                suggested_cents,
            };
        });

        // 2) Average monthly income
        // Sum all income transactions over the last 90 days.
        const incomeRows = await query<{
            total_income_cents: number;
        }>(
            `SELECT COALESCE(SUM(bt.amount_cents), 0) AS total_income_cents
             FROM budget_transactions bt
             JOIN budget_categories bc
               ON bc.id = bt.category_id
               AND bc.user_id = bt.user_id
             WHERE bt.user_id = ?
               AND bc.is_income = 1
               AND bt.date >= date('now', '-90 days')`,
            [user.id]
        );

        const total_income_cents = incomeRows[0]?.total_income_cents ?? 0;
        const avg_monthly_income_cents = Math.round(total_income_cents / 3);

        return NextResponse.json({
            suggestions,
            avg_monthly_income_cents,
        });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Budget categories suggest error:', error);
        return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
    }
}
