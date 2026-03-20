'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp } from 'lucide-react';
import useBudgetStore from '@/stores/useBudgetStore';
import { formatCents } from '@/lib/budgetUtils';
import { convertCurrency } from '@/lib/fxConvert';

/**
 * Dashboard KPI pod showing this month's Investable Surplus and Savings Rate.
 * All arithmetic remains in integer cents — formatCents is called only at render.
 */
export default function BudgetKpiPod() {
    const { currentRollup, fetchRollup, displayCurrency, fxRates } = useBudgetStore();

    useEffect(() => {
        fetchRollup();
    }, [fetchRollup]);

    if (!currentRollup) return null;

    // ─── Integer-only arithmetic ────────────────────────────
    const surplusCents = currentRollup.total_income_cents - currentRollup.total_expenses_cents;
    const displaySurplusCents = convertCurrency(Math.abs(surplusCents), 'BRL', displayCurrency, fxRates);
    const savingsRateBps = currentRollup.savings_rate_basis_points ?? 0;
    const savingsRatePercent = Math.round(savingsRateBps / 100);
    const isHealthy = savingsRateBps > 3000; // > 30%

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`rounded-2xl backdrop-blur-xl border shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-5 relative overflow-hidden transition-all duration-500
                ${isHealthy
                    ? 'bg-[#121418]/60 border-[#D4AF37]/20 shadow-[0_0_40px_rgba(212,175,55,0.08)]'
                    : 'bg-[#121418]/60 border-white/[0.06]'
                }`}
        >
            {/* Gold glow (only when savings rate > 30%) */}
            {isHealthy && (
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/8 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/3" />
            )}

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
                {/* Investable Surplus */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                        ${isHealthy ? 'bg-[#D4AF37]/15' : 'bg-white/[0.04]'}`}>
                        <Wallet size={18} className={isHealthy ? 'text-[#D4AF37]' : 'text-[#F5F5DC]/40'} />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[0.6875rem] text-[#F5F5DC]/35 uppercase tracking-[2px] font-space block">
                            Investable Surplus
                        </span>
                        <span className={`text-xl font-bebas tracking-wider block
                            ${surplusCents >= 0 ? (isHealthy ? 'text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.3)]' : 'text-[#34D399]') : 'text-[#ef4444]'}`}>
                            {surplusCents < 0 ? '-' : ''}{formatCents(displaySurplusCents, displayCurrency)}
                        </span>
                    </div>
                </div>

                {/* Divider */}
                <div className="hidden sm:block w-px h-10 bg-white/[0.08]" />

                {/* Savings Rate */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                        ${isHealthy ? 'bg-[#D4AF37]/15' : 'bg-white/[0.04]'}`}>
                        <TrendingUp size={18} className={isHealthy ? 'text-[#D4AF37]' : 'text-[#F5F5DC]/40'} />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[0.6875rem] text-[#F5F5DC]/35 uppercase tracking-[2px] font-space block">
                            Savings Rate
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-xl font-bebas tracking-wider
                                ${isHealthy ? 'text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.3)]' : savingsRateBps >= 0 ? 'text-[#34D399]' : 'text-[#ef4444]'}`}>
                                {savingsRatePercent}%
                            </span>
                            {isHealthy && (
                                <span className="text-[0.625rem] text-[#D4AF37]/60 font-space uppercase tracking-wider">
                                    Healthy
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
