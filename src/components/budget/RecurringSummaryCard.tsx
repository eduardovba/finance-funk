'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Repeat } from 'lucide-react';
import { formatCents } from '@/lib/budgetUtils';
import { convertCurrency } from '@/lib/fxConvert';
import useBudgetStore from '@/stores/useBudgetStore';
import type { BudgetCategory, BudgetTransaction } from '@/types';

interface Props {
    categories: BudgetCategory[];
    transactions: BudgetTransaction[];
}

export default function RecurringSummaryCard({ categories, transactions }: Props) {
    const { displayCurrency, fxRates } = useBudgetStore();
    const fx = (cents: number) => convertCurrency(cents, displayCurrency, displayCurrency, fxRates);

    const recurringTxs = transactions.filter(t => t.is_recurring === 1);
    if (recurringTxs.length === 0) return null;

    const totalCents = recurringTxs.reduce((sum, t) => sum + t.amount_cents, 0);

    // Group by description
    const groups = new Map<string, { cents: number; categoryId: number | null }>();
    for (const tx of recurringTxs) {
        const key = (tx.description || 'Recurring').trim();
        const existing = groups.get(key);
        if (existing) {
            existing.cents += tx.amount_cents;
        } else {
            groups.set(key, { cents: tx.amount_cents, categoryId: tx.category_id });
        }
    }

    const items = Array.from(groups.entries())
        .map(([name, data]) => ({
            name,
            cents: data.cents,
            category: categories.find(c => c.id === data.categoryId),
        }))
        .sort((a, b) => b.cents - a.cents)
        .slice(0, 6);

    return (
        <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Repeat size={16} className="text-[#D4AF37]/70" />
                    <h3 className="text-[#D4AF37] text-xl font-normal font-bebas tracking-wide">Recurring Expenses</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-space text-[#F5F5DC]/35">
                        {recurringTxs.length} bill{recurringTxs.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-sm font-mono tabular-nums text-[#F5F5DC]/60">
                        {formatCents(fx(totalCents), displayCurrency)}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {items.map((item, i) => (
                    <motion.div
                        key={item.name}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 flex flex-col gap-1"
                    >
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm">{item.category?.icon || '📄'}</span>
                            <span className="text-[0.7rem] font-space text-[#F5F5DC]/50 truncate">{item.name}</span>
                        </div>
                        <span className="text-sm font-mono tabular-nums text-[#F5F5DC]/70">
                            {formatCents(fx(item.cents), displayCurrency)}
                        </span>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
