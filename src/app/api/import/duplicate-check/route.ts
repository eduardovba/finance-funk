import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/authGuard';
import { z } from 'zod';
import { validateBody } from '@/lib/validation';

const DuplicateCheckSchema = z.object({
    transactions: z.array(z.object({
        date: z.string().min(1),
        asset: z.string().optional(),
        ticker: z.string().optional(),
        broker: z.string().optional(),
        amount: z.number().optional(),
        type: z.string().optional(),
        currency: z.string().optional(),
        assetClass: z.string().optional(),
    }))
});

/**
 * POST /api/import/duplicate-check
 *
 * Accepts an array of staged transactions and returns the indices of rows
 * that already exist in the ledger (same fingerprint: date + asset_id + amount).
 *
 * This mirrors the budget import duplicate-detection pattern but for
 * portfolio assets (Equity, Crypto, Fixed Income, Pension, Real Estate, Debt).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const body: unknown = await request.json();
        const { data, error } = validateBody(DuplicateCheckSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        const { transactions } = data!;

        const duplicateIndices: number[] = [];

        for (let i = 0; i < transactions.length; i++) {
            const tx = transactions[i];
            if (!tx.date || tx.amount == null) continue;

            const assetName = tx.asset || tx.ticker || 'Unknown';
            const broker = tx.broker || 'Manual';
            const ticker = tx.ticker || null;

            // ── Resolve the asset (read-only, no creation) ────────────────
            let assetId: number | null = null;

            // Try by ticker + broker first
            if (ticker) {
                const byTicker = await query(
                    'SELECT id FROM assets WHERE ticker = ? AND broker = ? AND user_id = ?',
                    [ticker, broker, user.id]
                ) as { id: number }[];
                if (byTicker.length > 0) assetId = byTicker[0].id;
            }

            // Fallback: by name + broker
            if (assetId === null) {
                const byName = await query(
                    'SELECT id FROM assets WHERE name = ? AND broker = ? AND user_id = ?',
                    [assetName, broker, user.id]
                ) as { id: number }[];
                if (byName.length > 0) assetId = byName[0].id;
            }

            // If no asset found, the row can't be a duplicate
            if (assetId === null) continue;

            // ── Check the ledger for a matching row ───────────────────────
            // Sign the amount the same way the import handlers do
            let ledgerAmount: number;
            if (tx.type === 'Buy') {
                ledgerAmount = -Math.abs(tx.amount);
            } else if (tx.type === 'Sell') {
                ledgerAmount = Math.abs(tx.amount);
            } else {
                ledgerAmount = tx.amount;
            }

            const existing = await query(
                'SELECT id FROM ledger WHERE date = ? AND asset_id = ? AND ABS(amount - ?) < 0.01 AND user_id = ?',
                [tx.date, assetId, ledgerAmount, user.id]
            );

            if (existing.length > 0) {
                duplicateIndices.push(i);
            }
        }

        return NextResponse.json({ duplicateIndices });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Duplicate check error:', error);
        return NextResponse.json({ error: 'Duplicate check failed' }, { status: 500 });
    }
}
