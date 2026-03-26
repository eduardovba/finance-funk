'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/currency';
import { AnimatedNumber } from '@/components/ui/animated-number';

interface BudgetMetricCardProps {
    id: string;
    title: string;
    amount: number;
    currency: string;
    isLoading?: boolean;
    invertColor?: boolean;
    percentage?: number;
    diffAmount?: number;
    badge?: string;
    compact?: boolean;
    className?: string;
}

export default function BudgetMetricCard({
    id,
    title,
    amount,
    currency,
    isLoading = false,
    invertColor = false,
    percentage = 0,
    diffAmount = 0,
    badge,
    compact = false,
    className = '',
}: BudgetMetricCardProps) {
    const isActuallyPositive = percentage >= 0;
    const isPositiveForColor = invertColor ? !isActuallyPositive : isActuallyPositive;

    const pillEl = (
        <div className={`
            px-2 py-0.5 rounded-xl font-medium text-xs flex items-center gap-1.5 leading-none shadow-sm shrink-0
            ${isPositiveForColor
                ? 'text-vu-green bg-vu-green/[0.08] border border-vu-green/20'
                : 'text-red-400 bg-red-400/[0.08] border border-red-400/20'
            }
        `}>
            <span className="font-space tabular-nums tracking-tight opacity-90 text-2xs">
                {diffAmount > 0 ? '+' : ''}{formatCurrency(diffAmount, currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <div className="w-px h-2.5 bg-current opacity-30"></div>
            <span className="flex items-center gap-0.5">
                {Math.abs(percentage).toFixed(1)}%
                <span className="text-2xs opacity-70 mb-[1px]">{isActuallyPositive ? '▲' : '▼'}</span>
            </span>
        </div>
    );

    if (compact) {
        return (
            <motion.div
                className={`
                    rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-2 xl:p-3
                    flex flex-col justify-between relative overflow-visible cursor-default ${className}
                `}
                initial={false}
                whileTap={{ scale: 0.98 }}
            >
                <div className="relative z-10 w-full">
                    <h3 className="text-[#F5F5DC]/60 text-2xs xl:text-xs tracking-[2px] uppercase font-space truncate mb-0.5" title={title}>
                        {title}
                    </h3>
                    <div className="flex items-end justify-between gap-2">
                        <p className={`text-xl xl:text-2xl font-normal text-[#D4AF37] drop-shadow-[0_0_10px_rgba(212,175,55,0.4)] font-bebas truncate ${isLoading ? 'opacity-30' : 'opacity-100'}`}>
                            {isLoading ? '---' : <AnimatedNumber value={amount} formatter={(v: number) => formatCurrency(v, currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} />}
                        </p>
                        {pillEl}
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            className={`
                rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-3 md:p-4
                flex flex-col justify-between relative overflow-hidden cursor-default ${className}
            `}
            initial={false}
            whileTap={{ scale: 0.98 }}
        >
            <div className="relative z-10">
                <h3 className="text-[#F5F5DC]/60 text-xs tracking-[2px] uppercase font-space truncate mb-2" title={title}>
                    {title}
                </h3>
                <p className={`text-3xl xl:text-4xl font-normal text-[#D4AF37] mb-1 drop-shadow-[0_0_10px_rgba(212,175,55,0.4)] font-bebas truncate ${isLoading ? 'opacity-30' : 'opacity-100'}`}>
                    {isLoading ? '---' : <AnimatedNumber value={amount} formatter={(v: number) => formatCurrency(v, currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} />}
                </p>
                <div className="flex justify-start">
                    {pillEl}
                </div>
                {badge && <span className="mt-2 inline-block px-1.5 py-0.5 rounded-full bg-white/10 text-white/70 tracking-normal normal-case text-[0.65rem] whitespace-nowrap">{badge}</span>}
            </div>
        </motion.div>
    );
}
