"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X } from 'lucide-react';
import { usePortfolio } from '@/context/PortfolioContext';

export default function FirstVisitGreeting() {
    const { ftueState, updateFtueProgress } = usePortfolio();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (ftueState?.showFirstVisitGreeting) {
            const timer = setTimeout(() => setVisible(true), 1200);
            return () => clearTimeout(timer);
        }
    }, [ftueState?.showFirstVisitGreeting]);

    const handleDismiss = useCallback(async () => {
        setVisible(false);
        setTimeout(() => {
            updateFtueProgress({ showFirstVisitGreeting: false });
        }, 400);
    }, [updateFtueProgress]);

    // Auto-dismiss — duration varies by experience level
    useEffect(() => {
        if (visible) {
            const experience = ftueState?.onboardingExperience || 'beginner';
            const durations = { advanced: 3000, intermediate: 6000, beginner: 8000 };
            const ms = durations[experience] || 8000;
            const timer = setTimeout(handleDismiss, ms);
            return () => clearTimeout(timer);
        }
    }, [visible, handleDismiss, ftueState?.onboardingExperience]);

    if (!ftueState?.showFirstVisitGreeting) return null;

    const goal = ftueState.onboardingGoal || 'both';
    const experience = ftueState.onboardingExperience || 'beginner';
    
    let message = '';
    if (goal === 'budget') {
        message = experience === 'beginner' 
            ? "Welcome! 🎸 Your budget dashboard is ready. Let's start by importing your spending data — I'll categorize everything for you!"
            : "Welcome! 🎸 Your budget dashboard is ready. Import a bank statement or start adding transactions to get rolling!";
    } else if (goal === 'investments') {
        message = experience === 'beginner'
            ? "Welcome! 🎸 Your portfolio tracker is ready. Let's add your first investment — it only takes a minute!"
            : "Welcome! 🎸 Your portfolio tracker is ready. Import a broker spreadsheet or add holdings manually to get started!";
    } else {
        message = experience === 'beginner'
            ? "Welcome! 🎸 Finance Funk is all set up for you. Check out the setup guide to get started!"
            : "Welcome! 🎸 You're all set. Use the setup guide to import your data and configure your dashboard!";
    }

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 40, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="fixed bottom-24 left-6 z-50 md:bottom-8 max-w-sm pointer-events-auto"
                >
                    <div className="relative bg-gradient-to-br from-[#1A0F2E] to-[#0B0611] border border-[#D4AF37]/30 rounded-2xl p-4 shadow-2xl shadow-black/60">
                        <button
                            onClick={handleDismiss}
                            className="absolute top-2.5 right-2.5 p-1 rounded-full text-[#F5F5DC]/20 hover:text-[#F5F5DC]/60 hover:bg-white/5 transition-all bg-transparent border-none cursor-pointer"
                            aria-label="Dismiss"
                        >
                            <X size={14} />
                        </button>

                        <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-full overflow-hidden border border-[#D4AF37]/40 shrink-0 bg-[#D4AF37]/10">
                                <Image
                                    src="/ftue/funk-master-avatar.png"
                                    alt="Professor F"
                                    width={48}
                                    height={48}
                                    className="object-cover"
                                />
                            </div>

                            <div className="flex-1 min-w-0 pr-4">
                                <h4 className="text-[#D4AF37] font-space font-bold text-sm m-0 mb-1">Professor F</h4>
                                <p className="text-sm text-[#F5F5DC]/80 font-space leading-snug m-0">
                                    {message}
                                </p>
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
