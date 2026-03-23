'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

interface SavingsRateBarProps {
    savingsRateBasisPoints: number;   // e.g. 3200 = 32.00%
}

export default function SavingsRateBar({ savingsRateBasisPoints }: SavingsRateBarProps) {
    // All threshold math stays in basis points — no floats
    const barColor =
        savingsRateBasisPoints > 3000 ? '#D4AF37' :      // Gold  > 30%
        savingsRateBasisPoints >= 1000 ? 'rgba(245,245,220,0.4)' : // Default 10-30%
        '#ef4444';                                         // Red   < 10%

    const barLabel =
        savingsRateBasisPoints > 3000 ? 'Excellent' :
        savingsRateBasisPoints >= 1000 ? 'On Track' :
        'Low';

    // Width as percentage (capped at 100%)
    const widthPercent = Math.min(savingsRateBasisPoints / 100, 100);
    const displayPercentage = (savingsRateBasisPoints / 100).toFixed(1);

    return (
        <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-[#D4AF37]/70" />
                    <span className="text-xs text-[#F5F5DC]/50 uppercase tracking-[2px] font-space">
                        Savings Rate
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span
                        className="text-xs font-space uppercase tracking-wider px-2 py-0.5 rounded-full border"
                        style={{
                            color: barColor,
                            borderColor: barColor,
                            backgroundColor: `${barColor}15`,
                        }}
                    >
                        {barLabel}
                    </span>
                    <span
                        className="text-lg font-bebas tracking-wide"
                        style={{ color: barColor }}
                    >
                        {displayPercentage}%
                    </span>
                </div>
            </div>

            {/* Progress track */}
            <div className="h-3 rounded-full bg-white/[0.04] border border-white/[0.06] overflow-hidden">
                <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: barColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
            </div>
        </div>
    );
}
