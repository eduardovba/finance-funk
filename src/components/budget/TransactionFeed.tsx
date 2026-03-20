'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import _FloatingActionButton from '@/components/FloatingActionButton';
import useBudgetStore from '@/stores/useBudgetStore';
import MonthNavigator from '@/components/budget/MonthNavigator';
import TransactionDayGroup from '@/components/budget/TransactionDayGroup';
import QuickAddSheet from '@/components/budget/QuickAddSheet';
import BudgetToast from '@/components/budget/BudgetToast';

const FloatingActionButton = _FloatingActionButton as any;

export default function TransactionFeed() {
    const router = useRouter();
    const {
        categories,
        transactions,
        currentMonth,
        loading,
        setCurrentMonth,
        fetchCategories,
        fetchTransactions,
        addTransaction,
        deleteTransaction,
    } = useBudgetStore();

    const [sheetOpen, setSheetOpen] = useState(false);

    // ─── Load data on mount and month change ────────────────
    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    useEffect(() => {
        fetchTransactions(currentMonth);
    }, [currentMonth, fetchTransactions]);

    // ─── Group transactions by day ──────────────────────────
    const dayGroups = useMemo(() => {
        const map = new Map<string, typeof transactions>();
        for (const tx of transactions) {
            const day = tx.date; // YYYY-MM-DD
            if (!map.has(day)) map.set(day, []);
            map.get(day)!.push(tx);
        }
        // Sort days descending (most recent first)
        return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
    }, [transactions]);

    const handleAddTransaction = async (body: {
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
    };

    return (
        <div className="max-w-3xl mx-auto px-4 py-6 pb-28">
            {/* Month Navigator */}
            <MonthNavigator
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
            />

            {/* Transaction list */}
            {loading && transactions.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-6 h-6 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
                </div>
            ) : dayGroups.length === 0 ? (
                <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-8 text-center">
                    <p className="text-4xl mb-3">📝</p>
                    <p className="text-[#F5F5DC]/30 text-sm font-space">
                        No transactions this month.
                    </p>
                    <p className="text-[#F5F5DC]/20 text-xs font-space mt-1">
                        Tap the + button to add one.
                    </p>
                </div>
            ) : (
                dayGroups.map(([date, txs]) => (
                    <TransactionDayGroup
                        key={date}
                        date={date}
                        transactions={txs}
                        categories={categories}
                        onDelete={deleteTransaction}
                    />
                ))
            )}

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
                onSubmit={handleAddTransaction}
            />

            {/* Toast */}
            <BudgetToast />
        </div>
    );
}
