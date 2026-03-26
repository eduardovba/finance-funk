import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/authGuard';
import { logger } from '@/lib/logger';
import { apiError } from '@/lib/apiError';

export async function GET(): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const sql = `
            SELECT 
                l.id, l.asset_id, l.date, l.type, 
                a.name as asset, a.broker, a.allocation_bucket,
                l.quantity, l.price, l.amount,
                l.realized_pnl, l.realized_roi_percent,
                l.is_salary_contribution
            FROM ledger l
            JOIN assets a ON l.asset_id = a.id
            WHERE a.asset_class = 'Pension' AND a.sync_status = 'ACTIVE' AND l.user_id = ?
            ORDER BY l.date ASC
        `;
        interface PensionRow {
            id: number; asset_id: number; date: string; type: string;
            asset: string; broker: string; allocation_bucket: string;
            quantity: any; price: any; amount: any;
            realized_pnl: any; realized_roi_percent: any;
            is_salary_contribution: any;
        }
        const rows = await query<PensionRow>(sql, [user.id]);

        const state: Record<string, any> = {}; // { [asset|broker]: { qty: 0, cost: 0 } }

        const data = rows.map(r => {
            const key = `${r.asset}|${r.broker}`;
            if (!state[key]) state[key] = { qty: 0, cost: 0 };

            let computedPnl = r.realized_pnl;
            let computedRoi = r.realized_roi_percent;

            const type = (r.type || '').toLowerCase();
            if (type === 'investment' || type === 'buy') {
                const qty = parseFloat(r.quantity) || 0;
                const cost = -parseFloat(r.amount) || 0;
                state[key].qty += qty;
                state[key].cost += cost;
            } else if (type === 'divestment' || type === 'sell') {
                const qty = parseFloat(r.quantity) || 0;
                const proceeds = parseFloat(r.amount) || 0;

                const avgCost = state[key].qty > 0 ? state[key].cost / state[key].qty : (r.asset === 'Cash' ? 1 : 0);
                const costBasis = avgCost * qty;

                if (computedPnl === null || computedPnl === 0) {
                    computedPnl = proceeds - costBasis;
                }
                if (computedRoi === null || computedRoi === 0) {
                    computedRoi = costBasis > 0 ? ((computedPnl as number) / costBasis) * 100 : null;
                }

                state[key].qty -= qty;
                state[key].cost -= costBasis;
            }

            return {
                id: r.id.toString(),
                asset_id: r.asset_id,
                date: r.date,
                asset: r.asset,
                broker: r.broker,
                allocationClass: r.allocation_bucket,
                quantity: r.quantity,
                price: r.price,
                value: Math.abs(r.amount),
                type: r.type === 'Investment' ? 'Buy' : (r.type === 'Divestment' ? 'Sell' : r.type),
                pnl: computedPnl,
                roiPercent: computedRoi,
                isSalaryContribution: r.is_salary_contribution === 1
            };
        });

        // Re-sort DESC for ledger
        data.sort((a, b) => b.date.localeCompare(a.date));

        return NextResponse.json(data);
    } catch (e) {
        if (e instanceof Response) return e as unknown as NextResponse;
        logger.error('Pensions', e, { action: 'GET' });
        return apiError('Failed to fetch pension data', 500, e);
    }
}
