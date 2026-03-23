'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useBudgetStore from '@/stores/useBudgetStore';
import { usePortfolio } from '@/context/PortfolioContext';
import { getJargon, type ExperienceLevel } from '@/lib/personalization';
import MetricCard from '@/components/MetricCard';
import MonthNavigator from '@/components/budget/MonthNavigator';
import SavingsRateBar from '@/components/budget/SavingsRateBar';
import SpendingDonut from '@/components/budget/SpendingDonut';
import BurnRateCard from '@/components/budget/BurnRateCard';
import TopMerchantsCard from '@/components/budget/TopMerchantsCard';
import RecurringSummaryCard from '@/components/budget/RecurringSummaryCard';
import SpendingTrendChart from '@/components/budget/SpendingTrendChart';
import { convertCurrency } from '@/lib/fxConvert';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import _FloatingActionButton from '@/components/FloatingActionButton';
import QuickAddSheet from '@/components/budget/QuickAddSheet';
import BudgetToast from '@/components/budget/BudgetToast';

const FloatingActionButton = _FloatingActionButton as any;

export default function BudgetDashboard() {
    const router = useRouter();
    const { ftueState } = usePortfolio() as any;
    const experience = (ftueState?.onboardingExperience || 'beginner') as ExperienceLevel;
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
    const fx = (cents: number) => convertCurrency(cents, displayCurrency, displayCurrency, fxRates);
    const currencyMeta = SUPPORTED_CURRENCIES[displayCurrency] ?? SUPPORTED_CURRENCIES.BRL;

    // ─── Month-over-Month deltas ────────────────────────────────
    const prevRollup = useMemo(() => {
        // Find the rollup for the previous month in history
        const [y, m] = currentMonth.split('-').map(Number);
        const prevDate = new Date(y, m - 2, 1);
        const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
        return rollupHistory.find(r => r.month === prevKey) ?? null;
    }, [currentMonth, rollupHistory]);

    const calcDelta = (current: number, previous: number): { pct: number; diff: number } => {
        if (previous === 0) return { pct: 0, diff: 0 };
        const pct = ((current - previous) / Math.abs(previous)) * 100;
        return { pct: Math.round(pct * 10) / 10, diff: (current - previous) / 100 };
    };

    const incomeDelta = calcDelta(incomeCents, prevRollup?.total_income_cents ?? 0);
    const expensesDelta = calcDelta(expensesCents, prevRollup?.total_expenses_cents ?? 0);
    const prevLeft = (prevRollup?.total_income_cents ?? 0) - (prevRollup?.total_expenses_cents ?? 0);
    const leftDelta = calcDelta(leftCents, prevLeft);

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

            {/* Hero Metric Pods (with MoM deltas) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <MetricCard
                    id="budget-income"
                    title={getJargon('income', experience)}
                    amount={fx(incomeCents) / 100}
                    percentage={incomeDelta.pct}
                    diffAmount={incomeDelta.diff}
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
                    title={getJargon('expenses', experience)}
                    amount={fx(expensesCents) / 100}
                    percentage={expensesDelta.pct}
                    diffAmount={expensesDelta.diff}
                    currency={displayCurrency}
                    primaryCurrency={displayCurrency}
                    secondaryCurrency={displayCurrency}
                    rates={{ [displayCurrency]: 1 }}
                    isLoading={loading}
                    invertColor={true}
                    onNavigate={undefined}
                    className="!shadow-[0_8px_32px_rgba(212,175,55,0.08)]"
                />
                <MetricCard
                    id="budget-left"
                    title="Left"
                    amount={fx(leftCents) / 100}
                    percentage={leftDelta.pct}
                    diffAmount={leftDelta.diff}
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

            {/* Burn Rate Card */}
            <BurnRateCard
                categories={categories}
                transactions={transactions}
                currentMonth={currentMonth}
            />

            {/* Savings Rate Bar */}
            <SavingsRateBar savingsRateBasisPoints={savingsRateBp} />

            {/* Category Breakdown (Donut ↔ List toggle) */}
            <SpendingDonut
                categories={categories}
                transactions={transactions}
            />

            {/* Top Merchants */}
            <TopMerchantsCard
                categories={categories}
                transactions={transactions}
            />

            {/* Recurring Expenses */}
            <RecurringSummaryCard
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
                        currency: displayCurrency,
                        is_recurring: false,
                    });
                }}
            />

            {/* Toast */}
            <BudgetToast />
        </div>
    );
}
