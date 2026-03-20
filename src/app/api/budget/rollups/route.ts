import { NextRequest, NextResponse } from 'next/server';
import { get, query } from '@/lib/db';
import { requireAuth } from '@/lib/authGuard';
import type { BudgetMonthlyRollup } from '@/types';

// ═══════════ GET ═══════════
//
// Usage:
//   Single month:  GET /api/budget/rollups?month=2026-03
//   Range (batch): GET /api/budget/rollups?start=2025-10&end=2026-03
//
// The range mode returns an array of rollups, filling in zeroed defaults
// for any month that has no data yet.

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month');
        const start = searchParams.get('start');
        const end = searchParams.get('end');

        const MONTH_RE = /^\d{4}-\d{2}$/;

        // ─── Range mode (batch) ──────────────────────────────────
        if (start && end) {
            if (!MONTH_RE.test(start) || !MONTH_RE.test(end)) {
                return NextResponse.json(
                    { error: 'start and end must be YYYY-MM format' },
                    { status: 400 }
                );
            }

            const rows = await query<BudgetMonthlyRollup>(
                `SELECT * FROM budget_monthly_rollups
                 WHERE user_id = ? AND month >= ? AND month <= ?
                 ORDER BY month ASC`,
                [user.id, start, end]
            );

            // Build a map of existing rollups
            const rollupMap = new Map<string, BudgetMonthlyRollup>();
            for (const row of rows) {
                rollupMap.set(row.month, row);
            }

            // Generate every month in the range, filling zeroed defaults for gaps
            const result: BudgetMonthlyRollup[] = [];
            const [startY, startM] = start.split('-').map(Number);
            const [endY, endM] = end.split('-').map(Number);
            let y = startY;
            let m = startM;

            while (y < endY || (y === endY && m <= endM)) {
                const key = `${y}-${String(m).padStart(2, '0')}`;
                result.push(
                    rollupMap.get(key) ?? {
                        id: 0,
                        user_id: Number(user.id),
                        month: key,
                        total_income_cents: 0,
                        total_expenses_cents: 0,
                        total_savings_cents: 0,
                        savings_rate_basis_points: 0,
                    }
                );
                m++;
                if (m > 12) { m = 1; y++; }
            }

            return NextResponse.json(result);
        }

        // ─── Single-month mode ───────────────────────────────────
        if (!month || !MONTH_RE.test(month)) {
            return NextResponse.json(
                { error: 'month query parameter is required (YYYY-MM), or use start & end for range' },
                { status: 400 }
            );
        }

        const row = await get<BudgetMonthlyRollup>(
            'SELECT * FROM budget_monthly_rollups WHERE user_id = ? AND month = ?',
            [user.id, month]
        );

        const rollup: BudgetMonthlyRollup = row ?? {
            id: 0,
            user_id: Number(user.id),
            month,
            total_income_cents: 0,
            total_expenses_cents: 0,
            total_savings_cents: 0,
            savings_rate_basis_points: 0,
        };

        return NextResponse.json(rollup);
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Budget rollups GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch rollup' }, { status: 500 });
    }
}
