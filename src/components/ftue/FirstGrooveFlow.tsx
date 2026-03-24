"use client";

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X, DollarSign, TrendingUp, Sparkles } from 'lucide-react';
import { usePortfolio } from '@/context/PortfolioContext';
import CelebrationOverlay from './CelebrationOverlay';

const QUICK_CATEGORIES = [
    { id: 'food', emoji: '🍕', label: 'Food & Drink', match: 'dining' },
    { id: 'transport', emoji: '🚗', label: 'Transport', match: 'transport' },
    { id: 'shopping', emoji: '🛍️', label: 'Shopping', match: 'shopping' },
    { id: 'entertainment', emoji: '🎬', label: 'Entertainment', match: 'entertainment' },
    { id: 'bills', emoji: '📱', label: 'Bills', match: 'utilities' },
    { id: 'other', emoji: '📦', label: 'Other', match: 'misc' },
];

export default function FirstGrooveFlow() {
    const { ftueState, updateFtueProgress, refreshAllData } = usePortfolio();
    const [showCelebration, setShowCelebration] = useState(false);
    const [celebrationData, setCelebrationData] = useState<any>(null);
    const [dismissed, setDismissed] = useState(false);
    
    // Budget state
    const [budgetAmount, setBudgetAmount] = useState('');
    const [budgetCategory, setBudgetCategory] = useState('food');
    const [budgetNote, setBudgetNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    
    // Investment state  
    const [investTicker, setInvestTicker] = useState('');
    const [investQuantity, setInvestQuantity] = useState('');
    const [investPricePerUnit, setInvestPricePerUnit] = useState('');
    const [investBroker, setInvestBroker] = useState('');

    // For "both" users — path choice
    const goal = ftueState?.onboardingGoal || 'both';
    const experience = ftueState?.onboardingExperience || 'beginner';
    const [chosenPath, setChosenPath] = useState(
        goal === 'budget' ? 'budget' : goal === 'investments' ? 'invest' : null
    );

    // Visibility logic
    if (!ftueState) return null;
    if (!ftueState.wizardCompleted) return null;
    if (ftueState.showFirstVisitGreeting) return null; // Wait for greeting to dismiss
    if (ftueState.usingDemoData) return null;
    if (ftueState.checklistItems?.addFirstHolding || ftueState.checklistItems?.importHistory) return null;
    if (dismissed) return null;

    // ─── Budget Submit ───
    const handleBudgetSubmit = async () => {
        if (!budgetAmount || isNaN(parseFloat(budgetAmount))) {
            setSubmitError('Please enter a valid amount');
            return;
        }
        setIsSubmitting(true);
        setSubmitError('');
        
        try {
            // Ensure default categories exist (idempotent)
            await fetch('/api/budget/categories/seed', { method: 'POST' });
            
            // Fetch categories to find a matching one
            const catRes = await fetch('/api/budget/categories');
            const categories = await catRes.json();
            
            const selectedCat = QUICK_CATEGORIES.find(c => c.id === budgetCategory);
            // Match by searching category names for the match keyword
            const matchedDbCat = categories.find((c: any) => 
                c.name?.toLowerCase().includes(selectedCat?.match || '')
            ) || categories.find((c: any) => c.is_income === 0) || categories[0];
            
            if (!matchedDbCat) {
                setSubmitError('Could not find a budget category. Try importing data instead.');
                setIsSubmitting(false);
                return;
            }
            
            const res = await fetch('/api/budget/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category_id: matchedDbCat.id,
                    amount_cents: Math.round(parseFloat(budgetAmount) * 100),
                    description: budgetNote || `${selectedCat?.emoji} ${selectedCat?.label}`,
                    date: new Date().toISOString().split('T')[0],
                }),
            });

            if (!res.ok) throw new Error('Failed to save');

            await updateFtueProgress({
                checklistItems: {
                    ...ftueState.checklistItems,
                    importHistory: true,
                },
            });

            setCelebrationData({
                title: 'First Expense Logged! 🎉',
                subtitle: "You're officially tracking your spending. Professor F is proud!",
                ctaLabel: '🎸 Keep the Groove Going!',
            });
            setShowCelebration(true);
            await refreshAllData();
        } catch (e) {
            console.error('Failed to save quick expense:', e);
            setSubmitError('Something went wrong. Try again or use the full import.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Investment Submit ───
    const handleInvestmentSubmit = async () => {
        if (!investTicker || !investQuantity || !investPricePerUnit) {
            setSubmitError('Please fill in all fields');
            return;
        }
        
        const qty = parseFloat(investQuantity);
        const pricePerUnit = parseFloat(investPricePerUnit);
        
        if (isNaN(qty) || isNaN(pricePerUnit) || qty <= 0 || pricePerUnit <= 0) {
            setSubmitError('Please enter valid numbers');
            return;
        }
        
        setIsSubmitting(true);
        setSubmitError('');
        
        try {
            // IMPORTANT: The equity API expects:
            // - type: 'Buy' (capitalized — Zod enum)
            // - quantity: number of shares
            // - investment: TOTAL cost (quantity * price), NOT price per share
            // The API calculates costPerShare internally
            const res = await fetch('/api/equity-transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'Buy',
                    ticker: investTicker.toUpperCase().trim(),
                    broker: investBroker.trim() || 'Manual',
                    quantity: qty,
                    investment: qty * pricePerUnit,
                    currency: 'USD',
                    date: new Date().toISOString().split('T')[0],
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to save');
            }

            await updateFtueProgress({
                checklistItems: {
                    ...ftueState.checklistItems,
                    addFirstHolding: true,
                },
            });

            setCelebrationData({
                title: 'First Holding Added! 📈',
                subtitle: `${investTicker.toUpperCase()} is now in your portfolio. Welcome to the groove!`,
                ctaLabel: '🎸 Keep Building!',
            });
            setShowCelebration(true);
            await refreshAllData();
        } catch (e: any) {
            console.error('Failed to save holding:', e);
            setSubmitError(e.message || 'Something went wrong. Try again or use the full import.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDismiss = () => setDismissed(true);
    const handleCelebrationDone = () => {
        setShowCelebration(false);
        setDismissed(true);
    };

    return (
        <>
            <AnimatePresence>
                {!dismissed && !showCelebration && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="mb-6"
                    >
                        <div className="relative bg-gradient-to-br from-[#1A0F2E]/90 to-[#0B0611]/90 border border-[#D4AF37]/25 rounded-2xl p-5 md:p-6 shadow-xl backdrop-blur-xl">
                            {/* Dismiss */}
                            <button onClick={handleDismiss} className="absolute top-3 right-3 p-1.5 rounded-full text-[#F5F5DC]/20 hover:text-[#F5F5DC]/60 hover:bg-white/5 transition-all bg-transparent border-none cursor-pointer z-10" aria-label="Dismiss">
                                <X size={16} />
                            </button>

                            {/* Header */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full overflow-hidden border border-[#D4AF37]/40 shrink-0 bg-[#D4AF37]/10">
                                    <Image src="/ftue/funk-master-avatar.png" alt="Professor F" width={40} height={40} className="object-cover" />
                                </div>
                                <div>
                                    <h3 className="text-[#D4AF37] font-bebas text-lg tracking-wider m-0">
                                        {chosenPath === null ? 'Your First Groove' : chosenPath === 'budget' ? 'Log Your First Expense' : 'Add Your First Holding'}
                                    </h3>
                                    <p className="text-xs text-[#F5F5DC]/40 font-space m-0">
                                        {chosenPath === null ? 'Pick your starting move' : experience === 'beginner' ? "This takes under 30 seconds!" : 'Quick — just the essentials'}
                                    </p>
                                </div>
                            </div>

                            {/* Path Chooser (for "both" users) */}
                            {chosenPath === null && (
                                <div className="grid grid-cols-2 gap-3">
                                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setChosenPath('budget')}
                                        className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/40 transition-all cursor-pointer">
                                        <DollarSign size={24} className="text-[#D4AF37]" />
                                        <span className="font-space text-sm text-[#F5F5DC]/80 font-bold">Log an Expense</span>
                                        <span className="font-space text-xs text-[#F5F5DC]/40">Track your spending</span>
                                    </motion.button>
                                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setChosenPath('invest')}
                                        className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[#CC5500]/20 bg-[#CC5500]/5 hover:bg-[#CC5500]/10 hover:border-[#CC5500]/40 transition-all cursor-pointer">
                                        <TrendingUp size={24} className="text-[#CC5500]" />
                                        <span className="font-space text-sm text-[#F5F5DC]/80 font-bold">Add a Holding</span>
                                        <span className="font-space text-xs text-[#F5F5DC]/40">Start your portfolio</span>
                                    </motion.button>
                                </div>
                            )}

                            {/* Budget Quick-Add */}
                            {chosenPath === 'budget' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                                    <div>
                                        <label className="block text-xs uppercase tracking-[2px] text-[#F5F5DC]/40 font-space mb-1.5">Amount</label>
                                        <input type="number" inputMode="decimal" value={budgetAmount} onChange={e => setBudgetAmount(e.target.value)} placeholder="0.00" autoFocus
                                            className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-[#F5F5DC] text-lg font-space outline-none focus:border-[#D4AF37]/50 placeholder:text-[#F5F5DC]/20 transition-colors" />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-[2px] text-[#F5F5DC]/40 font-space mb-1.5">Category</label>
                                        <div className="flex flex-wrap gap-2">
                                            {QUICK_CATEGORIES.map(cat => (
                                                <button key={cat.id} onClick={() => setBudgetCategory(cat.id)}
                                                    className={`px-3 py-1.5 rounded-lg font-space text-xs border transition-all cursor-pointer ${
                                                        budgetCategory === cat.id ? 'bg-[#D4AF37]/15 border-[#D4AF37]/40 text-[#D4AF37]' : 'bg-white/5 border-white/10 text-[#F5F5DC]/50 hover:bg-white/10'
                                                    }`}>
                                                    {cat.emoji} {cat.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-[2px] text-[#F5F5DC]/40 font-space mb-1.5">Note (optional)</label>
                                        <input type="text" value={budgetNote} onChange={e => setBudgetNote(e.target.value)} placeholder="Coffee at Starbucks..."
                                            className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-[#F5F5DC] text-sm font-space outline-none focus:border-[#D4AF37]/50 placeholder:text-[#F5F5DC]/20 transition-colors" />
                                    </div>
                                    {submitError && <p className="text-red-400 text-xs font-space">{submitError}</p>}
                                    <div className="flex items-center gap-3">
                                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleBudgetSubmit} disabled={isSubmitting || !budgetAmount}
                                            className="flex-1 px-5 py-3 rounded-xl font-space text-sm tracking-wide font-bold bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0B0611] hover:shadow-lg hover:shadow-[#D4AF37]/20 disabled:opacity-40 disabled:cursor-not-allowed border-none cursor-pointer transition-all duration-300 flex items-center justify-center gap-2">
                                            {isSubmitting ? <span className="w-4 h-4 border-2 border-[#0B0611]/30 border-t-[#0B0611] rounded-full animate-spin" /> : <><Sparkles size={16} /> Log It!</>}
                                        </motion.button>
                                        <button onClick={() => goal === 'both' ? setChosenPath(null) : handleDismiss()}
                                            className="px-4 py-3 rounded-xl font-space text-xs text-[#F5F5DC]/30 hover:text-[#F5F5DC]/60 border border-white/5 hover:border-white/10 bg-transparent cursor-pointer transition-all">
                                            {goal === 'both' ? 'Back' : 'Skip'}
                                        </button>
                                    </div>
                                    <p className="text-center text-xs text-[#F5F5DC]/25 font-space">
                                        or <a href="/import" className="text-[#D4AF37]/50 hover:text-[#D4AF37]/80 underline transition-colors">import a bank statement</a> for bulk data
                                    </p>
                                </motion.div>
                            )}

                            {/* Investment Quick-Add */}
                            {chosenPath === 'invest' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                                    <div>
                                        <label className="block text-xs uppercase tracking-[2px] text-[#F5F5DC]/40 font-space mb-1.5">Ticker / Asset Name</label>
                                        <input type="text" value={investTicker} onChange={e => setInvestTicker(e.target.value)} placeholder="AAPL, MSFT, BTC..." autoFocus
                                            className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-[#F5F5DC] text-sm font-space outline-none focus:border-[#CC5500]/50 placeholder:text-[#F5F5DC]/20 transition-colors uppercase" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs uppercase tracking-[2px] text-[#F5F5DC]/40 font-space mb-1.5">Shares / Units</label>
                                            <input type="number" inputMode="decimal" value={investQuantity} onChange={e => setInvestQuantity(e.target.value)} placeholder="10"
                                                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-[#F5F5DC] text-sm font-space outline-none focus:border-[#CC5500]/50 placeholder:text-[#F5F5DC]/20 transition-colors" />
                                        </div>
                                        <div>
                                            <label className="block text-xs uppercase tracking-[2px] text-[#F5F5DC]/40 font-space mb-1.5">Price per Unit</label>
                                            <input type="number" inputMode="decimal" value={investPricePerUnit} onChange={e => setInvestPricePerUnit(e.target.value)} placeholder="150.00"
                                                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-[#F5F5DC] text-sm font-space outline-none focus:border-[#CC5500]/50 placeholder:text-[#F5F5DC]/20 transition-colors" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-[2px] text-[#F5F5DC]/40 font-space mb-1.5">Broker (optional)</label>
                                        <input type="text" value={investBroker} onChange={e => setInvestBroker(e.target.value)} placeholder="Trading 212, XP..."
                                            className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-[#F5F5DC] text-sm font-space outline-none focus:border-[#CC5500]/50 placeholder:text-[#F5F5DC]/20 transition-colors" />
                                    </div>
                                    {submitError && <p className="text-red-400 text-xs font-space">{submitError}</p>}
                                    <div className="flex items-center gap-3">
                                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleInvestmentSubmit} disabled={isSubmitting || !investTicker || !investQuantity || !investPricePerUnit}
                                            className="flex-1 px-5 py-3 rounded-xl font-space text-sm tracking-wide font-bold bg-gradient-to-r from-[#CC5500] to-[#B34700] text-white hover:shadow-lg hover:shadow-[#CC5500]/20 disabled:opacity-40 disabled:cursor-not-allowed border-none cursor-pointer transition-all duration-300 flex items-center justify-center gap-2">
                                            {isSubmitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Sparkles size={16} /> Add to Portfolio!</>}
                                        </motion.button>
                                        <button onClick={() => goal === 'both' ? setChosenPath(null) : handleDismiss()}
                                            className="px-4 py-3 rounded-xl font-space text-xs text-[#F5F5DC]/30 hover:text-[#F5F5DC]/60 border border-white/5 hover:border-white/10 bg-transparent cursor-pointer transition-all">
                                            {goal === 'both' ? 'Back' : 'Skip'}
                                        </button>
                                    </div>
                                    <p className="text-center text-xs text-[#F5F5DC]/25 font-space">
                                        or <a href="/import" className="text-[#CC5500]/50 hover:text-[#CC5500]/80 underline transition-colors">import a broker spreadsheet</a> for bulk data
                                    </p>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {showCelebration && celebrationData && (
                <CelebrationOverlay
                    title={celebrationData.title}
                    subtitle={celebrationData.subtitle}
                    metric=""
                    ctaLabel={celebrationData.ctaLabel}
                    onDismiss={handleCelebrationDone}
                    autoDismissMs={8000}
                />
            )}
        </>
    );
}
