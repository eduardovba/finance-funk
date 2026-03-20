'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useBudgetStore from '@/stores/useBudgetStore';
import MetricCard from '@/components/MetricCard';
import MonthNavigator from '@/components/budget/MonthNavigator';
import SavingsRateBar from '@/components/budget/SavingsRateBar';
import CategoryBreakdown from '@/components/budget/CategoryBreakdown';
import SpendingTrendChart from '@/components/budget/SpendingTrendChart';
import { formatCents } from '@/lib/budgetUtils';
import { convertCurrency } from '@/lib/fxConvert';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import _FloatingActionButton from '@/components/FloatingActionButton';
import QuickAddSheet from '@/components/budget/QuickAddSheet';
import BudgetToast from '@/components/budget/BudgetToast';

const FloatingActionButton = _FloatingActionButton as any;

export default function BudgetDashboard() {
    const router = useRouter();
    const {
        categories,
        transactions,
        currentRollup,
        rollupHistory,
        currentMonth,
        loading,
        displayCurrency,
        fxRates,
        setCurrentMonth,
        fetchCategories,
        fetchTransactions,
        fetchRollup,
        fetchRollupRange,
        addTransaction,
    } = useBudgetStore();

    const [sheetOpen, setSheetOpen] = useState(false);

    // ─── Load data on mount and when month changes ──────────────
    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    useEffect(() => {
        fetchTransactions(currentMonth);
        fetchRollup(currentMonth);
        fetchRollupRange(currentMonth, 6);
    }, [currentMonth, fetchTransactions, fetchRollup, fetchRollupRange]);

    // ─── Derived values (all integer arithmetic) ────────────────
    const incomeCents = currentRollup?.total_income_cents ?? 0;
    const expensesCents = currentRollup?.total_expenses_cents ?? 0;
    const leftCents = incomeCents - expensesCents;
    const savingsRateBp = currentRollup?.savings_rate_basis_points ?? 0;

    // FX conversion (integer math → Math.round inside convertCurrency)
    const fx = (cents: number) => convertCurrency(cents, 'BRL', displayCurrency, fxRates);
    const currencyMeta = SUPPORTED_CURRENCIES[displayCurrency] ?? SUPPORTED_CURRENCIES.BRL;

    const handleMonthChange = (month: string) => {
        setCurrentMonth(month);
    };

    return (
        <div className="py-2">
            {/* Month Navigator */}
            <MonthNavigator
                currentMonth={currentMonth}
                onMonthChange={handleMonthChange}
            />

            {/* Hero Metric Pods */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <MetricCard
                    id="budget-income"
                    title="Income"
                    amount={fx(incomeCents) / 100}
                    percentage={0}
                    diffAmount={0}
                    currency={displayCurrency}
                    primaryCurrency={displayCurrency}
                    secondaryCurrency={displayCurrency}
                    rates={{ [displayCurrency]: 1 }}
                    isLoading={loading}
                    onNavigate={undefined}
                    className="!shadow-[0_8px_32px_rgba(52,211,153,0.08)]"
                />
                <MetricCard
                    id="budget-spent"
                    title="Spent"
                    amount={fx(expensesCents) / 100}
                    percentage={0}
                    diffAmount={0}
                    currency={displayCurrency}
                    primaryCurrency={displayCurrency}
                    secondaryCurrency={displayCurrency}
                    rates={{ [displayCurrency]: 1 }}
                    isLoading={loading}
                    onNavigate={undefined}
                    className="!shadow-[0_8px_32px_rgba(212,175,55,0.08)]"
                />
                <MetricCard
                    id="budget-left"
                    title="Left"
                    amount={fx(leftCents) / 100}
                    percentage={0}
                    diffAmount={0}
                    currency={displayCurrency}
                    primaryCurrency={displayCurrency}
                    secondaryCurrency={displayCurrency}
                    rates={{ [displayCurrency]: 1 }}
                    isLoading={loading}
                    invertColor={true}
                    onNavigate={undefined}
                    className={leftCents < 0 ? '!border-red-400/20' : ''}
                />
            </div>

            {/* Savings Rate Bar */}
            <SavingsRateBar savingsRateBasisPoints={savingsRateBp} />

            {/* Category Breakdown */}
            <CategoryBreakdown
                categories={categories}
                transactions={transactions}
            />

            {/* Spending Trend Chart */}
            <SpendingTrendChart rollupHistory={rollupHistory} />

            {/* Shared FAB — matches asset pages exactly */}
            <FloatingActionButton
                onAddBroker={() => router.push('/budget/categories')}
                brokerLabel="Add Category"
                onAddTransaction={() => setSheetOpen(true)}
                isVisible={true}
            />

            {/* Quick Add Sheet */}
            <QuickAddSheet
                isOpen={sheetOpen}
                onClose={() => setSheetOpen(false)}
                categories={categories}
                onSubmit={async (body: {
                    category_id: number;
                    amount_cents: number;
                    description: string | null;
                    date: string;
                }) => {
                    await addTransaction({
                        ...body,
                        currency: 'BRL',
                        is_recurring: false,
                    });
                }}
            />

            {/* Toast */}
            <BudgetToast />
        </div>
    );
}
