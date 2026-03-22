'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Store } from 'lucide-react';
import { formatCents } from '@/lib/budgetUtils';
import { convertCurrency } from '@/lib/fxConvert';
import useBudgetStore from '@/stores/useBudgetStore';
import type { BudgetCategory, BudgetTransaction } from '@/types';

interface Props {
    categories: BudgetCategory[];
    transactions: BudgetTransaction[];
}

export default function TopMerchantsCard({ categories, transactions }: Props) {
    const { displayCurrency, fxRates } = useBudgetStore();
    const fx = (cents: number) => convertCurrency(cents, displayCurrency, displayCurrency, fxRates);

    // Only expense transactions
    const expenseIds = new Set(categories.filter(c => c.is_income === 0).map(c => c.id));
    const expenseTxs = transactions.filter(t => t.category_id !== null && expenseIds.has(t.category_id));

    // Group by description
    const merchantMap = new Map<string, { totalCents: number; count: number; categoryId: number | null }>();
    for (const tx of expenseTxs) {
        const key = (tx.description || 'Unknown').trim();
        const existing = merchantMap.get(key);
        if (existing) {
            existing.totalCents += tx.amount_cents;
            existing.count += 1;
        } else {
            merchantMap.set(key, { totalCents: tx.amount_cents, count: 1, categoryId: tx.category_id });
        }
    }

    const merchants = Array.from(merchantMap.entries())
        .map(([name, data]) => ({
            name,
            totalCents: data.totalCents,
            count: data.count,
            category: categories.find(c => c.id === data.categoryId),
        }))
        .sort((a, b) => b.totalCents - a.totalCents)
        .slice(0, 5);

    const maxCents = merchants[0]?.totalCents || 1;

    if (merchants.length === 0) return null;

    return (
        <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-6 mb-4">
            <div className="flex items-center gap-2 mb-5">
                <Store size={16} className="text-[#D4AF37]/70" />
                <h3 className="text-[#D4AF37] text-xl font-normal font-bebas tracking-wide">Top Spends</h3>
            </div>

            <div className="flex flex-col gap-3">
                {merchants.map((m, i) => {
                    const barWidth = (m.totalCents / maxCents) * 100;
                    return (
                        <motion.div
                            key={m.name}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className="flex flex-col gap-1.5"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-base flex-shrink-0">{m.category?.icon || '💸'}</span>
                                    <span className="text-sm font-space text-[#F5F5DC]/70 truncate">
                                        {m.name}
                                    </span>
                                    {m.count > 1 && (
                                        <span className="text-[0.55rem] text-[#F5F5DC]/25 font-space">
                                            ×{m.count}
                                        </span>
                                    )}
                                </div>
                                <span className="text-sm font-mono tabular-nums text-[#F5F5DC]/60 flex-shrink-0">
                                    {formatCents(fx(m.totalCents), displayCurrency)}
                                </span>
                            </div>
                            <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: m.category?.color || '#D4AF37' }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${barWidth}%` }}
                                    transition={{ duration: 0.5, ease: 'easeOut', delay: i * 0.06 }}
                                />
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
