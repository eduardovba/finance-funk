'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, SlidersHorizontal, ChevronDown } from 'lucide-react';
import _FloatingActionButton from '@/components/FloatingActionButton';
import useBudgetStore from '@/stores/useBudgetStore';
import MonthNavigator from '@/components/budget/MonthNavigator';
import TransactionDayGroup from '@/components/budget/TransactionDayGroup';
import QuickAddSheet from '@/components/budget/QuickAddSheet';
import EditTransactionModal from '@/components/budget/EditTransactionModal';
import BudgetToast from '@/components/budget/BudgetToast';
import ConfirmationModal from '@/components/ConfirmationModal';
import { formatCents } from '@/lib/budgetUtils';
import type { BudgetTransaction } from '@/types';

const FloatingActionButton = _FloatingActionButton as any;

/* ─── Filter Dropdown Pill ───────────────────────────── */
function FilterPill({
    label,
    value,
    options,
    onChange,
    allLabel = 'All',
}: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (v: string) => void;
    allLabel?: string;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const isActive = value !== '';

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-space font-medium tracking-wide
                    whitespace-nowrap transition-all duration-200 border ${
                    isActive
                        ? 'bg-[#D4AF37]/15 border-[#D4AF37]/30 text-[#D4AF37]'
                        : 'bg-white/[0.03] border-white/[0.06] text-[#F5F5DC]/50 hover:text-[#F5F5DC]/70 hover:border-white/[0.12]'
                }`}
            >
                <span className="uppercase text-[10px] tracking-[1px] opacity-60">{label}</span>
                <span>{value ? options.find(o => o.value === value)?.label || value : allLabel}</span>
                <ChevronDown size={10} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 top-full mt-1.5 w-44 bg-[#121418]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
                    >
                        <div className="p-1">
                            <button
                                onClick={() => { onChange(''); setOpen(false); }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-space transition-colors ${
                                    value === '' ? 'bg-[#D4AF37]/15 text-[#D4AF37]' : 'text-[#F5F5DC]/50 hover:bg-white/[0.06]'
                                }`}
                            >
                                {allLabel}
                            </button>
                            {options.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => { onChange(opt.value); setOpen(false); }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-space transition-colors ${
                                        opt.value === value ? 'bg-[#D4AF37]/15 text-[#D4AF37]' : 'text-[#F5F5DC]/50 hover:bg-white/[0.06]'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

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
        updateTransaction,
        deleteTransaction,
        bulkDeleteTransactions,
    } = useBudgetStore();

    const [sheetOpen, setSheetOpen] = useState(false);
    const [selectedTxIds, setSelectedTxIds] = useState<Set<number>>(new Set());
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
    const [editingTx, setEditingTx] = useState<BudgetTransaction | null>(null);

    // ─── Search & Filter State ──────────────────────────
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('');       // '' | 'income' | 'expense'
    const [filterSource, setFilterSource] = useState('');   // '' | 'AMEX' | 'HSBC' etc.
    const [filterCategory, setFilterCategory] = useState(''); // '' | category_id as string
    const [showFilters, setShowFilters] = useState(false);

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

    // ─── Derived filter options ─────────────────────────
    const sourceOptions = useMemo(() => {
        const sources = new Set<string>();
        for (const tx of transactions) {
            if (tx.source) sources.add(tx.source);
        }
        return Array.from(sources)
            .sort()
            .map(s => ({ value: s, label: s }));
    }, [transactions]);

    const categoryOptions = useMemo(() => {
        return categories
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(c => ({ value: String(c.id), label: `${c.icon || '💸'} ${c.name}` }));
    }, [categories]);

    const hasActiveFilters = searchQuery || filterType || filterSource || filterCategory;

    const clearAllFilters = () => {
        setSearchQuery('');
        setFilterType('');
        setFilterSource('');
        setFilterCategory('');
    };

    // ─── Apply filters ──────────────────────────────────
    const filteredTransactions = useMemo(() => {
        let filtered = transactions;

        // Text search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(tx => {
                const desc = (tx.description || '').toLowerCase();
                const cat = categories.find(c => c.id === tx.category_id);
                const catName = (cat?.name || '').toLowerCase();
                const src = (tx.source || '').toLowerCase();
                return desc.includes(q) || catName.includes(q) || src.includes(q);
            });
        }

        // Type filter
        if (filterType) {
            filtered = filtered.filter(tx => {
                const cat = categories.find(c => c.id === tx.category_id);
                if (filterType === 'income') return cat?.is_income === 1;
                if (filterType === 'expense') return cat?.is_income === 0;
                return true;
            });
        }

        // Source filter
        if (filterSource) {
            filtered = filtered.filter(tx => tx.source === filterSource);
        }

        // Category filter
        if (filterCategory) {
            filtered = filtered.filter(tx => String(tx.category_id) === filterCategory);
        }

        return filtered;
    }, [transactions, categories, searchQuery, filterType, filterSource, filterCategory]);

    // ─── Group transactions by day ──────────────────────────
    const dayGroups = useMemo(() => {
        const map = new Map<string, typeof filteredTransactions>();
        for (const tx of filteredTransactions) {
            const day = tx.date; // YYYY-MM-DD
            if (!map.has(day)) map.set(day, []);
            map.get(day)!.push(tx);
        }
        // Sort days descending (most recent first)
        return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
    }, [filteredTransactions]);

    // ─── Totals (from filtered results) ─────────────────
    const { incomeCents, expenseCents } = useMemo(() => {
        let inc = 0, exp = 0;
        for (const tx of filteredTransactions) {
            const cat = categories.find(c => c.id === tx.category_id);
            if (cat?.is_income === 1) inc += tx.amount_cents;
            else exp += tx.amount_cents;
        }
        return { incomeCents: inc, expenseCents: exp };
    }, [filteredTransactions, categories]);
    const netCents = incomeCents - expenseCents;

    const handleAddTransaction = async (body: {
        category_id: number;
        amount_cents: number;
        description: string | null;
        date: string;
        source?: string | null;
    }) => {
        await addTransaction({
            ...body,
            currency: displayCurrency,
            is_recurring: false,
        });
    };

    const handleSelectAll = () => {
        if (selectedTxIds.size === filteredTransactions.length && filteredTransactions.length > 0) {
            setSelectedTxIds(new Set());
        } else {
            setSelectedTxIds(new Set(filteredTransactions.map(t => t.id)));
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

            {/* ─── Search & Filters Bar ─── */}
            <div className="relative z-30 rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-4 mb-4">
                {/* Search Input */}
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F5F5DC]/25" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search transactions..."
                        className="w-full pl-9 pr-16 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl
                            text-sm font-space text-[#F5F5DC]/80 placeholder:text-[#F5F5DC]/20
                            focus:outline-none focus:border-[#D4AF37]/30 focus:bg-white/[0.05]
                            transition-all duration-200"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="p-1 rounded-md hover:bg-white/[0.06] transition-colors"
                            >
                                <X size={12} className="text-[#F5F5DC]/30" />
                            </button>
                        )}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-1.5 rounded-lg transition-all duration-200 ${
                                showFilters || hasActiveFilters
                                    ? 'bg-[#D4AF37]/15 text-[#D4AF37]'
                                    : 'hover:bg-white/[0.06] text-[#F5F5DC]/30'
                            }`}
                        >
                            <SlidersHorizontal size={14} />
                        </button>
                    </div>
                </div>

                {/* Filter Pills */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ overflow: 'visible' }}
                        >
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.04] flex-wrap">
                                <FilterPill
                                    label="Type"
                                    value={filterType}
                                    onChange={setFilterType}
                                    options={[
                                        { value: 'expense', label: 'Expense' },
                                        { value: 'income', label: 'Income' },
                                    ]}
                                />
                                {sourceOptions.length > 0 && (
                                    <FilterPill
                                        label="Provider"
                                        value={filterSource}
                                        onChange={setFilterSource}
                                        options={sourceOptions}
                                    />
                                )}
                                {categoryOptions.length > 0 && (
                                    <FilterPill
                                        label="Category"
                                        value={filterCategory}
                                        onChange={setFilterCategory}
                                        options={categoryOptions}
                                    />
                                )}
                                {hasActiveFilters && (
                                    <button
                                        onClick={clearAllFilters}
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-space
                                            text-red-400/70 hover:text-red-400 hover:bg-red-500/10
                                            border border-transparent hover:border-red-500/20 transition-all duration-200"
                                    >
                                        <X size={10} />
                                        Clear
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Active filter count badge */}
                {hasActiveFilters && !showFilters && (
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-space text-[#D4AF37]/60 uppercase tracking-[1px]">
                            {filteredTransactions.length} of {transactions.length} transactions
                        </span>
                        <button
                            onClick={clearAllFilters}
                            className="text-[10px] font-space text-red-400/50 hover:text-red-400 transition-colors"
                        >
                            Clear filters
                        </button>
                    </div>
                )}
            </div>

            {/* Transaction list */}
            {!loading && filteredTransactions.length > 0 && (
                <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-5 mb-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col">
                            <span className="text-2xs text-[#F5F5DC]/25 uppercase tracking-[2px] font-space mb-1">Income</span>
                            <span className="text-lg font-bebas tracking-wider text-[#34D399]">
                                {formatCents(incomeCents, displayCurrency)}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-2xs text-[#F5F5DC]/25 uppercase tracking-[2px] font-space mb-1">Spent</span>
                            <span className="text-lg font-bebas tracking-wider text-[#F5F5DC]/50">
                                {formatCents(expenseCents, displayCurrency)}
                            </span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-2xs text-[#F5F5DC]/25 uppercase tracking-[2px] font-space mb-1">Net</span>
                            <span className={`text-lg font-bebas tracking-wider ${netCents >= 0 ? 'text-[#34D399] drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]' : 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]'}`}>
                                {netCents < 0 ? '-' : '+'}{formatCents(Math.abs(netCents), displayCurrency)}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Selection Toolbar */}
            {!loading && filteredTransactions.length > 0 && (
                <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] px-4 py-3 mb-4">
                    <div className="flex items-center justify-between">
                        <button 
                            onClick={handleSelectAll}
                            className="flex items-center gap-2 text-sm font-space text-[#F5F5DC]/60 hover:text-[#D4AF37] transition-colors"
                        >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                selectedTxIds.size > 0 
                                    ? selectedTxIds.size === filteredTransactions.length 
                                        ? 'bg-[#D4AF37] border-[#D4AF37]' 
                                        : 'bg-[#D4AF37]/50 border-[#D4AF37]'
                                    : 'border-white/[0.2] bg-white/[0.02]'
                            }`}>
                                {selectedTxIds.size === filteredTransactions.length && (
                                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1.5 4.5L3.5 6.5L8.5 1.5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                )}
                                {selectedTxIds.size > 0 && selectedTxIds.size < filteredTransactions.length && (
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
                    {hasActiveFilters ? (
                        <>
                            <p className="text-4xl mb-3">🔍</p>
                            <p className="text-[#F5F5DC]/30 text-sm font-space">
                                No transactions match your filters.
                            </p>
                            <button
                                onClick={clearAllFilters}
                                className="mt-3 text-xs font-space text-[#D4AF37]/60 hover:text-[#D4AF37] transition-colors"
                            >
                                Clear all filters
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="text-4xl mb-3">📝</p>
                            <p className="text-[#F5F5DC]/30 text-sm font-space">
                                No transactions this month.
                            </p>
                            <p className="text-[#F5F5DC]/20 text-xs font-space mt-1">
                                Tap the + button to add one.
                            </p>
                        </>
                    )}
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
                        onEdit={setEditingTx}
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

            {/* Edit Transaction Modal */}
            <EditTransactionModal
                isOpen={editingTx !== null}
                transaction={editingTx}
                categories={categories}
                onClose={() => setEditingTx(null)}
                onSave={async (body) => {
                    await updateTransaction(body);
                    useBudgetStore.setState({ toastError: '✅ Transaction updated.' });
                }}
            />

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
