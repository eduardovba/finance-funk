"use client";

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { usePortfolio } from '@/context/PortfolioContext';
import { CURRENCY_LIST } from '@/lib/currency';

export default function CurrencyQuickPicker({ onDone }) {
    const { primaryCurrency, setPrimaryCurrency, secondaryCurrency, setSecondaryCurrency } = usePortfolio();
    const [primary, setPrimary] = useState(primaryCurrency || 'BRL');
    const [secondary, setSecondary] = useState(secondaryCurrency || 'GBP');

    const handleConfirm = useCallback(() => {
        setPrimaryCurrency(primary);
        setSecondaryCurrency(secondary);
        onDone?.();
    }, [primary, secondary, setPrimaryCurrency, setSecondaryCurrency, onDone]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

            {/* Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 bg-gradient-to-br from-[#1A0F2E] to-[#0B0611] border border-[#D4AF37]/25 rounded-3xl p-6 max-w-sm mx-4 shadow-2xl shadow-black/50 w-full"
            >
                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-[#D4AF37]/40 shrink-0 bg-[#D4AF37]/10">
                        <Image src="/ftue/funk-master-avatar.png" alt="Professor F" width={48} height={48} className="object-cover" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bebas tracking-wider text-[#D4AF37] m-0">One quick thing</h3>
                        <p className="text-[11px] text-[#F5F5DC]/40 font-space m-0">Set your base currencies — takes 5 seconds</p>
                    </div>
                </div>

                {/* Currency selections */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* Primary */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] uppercase tracking-[3px] text-[#D4AF37]/50 font-space text-center">Primary</label>
                        <div className="flex flex-col gap-1">
                            {CURRENCY_LIST.map(c => (
                                <button
                                    key={`p-${c.code}`}
                                    onClick={() => {
                                        setPrimary(c.code);
                                        if (c.code === secondary) {
                                            // Auto-swap
                                            setSecondary(primary);
                                        }
                                    }}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-300 text-left ${
                                        primary === c.code
                                            ? 'border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#D4AF37] shadow-md shadow-[#D4AF37]/10'
                                            : 'border-white/[0.06] bg-white/[0.02] text-[#F5F5DC]/50 hover:bg-white/[0.05]'
                                    }`}
                                >
                                    <span className="text-lg">{c.flag}</span>
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-bold font-space">{c.code}</span>
                                        <span className="text-[9px] opacity-50">{c.name}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Secondary */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] uppercase tracking-[3px] text-[#CC5500]/50 font-space text-center">Secondary</label>
                        <div className="flex flex-col gap-1">
                            {CURRENCY_LIST.map(c => (
                                <button
                                    key={`s-${c.code}`}
                                    onClick={() => setSecondary(c.code)}
                                    disabled={c.code === primary}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-300 text-left ${
                                        secondary === c.code
                                            ? 'border-[#CC5500]/50 bg-[#CC5500]/10 text-[#CC5500] shadow-md shadow-[#CC5500]/10'
                                            : c.code === primary
                                            ? 'opacity-20 cursor-not-allowed border-white/[0.03]'
                                            : 'border-white/[0.06] bg-white/[0.02] text-[#F5F5DC]/50 hover:bg-white/[0.05]'
                                    }`}
                                >
                                    <span className="text-lg">{c.flag}</span>
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-bold font-space">{c.code}</span>
                                        <span className="text-[9px] opacity-50">{c.name}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Confirm button */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleConfirm}
                    disabled={primary === secondary}
                    className="w-full px-6 py-3 rounded-xl font-space text-sm tracking-wide font-bold transition-all duration-300
                        bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0B0611]
                        hover:shadow-lg hover:shadow-[#D4AF37]/20
                        disabled:opacity-30 disabled:cursor-not-allowed border-none cursor-pointer"
                >
                    Let&apos;s Go →
                </motion.button>
            </motion.div>
        </motion.div>
    );
}
