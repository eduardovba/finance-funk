'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Receipt, Store } from 'lucide-react';
import { normalizeVendor } from '@/lib/vendorNormalize';
import { formatCents } from '@/lib/budgetUtils';
import { convertCurrency } from '@/lib/fxConvert';
import useBudgetStore from '@/stores/useBudgetStore';
import type { BudgetCategory, BudgetTransaction } from '@/types';

interface Props {
    categories: BudgetCategory[];
    transactions: BudgetTransaction[];
}

interface RankedItem {
    name: string;
    totalCents: number;
    count: number;
    category: BudgetCategory | undefined;
}

/* ─── Shared list renderer ─── */
function RankedList({ items, maxCents, fx, displayCurrency }: {
    items: RankedItem[];
    maxCents: number;
    fx: (c: number) => number;
    displayCurrency: string;
}) {
    return (
        <div className="flex flex-col gap-3">
            {items.map((m, i) => {
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
                                    <span className="text-2xs text-[#F5F5DC]/25 font-space flex-shrink-0">
                                        ×{m.count}
                                    </span>
                                )}
                            </div>
                            <span className="text-data-sm font-space  text-[#F5F5DC]/60 flex-shrink-0 ml-2">
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
    );
}

export default function TopMerchantsCard({ categories, transactions }: Props) {
    const { displayCurrency, fxRates } = useBudgetStore();
    const fx = (cents: number) => convertCurrency(cents, displayCurrency, displayCurrency, fxRates);

    // Only expense transactions
    const expenseIds = new Set(categories.filter(c => c.is_income === 0).map(c => c.id));
    const expenseTxs = transactions.filter(t => t.category_id !== null && expenseIds.has(t.category_id));

    if (expenseTxs.length === 0) return null;

    // ── Left: Top Spends (individual transactions, largest single purchases) ──
    const topSpends: RankedItem[] = [...expenseTxs]
        .sort((a, b) => b.amount_cents - a.amount_cents)
        .slice(0, 5)
        .map(tx => ({
            name: tx.description || 'Transaction',
            totalCents: tx.amount_cents,
            count: 1,
            category: categories.find(c => c.id === tx.category_id),
        }));

    // ── Right: Top Vendors (grouped by normalised vendor name) ──
    const vendorMap = new Map<string, { totalCents: number; count: number; categoryId: number | null }>();
    for (const tx of expenseTxs) {
        const key = normalizeVendor(tx.description || 'Unknown');
        const existing = vendorMap.get(key);
        if (existing) {
            existing.totalCents += tx.amount_cents;
            existing.count += 1;
        } else {
            vendorMap.set(key, { totalCents: tx.amount_cents, count: 1, categoryId: tx.category_id });
        }
    }

    const topVendors: RankedItem[] = Array.from(vendorMap.entries())
        .map(([name, data]) => ({
            name,
            totalCents: data.totalCents,
            count: data.count,
            category: categories.find(c => c.id === data.categoryId),
        }))
        .sort((a, b) => b.totalCents - a.totalCents)
        .slice(0, 5);

    const maxSpend = topSpends[0]?.totalCents || 1;
    const maxVendor = topVendors[0]?.totalCents || 1;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Left — Top Spends */}
            <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Receipt size={15} className="text-[#D4AF37]/70" />
                    <h3 className="text-[#D4AF37] text-lg font-normal font-bebas tracking-wide">Top Spends</h3>
                </div>
                <RankedList items={topSpends} maxCents={maxSpend} fx={fx} displayCurrency={displayCurrency} />
            </div>

            {/* Right — Top Vendors */}
            <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Store size={15} className="text-[#D4AF37]/70" />
                    <h3 className="text-[#D4AF37] text-lg font-normal font-bebas tracking-wide">Top Vendors</h3>
                </div>
                <RankedList items={topVendors} maxCents={maxVendor} fx={fx} displayCurrency={displayCurrency} />
            </div>
        </div>
    );
}
