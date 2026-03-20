'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMonthLabel, offsetMonth } from '@/lib/budgetUtils';

interface MonthNavigatorProps {
    currentMonth: string;
    onMonthChange: (month: string) => void;
}

export default function MonthNavigator({ currentMonth, onMonthChange }: MonthNavigatorProps) {
    const handlePrev = () => onMonthChange(offsetMonth(currentMonth, -1));
    const handleNext = () => onMonthChange(offsetMonth(currentMonth, 1));

    return (
        <div className="flex items-center justify-center gap-4 mb-6">
            <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handlePrev}
                className="p-2 rounded-full bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-[#D4AF37]/20 transition-all"
                aria-label="Previous month"
            >
                <ChevronLeft size={20} className="text-[#F5F5DC]/50" />
            </motion.button>

            <motion.span
                key={currentMonth}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-lg font-bebas tracking-wider text-[#D4AF37] drop-shadow-[0_0_10px_rgba(212,175,55,0.3)] min-w-[130px] text-center"
            >
                {formatMonthLabel(currentMonth)}
            </motion.span>

            <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleNext}
                className="p-2 rounded-full bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-[#D4AF37]/20 transition-all"
                aria-label="Next month"
            >
                <ChevronRight size={20} className="text-[#F5F5DC]/50" />
            </motion.button>
        </div>
    );
}
