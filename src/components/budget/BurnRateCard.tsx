'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Flame, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { formatCents } from '@/lib/budgetUtils';
import { convertCurrency } from '@/lib/fxConvert';
import useBudgetStore from '@/stores/useBudgetStore';
import type { BudgetCategory, BudgetTransaction } from '@/types';

interface Props {
    categories: BudgetCategory[];
    transactions: BudgetTransaction[];
    currentMonth: string; // YYYY-MM
}

export default function BurnRateCard({ categories, transactions, currentMonth }: Props) {
    const { displayCurrency, fxRates } = useBudgetStore();
    const fx = (cents: number) => convertCurrency(cents, displayCurrency, displayCurrency, fxRates);

    // ─── Compute burn rate ──────────────────────────────────
    const expenseCategories = new Set(categories.filter(c => c.is_income === 0).map(c => c.id));
    const expenseTransactions = transactions.filter(t => t.category_id !== null && expenseCategories.has(t.category_id));
    const totalExpenseCents = expenseTransactions.reduce((sum, t) => sum + t.amount_cents, 0);

    // Total monthly budget
    const totalBudgetCents = categories
        .filter(c => c.is_income === 0)
        .reduce((sum, c) => sum + c.monthly_target_cents, 0);

    // Day math
    const [year, month] = currentMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
    const dayOfMonth = isCurrentMonth ? today.getDate() : daysInMonth;

    const dailyBurn = dayOfMonth > 0 ? totalExpenseCents / dayOfMonth : 0;
    const dailyBudget = totalBudgetCents > 0 ? totalBudgetCents / daysInMonth : 0;
    const paceRatio = dailyBudget > 0 ? dailyBurn / dailyBudget : 0;

    // Status
    const status = paceRatio <= 0.85 ? 'under' : paceRatio <= 1.1 ? 'on-track' : 'over';
    const statusLabel = status === 'under' ? 'Under Pace' : status === 'on-track' ? 'On Track' : 'Over Pace';
    const statusColor = status === 'under' ? '#34D399' : status === 'on-track' ? '#D4AF37' : '#ef4444';
    const StatusIcon = status === 'under' ? TrendingDown : status === 'on-track' ? Minus : TrendingUp;

    // Position for the pacer dot (capped 0-100%)
    const dotPosition = Math.min(paceRatio * 100, 120);

    if (totalBudgetCents === 0) return null; // No budgets set — don't show

    return (
        <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Flame size={16} className="text-[#D4AF37]/70" />
                    <span className="text-[0.75rem] text-[#F5F5DC]/50 uppercase tracking-[2px] font-space">
                        Daily Burn Rate
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span
                        className="text-xs font-space uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1"
                        style={{
                            color: statusColor,
                            borderColor: statusColor,
                            backgroundColor: `${statusColor}15`,
                        }}
                    >
                        <StatusIcon size={10} />
                        {statusLabel}
                    </span>
                </div>
            </div>

            {/* Comparison */}
            <div className="flex items-baseline gap-3 mb-4">
                <div className="flex flex-col">
                    <span className="text-[0.6rem] text-[#F5F5DC]/30 uppercase tracking-wider font-space">Actual</span>
                    <span className="text-lg font-bebas tracking-wider" style={{ color: statusColor }}>
                        {formatCents(fx(Math.round(dailyBurn)), displayCurrency)}<span className="text-[0.65rem] text-[#F5F5DC]/30 font-space">/day</span>
                    </span>
                </div>
                <span className="text-[#F5F5DC]/15 text-sm font-space">vs</span>
                <div className="flex flex-col">
                    <span className="text-[0.6rem] text-[#F5F5DC]/30 uppercase tracking-wider font-space">Budget Pace</span>
                    <span className="text-lg font-bebas tracking-wider text-[#F5F5DC]/50">
                        {formatCents(fx(Math.round(dailyBudget)), displayCurrency)}<span className="text-[0.65rem] text-[#F5F5DC]/30 font-space">/day</span>
                    </span>
                </div>
            </div>

            {/* Pacer bar */}
            <div className="relative h-2 rounded-full bg-white/[0.04] border border-white/[0.06] overflow-visible">
                {/* Budget line marker at 100% */}
                <div className="absolute top-[-3px] bottom-[-3px] w-px bg-[#F5F5DC]/20" style={{ left: '100%' }} />
                {/* Filled portion */}
                <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: statusColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(dotPosition, 100)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
                {/* Dot */}
                <motion.div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2"
                    style={{
                        backgroundColor: statusColor,
                        borderColor: '#121418',
                        boxShadow: `0 0 8px ${statusColor}60`,
                    }}
                    initial={{ left: 0 }}
                    animate={{ left: `${Math.min(dotPosition, 100)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
            </div>

            {/* Day progress */}
            <div className="flex justify-between mt-2">
                <span className="text-[0.6rem] text-[#F5F5DC]/20 font-space">Day {dayOfMonth}</span>
                <span className="text-[0.6rem] text-[#F5F5DC]/20 font-space">Day {daysInMonth}</span>
            </div>
        </div>
    );
}
