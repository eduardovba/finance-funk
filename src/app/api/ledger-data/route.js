import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const rows = await query('SELECT * FROM monthly_ledger ORDER BY month ASC');

        const income = rows.map(r => ({
            month: r.month,
            salarySavings: r.salary_savings,
            fixedIncome: r.fixed_income_income || 0,
            equity: r.equity_income || 0,
            realEstate: r.real_estate_income || 0,
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
        console.error('Failed to fetch ledger data:', error);
        return NextResponse.json({ error: 'Failed to fetch ledger data' }, { status: 500 });
    }
}
