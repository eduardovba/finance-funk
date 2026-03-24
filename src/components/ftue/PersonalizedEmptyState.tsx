"use client";

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { usePortfolio } from '@/context/PortfolioContext';
import { getPersonalizedCopy } from '@/lib/personalization';

export default function PersonalizedEmptyState({ 
    copyKey,
    actionLabel,
    onAction,
    secondaryLabel,
    onSecondaryAction,
}: any) {
    const { ftueState } = usePortfolio();
    const experience = ftueState?.onboardingExperience || 'beginner';
    const message = getPersonalizedCopy(copyKey, experience);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center justify-center py-16 px-6 text-center bg-gradient-to-br from-[#1A0F2E]/50 to-[#0B0611]/50 border border-[#D4AF37]/10 rounded-3xl mt-8 mb-12 shadow-xl backdrop-blur-sm"
        >
            <div className="w-20 h-20 rounded-full overflow-hidden border border-[#D4AF37]/30 mb-5 bg-[#D4AF37]/5">
                <Image src="/ftue/funk-master-thinking.png" alt="Professor F" width={80} height={80} className="object-cover" />
            </div>
            <p className="text-sm text-[#F5F5DC]/70 font-space leading-relaxed mb-8 max-w-md mx-auto">{message}</p>
            <div className="flex gap-3 flex-wrap justify-center">
                {actionLabel && onAction && (
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onAction}
                        className="bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0B0611] font-semibold font-space py-3 px-8 rounded-full transition-all duration-300 shadow-[0_4px_14px_rgba(212,175,55,0.25)] hover:shadow-[0_6px_20px_rgba(212,175,55,0.4)] border-none cursor-pointer text-sm">
                        {actionLabel}
                    </motion.button>
                )}
                {secondaryLabel && onSecondaryAction && (
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onSecondaryAction}
                        className="bg-white/5 hover:bg-white/10 text-[#F5F5DC]/70 font-semibold font-space py-3 px-8 rounded-full transition-all duration-300 border border-white/10 hover:border-white/20 cursor-pointer text-sm">
                        {secondaryLabel}
                    </motion.button>
                )}
            </div>
        </motion.div>
    );
}
