"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X, TrendingUp, Wallet } from 'lucide-react';
import { usePortfolio } from '@/context/PortfolioContext';
import useBudgetStore from '@/stores/useBudgetStore';
import { formatCurrency } from '@/lib/currency';

export default function GrooveCheck() {
    const { ftueState, updateFtueProgress, totalNetWorthBRL, primaryCurrency, toPrimary, formatPrimary, historicalSnapshots } = usePortfolio();
    const budgetTransactions = useBudgetStore(s => s.transactions);
    const budgetCategories = useBudgetStore(s => s.categories);
    const [visible, setVisible] = useState(false);
    const [insights, setInsights] = useState(null);

    useEffect(() => {
        if (!ftueState) return;
        if (ftueState.grooveCheckDismissed) return;
        if (!ftueState.wizardCompleted) return;
        if (ftueState.usingDemoData) return;

        const hasEnoughData = (budgetTransactions?.length > 5) || (historicalSnapshots?.length > 0);
        if (!hasEnoughData) return;

        const goal = ftueState.onboardingGoal || 'both';
        const insightData = {};

        // Budget insights — filter expenses by looking up income categories
        if ((goal === 'budget' || goal === 'both') && budgetTransactions?.length > 0 && budgetCategories?.length > 0) {
            const now = new Date();
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const incomeCatIds = new Set(budgetCategories.filter(c => c.is_income === 1).map(c => c.id));
            const recentTxns = budgetTransactions.filter(t => !incomeCatIds.has(t.category_id) && new Date(t.date) >= weekAgo);

            if (recentTxns.length > 0) {
                const totalSpent = recentTxns.reduce((sum, t) => sum + (t.amount_cents || 0), 0) / 100;

                const catTotals = {};
                recentTxns.forEach(t => {
                    catTotals[t.category_id] = (catTotals[t.category_id] || 0) + (t.amount_cents || 0);
                });
                const topCatId = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]?.[0];
                const topCat = budgetCategories.find(c => c.id === parseInt(topCatId));

                insightData.totalSpent = totalSpent;
                insightData.topCategory = topCat?.name || 'Other';
                insightData.topCategoryIcon = topCat?.icon || '📦';
                insightData.transactionCount = recentTxns.length;
            }
        }

        // Portfolio insights
        if ((goal === 'investments' || goal === 'both') && totalNetWorthBRL > 0) {
            insightData.netWorthFormatted = formatPrimary(toPrimary(totalNetWorthBRL, 'BRL'));
        }

        if (Object.keys(insightData).length > 0) {
            setInsights(insightData);
            const timer = setTimeout(() => setVisible(true), 2000);
            return () => clearTimeout(timer);
        }
    }, [ftueState, budgetTransactions, budgetCategories, totalNetWorthBRL, historicalSnapshots, toPrimary, formatPrimary]);

    const handleDismiss = useCallback(async () => {
        setVisible(false);
        setTimeout(() => {
            updateFtueProgress({ grooveCheckDismissed: true });
        }, 400);
    }, [updateFtueProgress]);

    if (!visible || !insights) return null;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[990] flex items-center justify-center"
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleDismiss} />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="relative z-10 bg-gradient-to-br from-[#1A0F2E] to-[#0B0611] border border-[#D4AF37]/30 rounded-3xl p-6 max-w-sm mx-4 shadow-2xl"
                    >
                        <button onClick={handleDismiss} className="absolute top-3 right-3 p-1.5 rounded-full text-[#F5F5DC]/20 hover:text-[#F5F5DC]/60 bg-transparent border-none cursor-pointer">
                            <X size={16} />
                        </button>

                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#D4AF37]/40 bg-[#D4AF37]/10">
                                <Image src="/ftue/funk-master-celebrating.png" alt="Professor F" width={56} height={56} className="object-cover" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bebas tracking-wider text-[#D4AF37] m-0">Groove Check! 🎸</h3>
                                <p className="text-xs text-[#F5F5DC]/40 font-space m-0">Your first week with Finance Funk</p>
                            </div>
                        </div>

                        <div className="space-y-3 mb-5">
                            {insights.totalSpent !== undefined && (
                                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                    <Wallet size={20} className="text-[#D4AF37] shrink-0" />
                                    <div>
                                        <p className="text-xs text-[#F5F5DC]/40 font-space m-0">You spent this week</p>
                                        <p className="text-base font-bebas text-[#F5F5DC] tracking-wider m-0">
                                            {formatCurrency(insights.totalSpent, primaryCurrency)} across {insights.transactionCount} transactions
                                        </p>
                                    </div>
                                </div>
                            )}

                            {insights.topCategory && (
                                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                    <span className="text-xl shrink-0">{insights.topCategoryIcon}</span>
                                    <div>
                                        <p className="text-xs text-[#F5F5DC]/40 font-space m-0">Top spending category</p>
                                        <p className="text-base font-bebas text-[#F5F5DC] tracking-wider m-0">{insights.topCategory}</p>
                                    </div>
                                </div>
                            )}

                            {insights.netWorthFormatted && (
                                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                    <TrendingUp size={20} className="text-[#34D399] shrink-0" />
                                    <div>
                                        <p className="text-xs text-[#F5F5DC]/40 font-space m-0">Your portfolio is worth</p>
                                        <p className="text-base font-bebas text-[#F5F5DC] tracking-wider m-0">{insights.netWorthFormatted}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <p className="text-sm text-[#F5F5DC]/50 font-space text-center mb-4">
                            Keep the groove going — the more data you add, the smarter Finance Funk gets! 🎶
                        </p>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={handleDismiss}
                            className="w-full px-6 py-3 rounded-xl font-space text-sm tracking-wide font-bold bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0B0611] hover:shadow-lg hover:shadow-[#D4AF37]/20 border-none cursor-pointer"
                        >
                            🎸 Keep Grooving!
                        </motion.button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
