import { NextRequest, NextResponse } from 'next/server';
import { query, batch, run } from '@/lib/db';
import { requireAuth } from '@/lib/authGuard';
import type { BudgetCategory } from '@/types';

/**
 * Default Finance Funk category taxonomy.
 * Seeded once when a user has zero categories.
 */
const DEFAULT_CATEGORIES: Omit<BudgetCategory, 'id' | 'user_id'>[] = [
    { name: 'Housing',        icon: '🏠', color: '#8B5CF6', monthly_target_cents: 0, parent_id: null, sort_order: 0,  is_income: 0 },
    { name: 'Groceries',      icon: '🛒', color: '#34D399', monthly_target_cents: 0, parent_id: null, sort_order: 1,  is_income: 0 },
    { name: 'Dining',         icon: '🍔', color: '#F59E0B', monthly_target_cents: 0, parent_id: null, sort_order: 2,  is_income: 0 },
    { name: 'Transport',      icon: '🚆', color: '#3B82F6', monthly_target_cents: 0, parent_id: null, sort_order: 3,  is_income: 0 },
    { name: 'Utilities',      icon: '⚡', color: '#EF4444', monthly_target_cents: 0, parent_id: null, sort_order: 4,  is_income: 0 },
    { name: 'Shopping',       icon: '🛍️', color: '#EC4899', monthly_target_cents: 0, parent_id: null, sort_order: 5,  is_income: 0 },
    { name: 'Subscriptions',  icon: '📺', color: '#8B5CF6', monthly_target_cents: 0, parent_id: null, sort_order: 6,  is_income: 0 },
    { name: 'Health',         icon: '💊', color: '#10B981', monthly_target_cents: 0, parent_id: null, sort_order: 7,  is_income: 0 },
    { name: 'Entertainment',  icon: '🎬', color: '#F97316', monthly_target_cents: 0, parent_id: null, sort_order: 8,  is_income: 0 },
    { name: 'Misc.',          icon: '📦', color: '#6B7280', monthly_target_cents: 0, parent_id: null, sort_order: 9,  is_income: 0 },
    { name: 'Income',         icon: '💰', color: '#34D399', monthly_target_cents: 0, parent_id: null, sort_order: 10, is_income: 1 },
];

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const force = request.nextUrl.searchParams.get('force') === 'true';

        if (force) {
            // Delete all existing categories for this user
            await run('DELETE FROM budget_categories WHERE user_id = ?', [user.id]);
        } else {
            // Guard: don't seed if user already has categories
            const existing = await query<{ count: number }>(
                'SELECT COUNT(*) as count FROM budget_categories WHERE user_id = ?',
                [user.id]
            );
            if (existing[0]?.count > 0) {
                return NextResponse.json({ seeded: false, message: 'Categories already exist' });
            }
        }

        const statements = DEFAULT_CATEGORIES.map(cat => ({
            sql: `INSERT INTO budget_categories (user_id, name, icon, color, monthly_target_cents, parent_id, sort_order, is_income)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                user.id,
                cat.name,
                cat.icon,
                cat.color,
                cat.monthly_target_cents,
                cat.parent_id,
                cat.sort_order,
                cat.is_income,
            ] as (string | number | null)[],
        }));

        await batch(statements);

        return NextResponse.json({ seeded: true, count: DEFAULT_CATEGORIES.length });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Category seed error:', error);
        return NextResponse.json({ error: 'Failed to seed categories' }, { status: 500 });
    }
}
