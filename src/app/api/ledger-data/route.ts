import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { requireAuth } from '@/lib/authGuard';
import { z } from 'zod';
import { validateBody } from '@/lib/validation';

const incomeDataSchema = z.object({
    salarySavings: z.coerce.number().optional(),
    salary: z.coerce.number().optional(),
    fixedIncome: z.coerce.number().optional(),
    equity: z.coerce.number().optional(),
    realEstate: z.coerce.number().optional(),
    extraordinary: z.coerce.number().optional()
}).optional();

const investmentsDataSchema = z.object({
    equity: z.coerce.number().optional(),
    fixedIncome: z.coerce.number().optional(),
    realEstate: z.coerce.number().optional(),
    pensions: z.coerce.number().optional(),
    crypto: z.coerce.number().optional(),
    debt: z.coerce.number().optional()
}).optional();

const PostLedgerDataSchema = z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM format'),
    income: incomeDataSchema,
    investments: investmentsDataSchema
});

const PutLedgerDataSchema = z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM format'),
    type: z.enum(['income', 'investments']),
    data: z.object({}).passthrough()
});

export async function GET(): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const rows = await query('SELECT * FROM monthly_ledger WHERE user_id = ? ORDER BY month ASC', [user.id]);

        const income = rows.map(r => ({
            month: r.month,
            salarySavings: r.salary_savings,
            fixedIncome: r.fixed_income_income || 0,
            equity: r.equity_income || 0,
            realEstate: r.real_estate_income || 0,
            extraordinary: r.extraordinary_income || 0,
            total: r.total_income
        }));

        const investments = rows.map(r => ({
            month: r.month,
            fixedIncome: r.fixed_income,
            equity: r.equity,
            realEstate: r.real_estate,
            pensions: r.pension,
            crypto: r.crypto,
            debt: r.debt,
            total: r.total_investments
        }));

        return NextResponse.json({ content: { income, investments } });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Failed to fetch ledger data:', error);
        return NextResponse.json({ error: 'Failed to fetch ledger data' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const body: unknown = await request.json();
        const { data: validated, error } = validateBody(PutLedgerDataSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        const { month, type, data } = validated!;

        if (type === 'income') {
            const d = data as Record<string, any>;
            const salSav = Number(d.salarySavings || d.salary || 0);
            const fi = Number(d.fixedIncome || 0);
            const eq = Number(d.equity || 0);
            const re = Number(d.realEstate || 0);
            const ext = Number(d.extraordinary || 0);
            await run(
                `UPDATE monthly_ledger SET salary_savings = ?, fixed_income_income = ?, equity_income = ?, real_estate_income = ?, extraordinary_income = ?, total_income = ? WHERE month = ? AND user_id = ?`,
                [salSav, fi, eq, re, ext, salSav + fi + eq + re + ext, month, user.id]
            );
        } else if (type === 'investments') {
            const d = data as Record<string, any>;
            const eq = Number(d.equity || 0);
            const fi = Number(d.fixedIncome || 0);
            const re = Number(d.realEstate || 0);
            const pen = Number(d.pensions || 0);
            const cr = Number(d.crypto || 0);
            const debt = Number(d.debt || 0);
            await run(
                `UPDATE monthly_ledger SET equity = ?, fixed_income = ?, real_estate = ?, pension = ?, crypto = ?, debt = ?, total_investments = ? WHERE month = ? AND user_id = ?`,
                [eq, fi, re, pen, cr, debt, eq + fi + re + pen + cr + debt, month, user.id]
            );
        } else {
            return NextResponse.json({ error: 'Invalid type. Must be "income" or "investments"' }, { status: 400 });
        }

        return NextResponse.json({ success: true, month, type });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Failed to update ledger data:', error);
        return NextResponse.json({ error: 'Failed to update ledger data' }, { status: 500 });
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const body: unknown = await request.json();
        const { data: validated, error } = validateBody(PostLedgerDataSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        const { month, income, investments } = validated!;

        // Check if row for this month already exists for this user
        const existing = await query('SELECT month FROM monthly_ledger WHERE month = ? AND user_id = ?', [month, user.id]);

        const salSav = income?.salarySavings || income?.salary || 0;
        const fiInc = income?.fixedIncome || 0;
        const eqInc = income?.equity || 0;
        const reInc = income?.realEstate || 0;
        const extInc = income?.extraordinary || 0;
        const totalInc = salSav + fiInc + eqInc + reInc + extInc;

        const eqInv = investments?.equity || 0;
        const fiInv = investments?.fixedIncome || 0;
        const reInv = investments?.realEstate || 0;
        const penInv = investments?.pensions || 0;
        const crInv = investments?.crypto || 0;
        const debtInv = investments?.debt || 0;
        const totalInv = eqInv + fiInv + reInv + penInv + crInv + debtInv;

        if (existing.length > 0) {
            await run(
                `UPDATE monthly_ledger SET salary_savings = ?, fixed_income_income = ?, equity_income = ?, real_estate_income = ?, extraordinary_income = ?, total_income = ?, equity = ?, fixed_income = ?, real_estate = ?, pension = ?, crypto = ?, debt = ?, total_investments = ? WHERE month = ? AND user_id = ?`,
                [salSav, fiInc, eqInc, reInc, extInc, totalInc, eqInv, fiInv, reInv, penInv, crInv, debtInv, totalInv, month, user.id]
            );
        } else {
            await run(
                `INSERT INTO monthly_ledger (month, salary_savings, fixed_income_income, equity_income, real_estate_income, extraordinary_income, total_income, equity, fixed_income, real_estate, pension, crypto, debt, total_investments, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [month, salSav, fiInc, eqInc, reInc, extInc, totalInc, eqInv, fiInv, reInv, penInv, crInv, debtInv, totalInv, user.id]
            );
        }

        return NextResponse.json({ success: true, month });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Failed to upsert ledger data:', error);
        return NextResponse.json({ error: 'Failed to upsert ledger data' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month');

        if (!month) {
            return NextResponse.json({ error: 'Month parameter required' }, { status: 400 });
        }

        await run('DELETE FROM monthly_ledger WHERE month = ? AND user_id = ?', [month, user.id]);
        return NextResponse.json({ success: true, month });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Failed to delete ledger data:', error);
        return NextResponse.json({ error: 'Failed to delete ledger data' }, { status: 500 });
    }
}
