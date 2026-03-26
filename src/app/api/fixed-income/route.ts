import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { requireAuth } from '@/lib/authGuard';
import { z } from 'zod';
import { validateBody, validateId, dateField, currencyField, optionalNumber, optionalString } from '@/lib/validation';
import { logger } from '@/lib/logger';
import { apiError } from '@/lib/apiError';

const PostFixedIncomeSchema = z.object({
    asset: z.string().min(1, 'Asset name is required'),
    broker: z.string().min(1, 'Broker is required'),
    date: dateField,
    type: z.enum(['Investment', 'Interest', 'Withdrawal', 'Divestment']).default('Investment'),
    investment: optionalNumber,
    interest: optionalNumber,
    currency: currencyField.default('BRL'),
    notes: optionalString,
    isSalaryContribution: z.boolean().optional().default(false)
});

type PostFixedIncomeBody = z.infer<typeof PostFixedIncomeSchema>;

const PutFixedIncomeSchema = z.object({
    id: z.coerce.number(),
    date: dateField,
    type: z.enum(['Investment', 'Interest', 'Withdrawal', 'Divestment']),
    investment: optionalNumber,
    interest: optionalNumber,
    notes: optionalString,
    isSalaryContribution: z.boolean().optional().default(false),
    currency: currencyField.default('BRL')
});

type PutFixedIncomeBody = z.infer<typeof PutFixedIncomeSchema>;

interface FixedIncomeRow {
    id: number;
    date: string;
    type: string;
    asset: string;
    ticker: string | null;
    broker: string;
    currency: string;
    amount: number;
    notes: string | null;
    quantity: number | null;
    is_salary_contribution: number;
}

export async function GET(): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const sql = `
            SELECT 
                l.id, l.date, l.type, 
                a.name as asset, a.ticker, a.broker, a.currency,
                l.amount, l.notes, l.quantity,
                l.is_salary_contribution
            FROM ledger l
            JOIN assets a ON l.asset_id = a.id
            WHERE a.asset_class = 'Fixed Income' AND a.sync_status = 'ACTIVE' AND l.user_id = ?
            ORDER BY l.date DESC
        `;
        const rows = await query<FixedIncomeRow>(sql, [user.id]);

        const data = rows.map(r => {
            const finalType = r.type === 'Divestment' ? 'Withdrawal' : r.type;
            let investment = finalType === 'Interest' ? 0 : r.amount;
            if (finalType === 'Withdrawal' && investment > 0) {
                investment = -investment;
            }

            return {
                id: r.id.toString(),
                date: r.date,
                asset: r.asset,
                ticker: r.ticker,
                broker: r.broker,
                currency: r.currency,
                investment,
                interest: finalType === 'Interest' ? r.amount : 0,
                quantity: r.quantity,
                notes: r.notes,
                isSalaryContribution: r.is_salary_contribution === 1,
                type: finalType
            };
        });

        return NextResponse.json(data);
    } catch (e) {
        if (e instanceof Response) return e as unknown as NextResponse;
        logger.error('FixedIncome', e, { action: 'GET' });
        return apiError('Failed to fetch fixed income', 500, e);
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const body: unknown = await request.json();
        const { data, error } = validateBody<PostFixedIncomeBody>(PostFixedIncomeSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        // 1. Get/Create Asset
        let assetId: number;
        const existing = await query<{ id: number }>(
            `SELECT id FROM assets WHERE name = ? AND broker = ? AND asset_class = 'Fixed Income' AND user_id = ?`,
            [data!.asset, data!.broker, user.id]
        );

        if (existing.length > 0) {
            assetId = existing[0].id;
        } else {
            const res = await run(
                `INSERT INTO assets (name, ticker, broker, asset_class, currency, allocation_bucket, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [data!.asset, data!.asset, data!.broker, 'Fixed Income', data!.currency || 'BRL', 'Fixed Income', user.id]
            );
            assetId = res.lastID;
        }

        // 2. Insert Ledger
        let amount = data!.type === 'Interest' ? Math.abs(data!.interest || 0) : Math.abs(data!.investment || 0);
        const finalType = data!.type === 'Divestment' ? 'Withdrawal' : (data!.type || 'Investment');

        if (finalType === 'Withdrawal') {
            amount = -Math.abs(amount);
        }

        const res = await run(
            `INSERT INTO ledger (date, type, asset_id, amount, currency, notes, is_salary_contribution, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data!.date,
                finalType,
                assetId,
                amount,
                data!.currency || 'BRL',
                data!.notes || 'Manual Entry',
                data!.isSalaryContribution ? 1 : 0,
                user.id
            ]
        );

        return NextResponse.json({ success: true, id: res.lastID });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        logger.error('FixedIncome', error, { action: 'POST' });
        return apiError('Failed to add fixed income transaction', 500, error);
    }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const body: unknown = await request.json();
        const { data, error } = validateBody<PutFixedIncomeBody>(PutFixedIncomeSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        let amount = data!.type === 'Interest' ? Math.abs(data!.interest || 0) : Math.abs(data!.investment || 0);
        const finalType = data!.type === 'Divestment' ? 'Withdrawal' : data!.type;

        if (finalType === 'Withdrawal') {
            amount = -Math.abs(amount);
        }

        await run(
            `UPDATE ledger SET date = ?, type = ?, amount = ?, notes = ?, is_salary_contribution = ?, currency = ? WHERE id = ? AND user_id = ?`,
            [data!.date, finalType, amount, data!.notes ?? '', data!.isSalaryContribution ? 1 : 0, data!.currency || 'BRL', data!.id, user.id]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        logger.error('FixedIncome', error, { action: 'PUT' });
        return apiError('Failed to update transaction', 500, error);
    }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const { searchParams } = new URL(request.url);
        const { id, error } = validateId(searchParams.get('id'));
        if (error) return NextResponse.json({ error }, { status: 400 });

        await run(`DELETE FROM ledger WHERE id = ? AND user_id = ?`, [id, user.id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        logger.error('FixedIncome', error, { action: 'DELETE' });
        return apiError('Failed to delete transaction', 500, error);
    }
}
