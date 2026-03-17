"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePortfolio } from '@/context/PortfolioContext';

/**
 * FTUEImportBubble — floating bubble that nudges users to import data
 * when they have no portfolio data and are not in demo mode.
 *
 * Visibility conditions:
 *  1. FTUE wizard is completed
 *  2. Tutorial is not actively running
 *  3. Not using demo data
 *  4. User has no real transaction data across any asset class
 *  5. Not already dismissed
 */
export default function FTUEImportBubble() {
    const {
        ftueState,
        updateFtueProgress,
        equityTransactions,
        cryptoTransactions,
        fixedIncomeTransactions,
        pensionTransactions,
        debtTransactions,
        transactions,
    } = usePortfolio();

    const [closing, setClosing] = useState(false);

    // Don't show until FTUE state is loaded
    if (!ftueState) return null;

    // Already dismissed
    if (ftueState.importBubbleDismissed) return null;

    // Only show after FTUE wizard is completed and tutorial is done
    if (ftueState.wizardCompleted !== true) return null;
    if (ftueState.isTutorialActive) return null;

    // Don't show while on demo data — the end-of-tour screen handles that
    if (ftueState.usingDemoData) return null;

    // Check if the user has any real data
    const hasData =
        (Array.isArray(equityTransactions) && equityTransactions.length > 0) ||
        (Array.isArray(cryptoTransactions) && cryptoTransactions.length > 0) ||
        (Array.isArray(fixedIncomeTransactions) && fixedIncomeTransactions.length > 0) ||
        (Array.isArray(pensionTransactions) && pensionTransactions.length > 0) ||
        (Array.isArray(debtTransactions) && debtTransactions.length > 0) ||
        (Array.isArray(transactions) && transactions.length > 0);

    if (hasData) return null;

    const handleDismiss = async () => {
        setClosing(true);
        setTimeout(async () => {
            await updateFtueProgress({ importBubbleDismissed: true });
        }, 300);
    };

    return (
        <AnimatePresence>
            {!closing && (
                <motion.div
                    initial={{ opacity: 0, y: 40, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 1.5 }}
                    className="fixed bottom-24 left-6 z-50 md:bottom-8 max-w-xs pointer-events-auto"
                >
                    <div className="relative bg-gradient-to-br from-[#1A0F2E] to-[#0B0611] border border-[#D4AF37]/30 rounded-2xl p-4 shadow-2xl shadow-black/60">
                        {/* Dismiss button */}
                        <button
                            onClick={handleDismiss}
                            className="absolute top-2.5 right-2.5 p-1 rounded-full text-[#F5F5DC]/20 hover:text-[#F5F5DC]/60 hover:bg-white/5 transition-all bg-transparent border-none"
                            title="Dismiss"
                        >
                            <X size={12} />
                        </button>

                        {/* Content */}
                        <div className="flex items-start gap-3">
                            {/* Professor F avatar */}
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-[#D4AF37]/40 shrink-0 bg-[#D4AF37]/10">
                                <Image
                                    src="/ftue/funk-master-avatar.png"
                                    alt="Professor F"
                                    width={40}
                                    height={40}
                                    className="object-cover"
                                />
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] text-[#F5F5DC]/80 font-space leading-snug m-0 mb-2.5">
                                    Your portfolio is empty! Import a spreadsheet to get started. 📊
                                </p>

                                <Link
                                    href="/import"
                                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg font-space text-[11px] tracking-wide font-bold transition-all duration-300
                                        bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0B0611]
                                        hover:shadow-md hover:shadow-[#D4AF37]/20 no-underline"
                                >
                                    <Upload size={12} />
                                    Import Data
                                </Link>
                            </div>
                        </div>

                        {/* Subtle animated glow */}
                        <motion.div
                            className="absolute -inset-px rounded-2xl pointer-events-none"
                            style={{
                                background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, transparent 50%, rgba(212,175,55,0.08) 100%)',
                                borderRadius: '16px',
                            }}
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
