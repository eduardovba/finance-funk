'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { formatCents } from '@/lib/budgetUtils';
import { convertCurrency } from '@/lib/fxConvert';
import useBudgetStore from '@/stores/useBudgetStore';
import type { BudgetCategory, BudgetTransaction } from '@/types';

interface CategoryBreakdownProps {
    categories: BudgetCategory[];
    transactions: BudgetTransaction[];
}

interface CategorySummary {
    category: BudgetCategory;
    spentCents: number;
    targetCents: number;
    isOverBudget: boolean;
    progressPercent: number;
}

export default function CategoryBreakdown({ categories, transactions }: CategoryBreakdownProps) {
    const { displayCurrency, fxRates } = useBudgetStore();
    const fx = (cents: number) => convertCurrency(cents, displayCurrency, displayCurrency, fxRates);
    // Compute per-category spending (all integer arithmetic)
    const summaries: CategorySummary[] = categories
        .filter(c => c.is_income === 0)   // Only expense categories
        .map(cat => {
            const spentCents = transactions
                .filter(t => t.category_id === cat.id)
                .reduce((sum, t) => sum + t.amount_cents, 0);

            const targetCents = cat.monthly_target_cents;
            const isOverBudget = targetCents > 0 && spentCents > targetCents;
            // Integer arithmetic: (spent * 100) / target gives integer percentage
            const progressPercent = targetCents > 0
                ? Math.min((spentCents * 100) / targetCents, 150) // cap at 150% for visual
                : 0;

            return { category: cat, spentCents, targetCents, isOverBudget, progressPercent };
        })
        .sort((a, b) => b.spentCents - a.spentCents);

    if (summaries.length === 0) {
        return (
            <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-6 mb-4">
                <h3 className="text-[#D4AF37] text-xl font-normal font-bebas tracking-wide mb-4">Category Breakdown</h3>
                <p className="text-[#F5F5DC]/30 text-sm font-space text-center py-8">
                    No expense categories yet. Add categories to track spending.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-6 mb-4">
            <h3 className="text-[#D4AF37] text-xl font-normal font-bebas tracking-wide mb-5">Category Breakdown</h3>

            <div className="flex flex-col gap-4">
                {summaries.map((item, i) => (
                    <motion.div
                        key={item.category.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex flex-col gap-2"
                    >
                        {/* Label row */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                                {item.category.icon && (
                                    <span className="text-base flex-shrink-0">{item.category.icon}</span>
                                )}
                                <span className="text-sm font-space text-[#F5F5DC]/70 truncate">
                                    {item.category.name}
                                </span>
                                {item.isOverBudget && (
                                    <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className={`text-sm font-mono tabular-nums ${item.isOverBudget ? 'text-red-400' : 'text-[#F5F5DC]/60'}`}>
                                    {formatCents(fx(item.spentCents), displayCurrency)}
                                </span>
                                {item.targetCents > 0 && (
                                    <span className="text-xs font-mono tabular-nums text-[#F5F5DC]/25">
                                        / {formatCents(item.targetCents, displayCurrency)}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Progress bar */}
                        {item.targetCents > 0 && (
                            <div className="h-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{
                                        backgroundColor: item.isOverBudget ? '#ef4444' : (item.category.color || '#D4AF37'),
                                    }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(item.progressPercent, 100)}%` }}
                                    transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.05 }}
                                />
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
