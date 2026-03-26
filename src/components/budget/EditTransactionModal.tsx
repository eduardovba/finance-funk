'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { z } from 'zod';
import { parseToCents } from '@/lib/budgetUtils';
import CategoryPicker from '@/components/budget/CategoryPicker';
import type { BudgetCategory, BudgetTransaction } from '@/types';

// ═══════════ Client-side Zod schema ═══════════

const EditSchema = z.object({
    amount_cents: z.number().int().positive('Amount must be greater than zero'),
    category_id: z.number().int().positive('Please select a category'),
    description: z.string().optional().nullable(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
});

const CURRENCY_OPTIONS = ['BRL', 'GBP', 'USD', 'EUR', 'JPY', 'CHF', 'AUD'];

interface EditTransactionModalProps {
    isOpen: boolean;
    transaction: BudgetTransaction | null;
    categories: BudgetCategory[];
    onClose: () => void;
    onSave: (body: {
        id: number;
        category_id: number;
        amount_cents: number;
        currency: string;
        description: string | null;
        date: string;
        source: string | null;
    }) => Promise<void>;
}

export default function EditTransactionModal({ isOpen, transaction, categories, onClose, onSave }: EditTransactionModalProps) {
    const [amountStr, setAmountStr] = useState('');
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [description, setDescription] = useState('');
    const [dateStr, setDateStr] = useState('');
    const [currency, setCurrency] = useState('BRL');
    const [isIncome, setIsIncome] = useState(false);
    const [source, setSource] = useState('');
    const [errors, setErrors] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Filter categories based on income/expense toggle
    const filteredCategories = useMemo(
        () => categories.filter(c => (isIncome ? c.is_income === 1 : c.is_income === 0)),
        [categories, isIncome]
    );

    // Pre-fill form when transaction changes
    useEffect(() => {
        if (transaction) {
            // Show the raw stored amount in the transaction's native currency
            const formatted = (transaction.amount_cents / 100).toFixed(2);
            setAmountStr(formatted);
            setCategoryId(transaction.category_id);
            setDescription(transaction.description || '');
            setDateStr(transaction.date);
            setCurrency(transaction.currency || 'BRL');
            setSource(transaction.source || '');
            setErrors([]);

            // Derive income/expense from the transaction's category
            const cat = categories.find(c => c.id === transaction.category_id);
            setIsIncome(cat?.is_income === 1);
        }
    }, [transaction, categories]);

    // When toggling income/expense, clear category if it doesn't match
    const handleToggleType = (newIsIncome: boolean) => {
        setIsIncome(newIsIncome);
        const currentCat = categories.find(c => c.id === categoryId);
        if (currentCat && (currentCat.is_income === 1) !== newIsIncome) {
            setCategoryId(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!transaction) return;
        setErrors([]);

        const cents = parseToCents(amountStr);

        const result = EditSchema.safeParse({
            amount_cents: cents,
            category_id: categoryId,
            description: description || undefined,
            date: dateStr,
        });

        if (!result.success) {
            setErrors(result.error.issues.map(i => i.message));
            return;
        }

        setSubmitting(true);
        try {
            await onSave({
                id: transaction.id,
                category_id: result.data.category_id,
                amount_cents: result.data.amount_cents,
                currency,
                description: result.data.description ?? null,
                date: result.data.date,
                source: source || null,
            });
            onClose();
        } catch {
            setErrors(['Failed to update. Please try again.']);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && transaction && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[500]"
                        onClick={onClose}
                    />

                    {/* Sheet — bottom sheet on mobile, side panel on desktop */}
                    <motion.div
                        initial={{ y: '100%', x: 0 }}
                        animate={{ y: 0, x: 0 }}
                        exit={{ y: '100%', x: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="
                            fixed z-[500] overflow-y-auto
                            bottom-0 left-0 right-0 max-h-[85vh] rounded-t-3xl
                            md:bottom-auto md:top-0 md:left-auto md:right-0 md:w-[420px] md:h-full md:max-h-full md:rounded-t-none md:rounded-l-3xl
                            bg-[#0D0F12]/95 backdrop-blur-xl border-t border-white/[0.08]
                            md:border-t-0 md:border-l md:border-white/[0.08]
                            shadow-[0_-8px_40px_rgba(0,0,0,0.6)]
                        "
                    >
                        {/* Handle bar (mobile) */}
                        <div className="md:hidden flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-white/20" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pt-4 pb-3">
                            <h2 className="text-xl font-bebas tracking-wide text-[#D4AF37]">Edit Transaction</h2>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-white/[0.08] transition-colors"
                            >
                                <X size={18} className="text-[#F5F5DC]/40" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="px-6 pb-8 flex flex-col gap-5">
                            {/* Income / Expense Toggle */}
                            <div>
                                <label className="text-xs text-[#F5F5DC]/40 uppercase tracking-[2px] font-space mb-2 block">
                                    Type
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleToggleType(false)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-space font-medium transition-all ${
                                            !isIncome
                                                ? 'bg-red-400/10 border-red-400/30 text-red-400'
                                                : 'bg-white/[0.02] border-white/[0.06] text-[#F5F5DC]/30 hover:bg-white/[0.04]'
                                        }`}
                                    >
                                        <ArrowDownCircle size={16} />
                                        Expense
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleToggleType(true)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-space font-medium transition-all ${
                                            isIncome
                                                ? 'bg-[#34D399]/10 border-[#34D399]/30 text-[#34D399]'
                                                : 'bg-white/[0.02] border-white/[0.06] text-[#F5F5DC]/30 hover:bg-white/[0.04]'
                                        }`}
                                    >
                                        <ArrowUpCircle size={16} />
                                        Income
                                    </button>
                                </div>
                            </div>

                            {/* Amount + Currency */}
                            <div>
                                <label className="text-xs text-[#F5F5DC]/40 uppercase tracking-[2px] font-space mb-2 block">
                                    Amount
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        value={amountStr}
                                        onChange={e => setAmountStr(e.target.value)}
                                        className="flex-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#D4AF37] text-2xl font-bebas tracking-wide placeholder:text-[#F5F5DC]/15 focus:outline-none focus:border-[#D4AF37]/40 transition-colors"
                                        autoFocus
                                    />
                                    <select
                                        value={currency}
                                        onChange={e => setCurrency(e.target.value)}
                                        className="w-20 px-2 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#F5F5DC]/70 text-sm font-space focus:outline-none focus:border-[#D4AF37]/40 transition-colors appearance-none text-center cursor-pointer"
                                    >
                                        {CURRENCY_OPTIONS.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Category Picker */}
                            <div>
                                <label className="text-xs text-[#F5F5DC]/40 uppercase tracking-[2px] font-space mb-2 block">
                                    Category
                                </label>
                                <CategoryPicker
                                    categories={filteredCategories}
                                    selectedId={categoryId}
                                    onSelect={setCategoryId}
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs text-[#F5F5DC]/40 uppercase tracking-[2px] font-space mb-2 block">
                                    Description
                                </label>
                                <input
                                    type="text"
                                    placeholder="What's this for?"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#F5F5DC]/80 text-sm font-space placeholder:text-[#F5F5DC]/15 focus:outline-none focus:border-[#D4AF37]/40 transition-colors"
                                />
                            </div>

                            {/* Date */}
                            <div>
                                <label className="text-xs text-[#F5F5DC]/40 uppercase tracking-[2px] font-space mb-2 block">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={dateStr}
                                    onChange={e => setDateStr(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#F5F5DC]/80 text-sm font-space focus:outline-none focus:border-[#D4AF37]/40 transition-colors [color-scheme:dark]"
                                />
                            </div>

                            {/* Source (read-only display) */}
                            {source && (
                                <div>
                                    <label className="text-xs text-[#F5F5DC]/40 uppercase tracking-[2px] font-space mb-2 block">
                                        Source
                                    </label>
                                    <div className="px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[#F5F5DC]/40 text-sm font-space">
                                        {source}
                                    </div>
                                </div>
                            )}

                            {/* Validation errors */}
                            {errors.length > 0 && (
                                <div className="flex flex-col gap-1 px-1">
                                    {errors.map((err, i) => (
                                        <span key={i} className="text-xs text-red-400 font-space">{err}</span>
                                    ))}
                                </div>
                            )}

                            {/* Submit */}
                            <motion.button
                                type="submit"
                                disabled={submitting}
                                whileTap={{ scale: 0.97 }}
                                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#D4AF37] text-black font-space font-semibold text-sm tracking-wider uppercase
                                    hover:bg-[#D4AF37]/90 active:bg-[#D4AF37]/80 disabled:opacity-40 transition-all shadow-[0_4px_20px_rgba(212,175,55,0.3)]"
                            >
                                <Save size={16} />
                                {submitting ? 'Saving...' : 'Save Changes'}
                            </motion.button>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
