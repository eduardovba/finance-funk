import { NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { requireAuth } from '@/lib/authGuard';

export async function GET() {
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
        if (error instanceof Response) return error;
        console.error('Failed to fetch ledger data:', error);
        return NextResponse.json({ error: 'Failed to fetch ledger data' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const user = await requireAuth();
        const body = await request.json();
        const { month, type, data } = body;

        if (!month || !type || !data) {
            return NextResponse.json({ error: 'Missing required fields: month, type, data' }, { status: 400 });
        }

        if (type === 'income') {
            await run(
                `UPDATE monthly_ledger SET salary_savings = ?, fixed_income_income = ?, equity_income = ?, real_estate_income = ?, extraordinary_income = ?, total_income = ? WHERE month = ? AND user_id = ?`,
                [data.salarySavings || data.salary || 0, data.fixedIncome || 0, data.equity || 0, data.realEstate || 0, data.extraordinary || 0, (data.salarySavings || data.salary || 0) + (data.fixedIncome || 0) + (data.equity || 0) + (data.realEstate || 0) + (data.extraordinary || 0), month, user.id]
            );
        } else if (type === 'investments') {
            await run(
                `UPDATE monthly_ledger SET equity = ?, fixed_income = ?, real_estate = ?, pension = ?, crypto = ?, debt = ?, total_investments = ? WHERE month = ? AND user_id = ?`,
                [data.equity || 0, data.fixedIncome || 0, data.realEstate || 0, data.pensions || 0, data.crypto || 0, data.debt || 0, (data.equity || 0) + (data.fixedIncome || 0) + (data.realEstate || 0) + (data.pensions || 0) + (data.crypto || 0) + (data.debt || 0), month, user.id]
            );
        } else {
            return NextResponse.json({ error: 'Invalid type. Must be "income" or "investments"' }, { status: 400 });
        }

        return NextResponse.json({ success: true, month, type });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('Failed to update ledger data:', error);
        return NextResponse.json({ error: 'Failed to update ledger data' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const user = await requireAuth();
        const body = await request.json();
        const { month, income, investments } = body;

        if (!month) {
            return NextResponse.json({ error: 'Missing required field: month' }, { status: 400 });
        }

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
        if (error instanceof Response) return error;
        console.error('Failed to upsert ledger data:', error);
        return NextResponse.json({ error: 'Failed to upsert ledger data' }, { status: 500 });
    }
}

export async function DELETE(request) {
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
        if (error instanceof Response) return error;
        console.error('Failed to delete ledger data:', error);
        return NextResponse.json({ error: 'Failed to delete ledger data' }, { status: 500 });
    }
}
