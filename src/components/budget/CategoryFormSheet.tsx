'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { z } from 'zod';
import { parseToCents, formatCents } from '@/lib/budgetUtils';
import ColorPicker from '@/components/budget/ColorPicker';
import EmojiPicker from '@/components/budget/EmojiPicker';
import useBudgetStore from '@/stores/useBudgetStore';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import type { BudgetCategory } from '@/types';

// ═══════════ Client-side Zod schema ═══════════

const CategoryFormSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    icon: z.string().nullable(),
    color: z.string().nullable(),
    monthly_target_cents: z.number().int().min(0, 'Target must be ≥ 0'),
    is_income: z.boolean(),
});

interface CategoryFormSheetProps {
    isOpen: boolean;
    onClose: () => void;
    /** Pass a category to edit, or null for create mode */
    editCategory: BudgetCategory | null;
    onSubmitCreate: (body: Omit<BudgetCategory, 'id' | 'user_id'>) => Promise<void>;
    onSubmitUpdate: (body: BudgetCategory) => Promise<void>;
}

export default function CategoryFormSheet({
    isOpen, onClose, editCategory, onSubmitCreate, onSubmitUpdate,
}: CategoryFormSheetProps) {
    const isEdit = editCategory !== null;
    const displayCurrency = useBudgetStore(s => s.displayCurrency);
    const currencyMeta = SUPPORTED_CURRENCIES[displayCurrency] ?? SUPPORTED_CURRENCIES.BRL;
    const currencySymbol = currencyMeta.symbol;

    const [name, setName] = useState('');
    const [icon, setIcon] = useState<string | null>(null);
    const [color, setColor] = useState<string | null>('#D4AF37');
    const [targetStr, setTargetStr] = useState('');
    const [isIncome, setIsIncome] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Populate form when editing
    useEffect(() => {
        if (editCategory) {
            setName(editCategory.name);
            setIcon(editCategory.icon);
            setColor(editCategory.color);
            setTargetStr(editCategory.monthly_target_cents > 0
                ? (editCategory.monthly_target_cents / 100).toFixed(2)
                : '');
            setIsIncome(editCategory.is_income === 1);
        } else {
            resetForm();
        }
    }, [editCategory, isOpen]);

    const resetForm = useCallback(() => {
        setName('');
        setIcon(null);
        setColor('#D4AF37');
        setTargetStr('');
        setIsIncome(false);
        setErrors([]);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors([]);

        // ─── parseToCents at the input boundary ──────────────
        const monthly_target_cents = targetStr.trim() ? parseToCents(targetStr) : 0;

        const result = CategoryFormSchema.safeParse({
            name,
            icon,
            color,
            monthly_target_cents,
            is_income: isIncome,
        });

        if (!result.success) {
            setErrors(result.error.issues.map(e => e.message));
            return;
        }

        setSubmitting(true);
        try {
            if (isEdit && editCategory) {
                await onSubmitUpdate({
                    ...editCategory,
                    name: result.data.name,
                    icon: result.data.icon,
                    color: result.data.color,
                    monthly_target_cents: result.data.monthly_target_cents,
                    is_income: result.data.is_income ? 1 : 0,
                });
            } else {
                await onSubmitCreate({
                    name: result.data.name,
                    icon: result.data.icon,
                    color: result.data.color,
                    monthly_target_cents: result.data.monthly_target_cents,
                    parent_id: null,
                    sort_order: 0,
                    is_income: result.data.is_income ? 1 : 0,
                });
            }
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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                        onClick={onClose}
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: '100%', x: 0 }}
                        animate={{ y: 0, x: 0 }}
                        exit={{ y: '100%', x: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="
                            fixed z-[70] overflow-y-auto
                            bottom-0 left-0 right-0 max-h-[90vh] rounded-t-3xl
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
                            <h2 className="text-xl font-bebas tracking-wide text-[#D4AF37]">
                                {isEdit ? 'Edit Category' : 'Add Category'}
                            </h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/[0.08] transition-colors">
                                <X size={18} className="text-[#F5F5DC]/40" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="px-6 pb-8 flex flex-col gap-5">
                            {/* Name */}
                            <div>
                                <label className="text-[0.75rem] text-[#F5F5DC]/40 uppercase tracking-[2px] font-space mb-2 block">Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Groceries"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#F5F5DC]/80 text-sm font-space placeholder:text-[#F5F5DC]/15 focus:outline-none focus:border-[#D4AF37]/40 transition-colors"
                                    autoFocus
                                />
                            </div>

                            {/* Icon */}
                            <div>
                                <label className="text-[0.75rem] text-[#F5F5DC]/40 uppercase tracking-[2px] font-space mb-2 block">Icon</label>
                                <EmojiPicker selected={icon} onSelect={setIcon} />
                            </div>

                            {/* Color */}
                            <div>
                                <label className="text-[0.75rem] text-[#F5F5DC]/40 uppercase tracking-[2px] font-space mb-2 block">Color</label>
                                <ColorPicker selected={color} onSelect={setColor} />
                            </div>

                            {/* Monthly Target */}
                            <div>
                                <label className="text-[0.75rem] text-[#F5F5DC]/40 uppercase tracking-[2px] font-space mb-2 block">
                                    Monthly Target ({currencySymbol})
                                </label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0,00"
                                    value={targetStr}
                                    onChange={e => setTargetStr(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#D4AF37] text-xl font-bebas tracking-wide placeholder:text-[#F5F5DC]/15 focus:outline-none focus:border-[#D4AF37]/40 transition-colors"
                                />
                            </div>

                            {/* Type toggle (create only) */}
                            {!isEdit && (
                                <div>
                                    <label className="text-[0.75rem] text-[#F5F5DC]/40 uppercase tracking-[2px] font-space mb-2 block">Type</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsIncome(false)}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-space tracking-wider uppercase border transition-all
                                                ${!isIncome
                                                    ? 'bg-[#D4AF37]/15 border-[#D4AF37]/40 text-[#D4AF37]'
                                                    : 'bg-white/[0.03] border-white/[0.06] text-[#F5F5DC]/40'
                                                }`}
                                        >
                                            Expense
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsIncome(true)}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-space tracking-wider uppercase border transition-all
                                                ${isIncome
                                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                                                    : 'bg-white/[0.03] border-white/[0.06] text-[#F5F5DC]/40'
                                                }`}
                                        >
                                            Income
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Errors */}
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
                                {submitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Category')}
                            </motion.button>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
