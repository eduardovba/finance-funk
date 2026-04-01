'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
    ResponsiveContainer, PieChart, Pie, Cell, Sector,
} from 'recharts';
import { BarChart3, PieChart as PieChartIcon, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { formatCents, formatDayLabel } from '@/lib/budgetUtils';
import { convertCurrency } from '@/lib/fxConvert';
import useBudgetStore from '@/stores/useBudgetStore';
import type { BudgetCategory, BudgetTransaction } from '@/types';

interface Props {
    categories: BudgetCategory[];
    transactions: BudgetTransaction[];
}

interface SliceData {
    name: string;
    icon: string;
    color: string;
    spentCents: number;
    targetCents: number;
    isOverBudget: boolean;
    progressPercent: number;
    percent: number;
    categoryId: number;
}

const VIEW_KEY = 'ff_categoryViewMode';

/* ─── Active-slice renderer for the donut ─── */
function renderActiveShape(props: any) {
    const {
        cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill,
        payload, percent,
    } = props;
    return (
        <g>
            <Sector
                cx={cx} cy={cy}
                innerRadius={innerRadius - 2}
                outerRadius={outerRadius + 6}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                opacity={0.95}
            />
            <text x={cx} y={cy - 12} textAnchor="middle" fill="#F5F5DC" fontSize="13" fontFamily="var(--font-space-grotesk), monospace" opacity={0.8}>
                {payload.icon} {payload.name}
            </text>
            <text x={cx} y={cy + 10} textAnchor="middle" fill="#F5F5DC" fontSize="11" fontFamily="var(--font-space-grotesk), monospace" opacity={0.45}>
                {(percent * 100).toFixed(1)}%
            </text>
        </g>
    );
}

/* ─── Inline transaction list for expanded categories ─── */
function CategoryTransactionList({
    transactions,
    categoryColor,
    displayCurrency,
    fxRates,
}: {
    transactions: BudgetTransaction[];
    categoryColor: string;
    displayCurrency: string;
    fxRates: Record<string, number>;
}) {
    const sorted = useMemo(
        () => [...transactions].sort((a, b) => b.date.localeCompare(a.date)),
        [transactions]
    );

    return (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
        >
            <div className="mt-2 ml-1 pl-3 border-l-2 flex flex-col gap-1" style={{ borderColor: categoryColor + '40' }}>
                {sorted.map(tx => {
                    const displayCents = convertCurrency(
                        tx.amount_cents,
                        tx.currency || 'BRL',
                        displayCurrency,
                        fxRates
                    );
                    return (
                        <div key={tx.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="text-2xs font-space text-[#F5F5DC]/25 tabular-nums flex-shrink-0 w-[52px]">
                                    {formatDayLabel(tx.date)}
                                </span>
                                <span className="text-xs font-space text-[#F5F5DC]/55 truncate">
                                    {tx.description || 'Transaction'}
                                </span>
                                {tx.source && (
                                    <span className="text-[10px] uppercase tracking-[0.5px] font-space font-semibold px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[#F5F5DC]/45 flex-shrink-0">
                                        {tx.source}
                                    </span>
                                )}
                            </div>
                            <span className="text-data-xs font-space text-[#F5F5DC]/45 tabular-nums flex-shrink-0 ml-2">
                                {formatCents(displayCents, displayCurrency)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}

export default function SpendingDonut({ categories, transactions }: Props) {
    const { displayCurrency, fxRates } = useBudgetStore();
    const fx = (cents: number) => convertCurrency(cents, displayCurrency, displayCurrency, fxRates);

    const [viewMode, setViewMode] = useState<'donut' | 'list'>('donut');
    const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    // Persist toggle
    useEffect(() => {
        try {
            const saved = localStorage.getItem(VIEW_KEY);
            if (saved === 'list' || saved === 'donut') setViewMode(saved);
        } catch { /* SSR guard */ }
    }, []);

    const toggleView = () => {
        const next = viewMode === 'donut' ? 'list' : 'donut';
        setViewMode(next);
        setExpandedCategory(null);
        try { localStorage.setItem(VIEW_KEY, next); } catch { /* noop */ }
    };

    const onPieEnter = useCallback((_: unknown, index: number) => setActiveIndex(index), []);
    const onPieLeave = useCallback(() => setActiveIndex(undefined), []);

    const toggleExpand = (name: string) => {
        setExpandedCategory(prev => prev === name ? null : name);
    };

    // ─── Data ──────────────────────────────────────────────
    const totalExpenseCents = transactions
        .filter(t => {
            const cat = categories.find(c => c.id === t.category_id);
            return cat && cat.is_income === 0;
        })
        .reduce((sum, t) => sum + t.amount_cents, 0);

    const slices: SliceData[] = categories
        .filter(c => c.is_income === 0)
        .map(cat => {
            const spentCents = transactions
                .filter(t => t.category_id === cat.id)
                .reduce((sum, t) => sum + t.amount_cents, 0);
            const targetCents = cat.monthly_target_cents;
            const isOverBudget = targetCents > 0 && spentCents > targetCents;
            const progressPercent = targetCents > 0
                ? Math.min((spentCents * 100) / targetCents, 150)
                : 0;
            return {
                name: cat.name,
                icon: cat.icon || '💸',
                color: cat.color || '#D4AF37',
                spentCents,
                targetCents,
                isOverBudget,
                progressPercent,
                percent: totalExpenseCents > 0 ? spentCents / totalExpenseCents : 0,
                categoryId: cat.id,
            };
        })
        .filter(s => s.spentCents > 0)
        .sort((a, b) => b.spentCents - a.spentCents);

    // Build a map of category name → transactions for expansion
    const categoryTransactions = useMemo(() => {
        const map = new Map<string, BudgetTransaction[]>();
        for (const slice of slices) {
            map.set(slice.name, transactions.filter(t => t.category_id === slice.categoryId));
        }
        return map;
    }, [slices, transactions]);

    if (slices.length === 0) {
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
            {/* Header with toggle */}
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-[#D4AF37] text-xl font-normal font-bebas tracking-wide">Category Breakdown</h3>
                <button
                    onClick={toggleView}
                    title={viewMode === 'donut' ? 'Switch to list view' : 'Switch to donut view'}
                    style={{ padding: 0, borderRadius: 8, background: 'transparent' }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors"
                >
                    {viewMode === 'donut'
                        ? <BarChart3 size={16} className="text-[#F5F5DC]/40" />
                        : <PieChartIcon size={16} className="text-[#F5F5DC]/40" />
                    }
                </button>
            </div>

            <AnimatePresence mode="wait">
                {viewMode === 'donut' ? (
                    <motion.div
                        key="donut"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* Donut chart */}
                        <div className="h-[260px] md:h-[300px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={slices}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius="55%"
                                        outerRadius="78%"
                                        dataKey="spentCents"
                                        activeIndex={activeIndex}
                                        activeShape={renderActiveShape}
                                        onMouseEnter={onPieEnter}
                                        onMouseLeave={onPieLeave}
                                        paddingAngle={2}
                                        stroke="none"
                                    >
                                        {slices.map((s, i) => (
                                            <Cell
                                                key={i}
                                                fill={s.color}
                                                opacity={activeIndex !== undefined && activeIndex !== i ? 0.3 : 0.85}
                                            />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Centre label (static — shows total when no slice is hovered) */}
                            {activeIndex === undefined && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-2xs text-[#F5F5DC]/35 uppercase tracking-[2px] font-space">Total Spent</span>
                                    <span className="text-xl font-bebas tracking-wider text-[#F5F5DC]/80">
                                        {formatCents(fx(totalExpenseCents), displayCurrency)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Legend pills — clickable to expand */}
                        <div className="flex flex-wrap justify-center gap-2 mt-3">
                            {slices.map((s, i) => {
                                const isExpanded = expandedCategory === s.name;
                                return (
                                    <div key={i} className="flex flex-col">
                                        <button
                                            onClick={() => toggleExpand(s.name)}
                                            onMouseEnter={() => setActiveIndex(i)}
                                            onMouseLeave={() => setActiveIndex(undefined)}
                                            style={{ padding: '4px 10px', borderRadius: 8, background: 'transparent' }}
                                            className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                                                isExpanded ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'
                                            }`}
                                        >
                                            <span
                                                className="w-2 h-2 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: s.color }}
                                            />
                                            <span className="text-2xs font-space text-[#F5F5DC]/50">
                                                {s.icon} {s.name}
                                            </span>
                                            <span className="text-2xs font-space tabular-nums text-[#F5F5DC]/30">
                                                {(s.percent * 100).toFixed(0)}%
                                            </span>
                                            <ChevronDown
                                                size={10}
                                                className={`text-[#F5F5DC]/20 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                            />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Expanded transaction list for donut view */}
                        <AnimatePresence>
                            {expandedCategory && categoryTransactions.has(expandedCategory) && (
                                <CategoryTransactionList
                                    key={expandedCategory}
                                    transactions={categoryTransactions.get(expandedCategory)!}
                                    categoryColor={slices.find(s => s.name === expandedCategory)?.color || '#D4AF37'}
                                    displayCurrency={displayCurrency}
                                    fxRates={fxRates}
                                />
                            )}
                        </AnimatePresence>
                    </motion.div>
                ) : (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col gap-4"
                    >
                        {/* Flat list view (existing CategoryBreakdown) — now clickable */}
                        {slices.map((item, i) => {
                            const isExpanded = expandedCategory === item.name;
                            const catTxs = categoryTransactions.get(item.name) || [];
                            return (
                                <motion.div
                                    key={item.name}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="flex flex-col gap-2"
                                >
                                    <button
                                        onClick={() => toggleExpand(item.name)}
                                        className="w-full text-left group"
                                        style={{ background: 'transparent', padding: 0, border: 'none' }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-base flex-shrink-0">{item.icon}</span>
                                                <span className="text-sm font-space text-[#F5F5DC]/70 truncate">{item.name}</span>
                                                {item.isOverBudget && <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />}
                                                <ChevronDown
                                                    size={12}
                                                    className={`text-[#F5F5DC]/20 transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                                                />
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <span className="text-2xs font-space text-[#F5F5DC]/25 tabular-nums">
                                                    {catTxs.length} txn{catTxs.length !== 1 ? 's' : ''}
                                                </span>
                                                <span className={`text-data-sm font-space  ${item.isOverBudget ? 'text-red-400' : 'text-[#F5F5DC]/60'}`}>
                                                    {formatCents(fx(item.spentCents), displayCurrency)}
                                                </span>
                                                {item.targetCents > 0 && (
                                                    <span className="text-data-xs font-space  text-[#F5F5DC]/25">
                                                        / {formatCents(item.targetCents, displayCurrency)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                    {item.targetCents > 0 && (
                                        <div className="h-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] overflow-hidden">
                                            <motion.div
                                                className="h-full rounded-full"
                                                style={{
                                                    backgroundColor: item.isOverBudget ? '#ef4444' : item.color,
                                                }}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min(item.progressPercent, 100)}%` }}
                                                transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.05 }}
                                            />
                                        </div>
                                    )}
                                    {/* Expanded inline transactions */}
                                    <AnimatePresence>
                                        {isExpanded && catTxs.length > 0 && (
                                            <CategoryTransactionList
                                                key={item.name}
                                                transactions={catTxs}
                                                categoryColor={item.color}
                                                displayCurrency={displayCurrency}
                                                fxRates={fxRates}
                                            />
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                        {/* Also show zero-spend categories */}
                        {categories.filter(c => c.is_income === 0 && !slices.some(s => s.name === c.name)).sort((a, b) => b.monthly_target_cents - a.monthly_target_cents).map((cat, i) => (
                            <div key={cat.id} className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-base flex-shrink-0">{cat.icon || '💸'}</span>
                                        <span className="text-sm font-space text-[#F5F5DC]/70 truncate">{cat.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <span className="text-data-sm font-space  text-[#F5F5DC]/60">
                                            {formatCents(0, displayCurrency)}
                                        </span>
                                        {cat.monthly_target_cents > 0 && (
                                            <span className="text-data-xs font-space  text-[#F5F5DC]/25">
                                                / {formatCents(cat.monthly_target_cents, displayCurrency)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
