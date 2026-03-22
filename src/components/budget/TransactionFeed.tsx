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
import ConfirmationModal from '@/components/ConfirmationModal';
import { formatCents } from '@/lib/budgetUtils';

const FloatingActionButton = _FloatingActionButton as any;

export default function TransactionFeed() {
    const router = useRouter();
    const {
        categories,
        transactions,
        currentMonth,
        loading,
        displayCurrency,
        setCurrentMonth,
        fetchCategories,
        fetchTransactions,
        addTransaction,
        deleteTransaction,
        bulkDeleteTransactions,
    } = useBudgetStore();

    const [sheetOpen, setSheetOpen] = useState(false);
    const [selectedTxIds, setSelectedTxIds] = useState<Set<number>>(new Set());
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

    // Clear selection when month changes
    useEffect(() => {
        setSelectedTxIds(new Set());
    }, [currentMonth]);

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

    // ─── Totals ─────────────────────────────────────────────
    const { incomeCents, expenseCents } = useMemo(() => {
        let inc = 0, exp = 0;
        for (const tx of transactions) {
            const cat = categories.find(c => c.id === tx.category_id);
            if (cat?.is_income === 1) inc += tx.amount_cents;
            else exp += tx.amount_cents;
        }
        return { incomeCents: inc, expenseCents: exp };
    }, [transactions, categories]);
    const netCents = incomeCents - expenseCents;

    const handleAddTransaction = async (body: {
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
    };

    const handleSelectAll = () => {
        if (selectedTxIds.size === transactions.length && transactions.length > 0) {
            setSelectedTxIds(new Set());
        } else {
            setSelectedTxIds(new Set(transactions.map(t => t.id)));
        }
    };

    const handleToggleSelect = (id: number) => {
        setSelectedTxIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleBulkDelete = () => {
        if (selectedTxIds.size === 0) return;
        setShowDeleteConfirm(true);
    };

    const handleSingleDelete = (id: number) => {
        setPendingDeleteId(id);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        try {
            if (pendingDeleteId !== null) {
                // Single delete
                await deleteTransaction(pendingDeleteId);
                useBudgetStore.setState({ toastError: '✅ Transaction deleted.' });
            } else {
                // Bulk delete
                const idsToDelete = Array.from(selectedTxIds);
                const count = idsToDelete.length;
                await bulkDeleteTransactions(idsToDelete);
                useBudgetStore.setState({ toastError: `✅ ${count} transaction${count > 1 ? 's' : ''} deleted.` });
                setSelectedTxIds(new Set());
            }
        } catch {
            useBudgetStore.setState({ toastError: 'Failed to delete transaction(s).' });
        } finally {
            setShowDeleteConfirm(false);
            setPendingDeleteId(null);
        }
    };

    const handleCancelDelete = () => {
        setShowDeleteConfirm(false);
        setPendingDeleteId(null);
    };

    return (
        <div className="max-w-3xl mx-auto px-4 py-6 pb-28">
            {/* Month Navigator */}
            <MonthNavigator
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
            />

            {/* Transaction list */}
            {!loading && transactions.length > 0 && (
                <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-5 mb-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col">
                            <span className="text-[0.6rem] text-[#F5F5DC]/25 uppercase tracking-[2px] font-space mb-1">Income</span>
                            <span className="text-lg font-bebas tracking-wider text-[#34D399]">
                                {formatCents(incomeCents, displayCurrency)}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[0.6rem] text-[#F5F5DC]/25 uppercase tracking-[2px] font-space mb-1">Spent</span>
                            <span className="text-lg font-bebas tracking-wider text-[#F5F5DC]/50">
                                {formatCents(expenseCents, displayCurrency)}
                            </span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[0.6rem] text-[#F5F5DC]/25 uppercase tracking-[2px] font-space mb-1">Net</span>
                            <span className={`text-lg font-bebas tracking-wider ${netCents >= 0 ? 'text-[#34D399] drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]' : 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]'}`}>
                                {netCents < 0 ? '-' : '+'}{formatCents(Math.abs(netCents), displayCurrency)}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Selection Toolbar */}
            {!loading && transactions.length > 0 && (
                <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] px-4 py-3 mb-4">
                    <div className="flex items-center justify-between">
                        <button 
                            onClick={handleSelectAll}
                            className="flex items-center gap-2 text-sm font-space text-[#F5F5DC]/60 hover:text-[#D4AF37] transition-colors"
                        >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                selectedTxIds.size > 0 
                                    ? selectedTxIds.size === transactions.length 
                                        ? 'bg-[#D4AF37] border-[#D4AF37]' 
                                        : 'bg-[#D4AF37]/50 border-[#D4AF37]'
                                    : 'border-white/[0.2] bg-white/[0.02]'
                            }`}>
                                {selectedTxIds.size === transactions.length && (
                                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1.5 4.5L3.5 6.5L8.5 1.5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                )}
                                {selectedTxIds.size > 0 && selectedTxIds.size < transactions.length && (
                                    <div className="w-2 h-0.5 bg-black rounded-full" />
                                )}
                            </div>
                            {selectedTxIds.size > 0 ? `${selectedTxIds.size} Selected` : 'Select All'}
                        </button>

                        {selectedTxIds.size > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="text-xs font-space tracking-wide uppercase px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                            >
                                Delete Selected
                            </button>
                        )}
                    </div>
                </div>
            )}

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
                        selectedTxIds={selectedTxIds}
                        onToggleSelect={handleToggleSelect}
                        onDelete={handleSingleDelete}
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

            {/* Bulk Delete Confirmation */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                title={pendingDeleteId !== null ? 'Delete Transaction' : 'Delete Transactions'}
                message={pendingDeleteId !== null
                    ? 'Are you sure you want to delete this transaction? This action cannot be undone.'
                    : `Are you sure you want to delete ${selectedTxIds.size} transaction${selectedTxIds.size > 1 ? 's' : ''}? This action cannot be undone.`
                }
                confirmLabel={pendingDeleteId !== null ? 'Delete' : 'Delete All'}
                onConfirm={handleConfirmDelete}
                onCancel={handleCancelDelete}
            />
        </div>
    );
}
