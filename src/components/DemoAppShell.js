"use client";

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { DemoPortfolioProvider } from '@/context/DemoPortfolioContext';
import TopConsole from '@/components/TopConsole';
import AnimatedBackground from '@/components/AnimatedBackground';
import BottomNav from '@/components/BottomNav';
import DemoBanner from '@/components/ftue/DemoBanner';
import Inspector from '@/components/Inspector';
import useBudgetStore from '@/stores/useBudgetStore';
import demoData from '@/lib/demoData';

function DemoAppShellInner({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const [showSignUpModal, setShowSignUpModal] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    // Seed budget store with demo data
    useEffect(() => {
        const store = useBudgetStore.getState();

        // Read user's chosen currency from onboarding
        let userCurrency = 'BRL';
        try {
            const stored = sessionStorage.getItem('ff_onboarding');
            if (stored) {
                const data = JSON.parse(stored);
                if (data.primaryCurrency) userCurrency = data.primaryCurrency;
            }
        } catch { /* ignore */ }

        // 1. Enable demo mode FIRST — prevents BudgetDashboard's mount effects from calling APIs
        store.setDemoMode(true);

        // 2. Set the display currency to match onboarding choice
        store.setDisplayCurrency(userCurrency);

        // 3. Seed the data (remap transaction currency to user's choice)
        if (demoData.budgetCategories) store.setCategories(demoData.budgetCategories);
        if (demoData.budgetTransactions) {
            const txns = demoData.budgetTransactions.map(t => ({ ...t, currency: userCurrency }));
            // Store the FULL 3-month set for month navigation, then filter to current month
            useBudgetStore.setState({ _allDemoTransactions: txns });
            const cm = store.currentMonth;
            const filtered = txns.filter(t => t.date.startsWith(cm));
            store.setTransactions(filtered);
        }
        if (demoData.budgetRollups) {
            const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
            const currentRollup = demoData.budgetRollups.find(r => r.month === currentMonth) || demoData.budgetRollups[0];
            store.setCurrentRollup(currentRollup);
            store.setRollupHistory(demoData.budgetRollups);
        }

        // 4. Cleanup on unmount — restore normal mode when leaving /demo
        return () => {
            useBudgetStore.getState().setDemoMode(false);
        };
    }, []);

    const handleSignUpPrompt = () => {
        setShowSignUpModal(true);
    };

    const handleGoToSignUp = () => {
        router.push('/onboarding?step=signup');
    };

    return (
        <DemoPortfolioProvider onSignUpPrompt={handleSignUpPrompt}>
            <div className="flex flex-col h-screen bg-transparent overflow-hidden relative">
                <AnimatedBackground />

                {/* Demo Banner */}
                <DemoBanner onCreateAccount={handleGoToSignUp} />

                <TopConsole />

                <div className="flex flex-1 overflow-hidden">
                    <main id="main-scroll" className="flex-1 overflow-y-auto p-3 md:p-6 lg:p-8 pb-24 md:pb-8 w-full">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={pathname}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
                            >
                                {children}
                            </motion.div>
                        </AnimatePresence>
                    </main>
                </div>

                <Inspector />
                <BottomNav />

                {/* Sign-up prompt modal */}
                <AnimatePresence>
                    {showSignUpModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[9999] flex items-center justify-center"
                        >
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSignUpModal(false)} />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="relative z-10 bg-gradient-to-br from-[#1A0F2E] to-[#0B0611] border border-[#D4AF37]/30 rounded-3xl p-8 max-w-sm mx-4 shadow-2xl text-center"
                            >
                                <h2 className="text-xl font-bebas tracking-wider text-[#D4AF37] mb-2">Create Your Account</h2>
                                <p className="text-sm text-[#F5F5DC]/60 font-space mb-6">
                                    Sign up to save your data, import your portfolio, and unlock all features.
                                </p>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={handleGoToSignUp}
                                    className="w-full px-6 py-3 rounded-xl font-space text-sm tracking-wide font-bold bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0B0611] hover:shadow-lg hover:shadow-[#D4AF37]/20 border-none cursor-pointer mb-3"
                                >
                                    🎸 Create Account
                                </motion.button>
                                <button
                                    onClick={() => setShowSignUpModal(false)}
                                    className="text-[#F5F5DC]/30 hover:text-[#F5F5DC]/60 font-space text-sm bg-transparent border-none cursor-pointer"
                                >
                                    Keep exploring
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </DemoPortfolioProvider>
    );
}

export default function DemoAppShell({ children }) {
    return <DemoAppShellInner>{children}</DemoAppShellInner>;
}
