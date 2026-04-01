'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, ChevronDown } from 'lucide-react';
import { z } from 'zod';
import { parseToCents, todayISO } from '@/lib/budgetUtils';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import useBudgetStore from '@/stores/useBudgetStore';
import CategoryPicker from '@/components/budget/CategoryPicker';
import type { BudgetCategory } from '@/types';

// ═══════════ Client-side Zod schema ═══════════

const QuickAddSchema = z.object({
    amount_cents: z.number().int().positive('Amount must be greater than zero'),
    category_id: z.number().int().positive('Please select a category'),
    description: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
});

// ═══════════ Provider options ═══════════

const PROVIDERS = [
    { value: 'Manual', label: 'Manual', icon: '✏️' },
    { value: 'AMEX', label: 'Amex', icon: '💳' },
    { value: 'HSBC', label: 'HSBC', icon: '🏦' },
    { value: 'BARCLAYS', label: 'Barclays', icon: '🏦' },
    { value: 'LLOYDS', label: 'Lloyds', icon: '🏦' },
    { value: 'MONZO', label: 'Monzo', icon: '📱' },
    { value: 'SANTANDER', label: 'Santander', icon: '🏦' },
    { value: 'NUBANK', label: 'Nubank', icon: '💜' },
];

interface QuickAddSheetProps {
    isOpen: boolean;
    onClose: () => void;
    categories: BudgetCategory[];
    onSubmit: (body: {
        category_id: number;
        amount_cents: number;
        description: string | null;
        date: string;
        source?: string | null;
    }) => Promise<void>;
}

export default function QuickAddSheet({ isOpen, onClose, categories, onSubmit }: QuickAddSheetProps) {
    const { displayCurrency } = useBudgetStore();
    const currencyMeta = SUPPORTED_CURRENCIES[displayCurrency] ?? SUPPORTED_CURRENCIES.BRL;
    const [amountStr, setAmountStr] = useState('');
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [description, setDescription] = useState('');
    const [dateStr, setDateStr] = useState(todayISO());
    const [source, setSource] = useState('Manual');
    const [errors, setErrors] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const resetForm = useCallback(() => {
        setAmountStr('');
        setCategoryId(null);
        setDescription('');
        setDateStr(todayISO());
        setSource('Manual');
        setErrors([]);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors([]);

        // Parse amount using safe string-to-integer utility
        const cents = parseToCents(amountStr);

        if (!amountStr.trim() || isNaN(cents) || cents <= 0) {
            setErrors(['Please enter a valid amount (e.g. 45.50)']);
            return;
        }

        // Validate with Zod
        const result = QuickAddSchema.safeParse({
            amount_cents: cents,
            category_id: categoryId,
            description: description || undefined,
            date: dateStr,
        });

        if (!result.success) {
            setErrors(result.error.issues.map(e => e.message));
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit({
                category_id: result.data.category_id,
                amount_cents: result.data.amount_cents,
                description: result.data.description ?? null,
                date: result.data.date,
                source,
            });
            resetForm();
            onClose();
        } catch {
            setErrors(['Submission failed. Please try again.']);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
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
                            <h2 className="text-xl font-bebas tracking-wide text-[#D4AF37]">Add Transaction</h2>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-white/[0.08] transition-colors"
                            >
                                <X size={18} className="text-[#F5F5DC]/40" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="px-6 pb-8 flex flex-col gap-5">
                            {/* Amount */}
                            <div>
                                <label className="text-xs text-[#F5F5DC]/40 uppercase tracking-[2px] font-space mb-2 block">
                                    Amount ({currencyMeta.symbol})
                                </label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0,00"
                                    value={amountStr}
                                    onChange={e => setAmountStr(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#D4AF37] text-2xl font-bebas tracking-wide placeholder:text-[#F5F5DC]/15 focus:outline-none focus:border-[#D4AF37]/40 transition-colors"
                                    autoFocus
                                />
                            </div>

                            {/* Category Picker */}
                            <div>
                                <label className="text-xs text-[#F5F5DC]/40 uppercase tracking-[2px] font-space mb-2 block">
                                    Category
                                </label>
                                <CategoryPicker
                                    categories={categories}
                                    selectedId={categoryId}
                                    onSelect={setCategoryId}
                                />
                            </div>

                            {/* Provider */}
                            <div>
                                <label className="text-xs text-[#F5F5DC]/40 uppercase tracking-[2px] font-space mb-2 block">
                                    Provider
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {PROVIDERS.map(p => {
                                        const isActive = source === p.value;
                                        return (
                                            <button
                                                key={p.value}
                                                type="button"
                                                onClick={() => setSource(p.value)}
                                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-space font-medium
                                                    tracking-wider transition-all duration-200 border ${
                                                    isActive
                                                        ? 'bg-[#D4AF37]/15 border-[#D4AF37]/40 text-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.1)]'
                                                        : 'bg-white/[0.03] border-white/[0.06] text-[#F5F5DC]/40 hover:text-[#F5F5DC]/60 hover:border-white/[0.12]'
                                                }`}
                                            >
                                                <span className="text-sm">{p.icon}</span>
                                                <span>{p.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
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
                                <Send size={16} />
                                {submitting ? 'Saving...' : 'Add Transaction'}
                            </motion.button>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
