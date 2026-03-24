"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { PortfolioProvider, usePortfolio } from '@/context/PortfolioContext';
import TopConsole from '@/components/TopConsole';
import TransactionForm from '@/components/TransactionForm';
import ConfirmationModal from '@/components/ConfirmationModal';
import StatusModal from '@/components/StatusModal';
import AnimatedBackground from '@/components/AnimatedBackground';
import Inspector from '@/components/Inspector';
import MonthlyCloseModal from '@/components/MonthlyCloseModal';
import BottomNav from '@/components/BottomNav';
import InstallPrompt from '@/components/InstallPrompt';
import FTUEWizard from '@/components/ftue/FTUEWizard';
import FTUEChecklist from '@/components/ftue/FTUEChecklist';
import CurrencyQuickPicker from '@/components/ftue/CurrencyQuickPicker';
import FirstVisitGreeting from '@/components/ftue/FirstVisitGreeting';
import GrooveCheck from '@/components/ftue/GrooveCheck';

function AppShellInner({ children }: { children: React.ReactNode }) {
    const {
        isFormOpen, setIsFormOpen,
        editingTransaction, setEditingTransaction,
        isDeleteModalOpen, setIsDeleteModalOpen,
        isInspectorOpen, setIsInspectorOpen,
        statusModal, setStatusModal,
        handleSaveTransaction,
        handleConfirmDelete,
        // Monthly Close props
        isMonthlyCloseModalOpen, setIsMonthlyCloseModalOpen,
        handleRecordSnapshot,
        transactions, fixedIncomeTransactions, equityTransactions, cryptoTransactions, pensionTransactions, debtTransactions, realEstate,
        rates, marketData, pensionPrices, ledgerData, fxHistory, historicalSnapshots, assetClasses,
        // FTUE
        ftueState, updateFtueProgress,
        refreshAllData
    } = usePortfolio();

    const pathname = usePathname();
    const router = useRouter();

    // Auth pages get a clean layout without the app shell chrome
    const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/onboarding';

    // Scroll to top on route change
    useEffect(() => {
        window.scrollTo(0, 0);
        const main = document.getElementById('main-scroll');
        if (main) main.focus({ preventScroll: true });
    }, [pathname]);

    // Goal-based landing redirect — budget users land on /budget instead of /dashboard
    useEffect(() => {
        if (!ftueState) return;
        if (ftueState.onboardingGoal !== 'budget') return;
        if (!ftueState.showFirstVisitGreeting) return;
        if (pathname !== '/dashboard') return;
        router.replace('/budget');
    }, [ftueState, pathname, router]);

    // Tracking mouse position for background interactivity
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const x = (e.clientX / window.innerWidth).toFixed(3);
            const y = (e.clientY / window.innerHeight).toFixed(3);
            document.documentElement.style.setProperty('--mouse-x', x);
            document.documentElement.style.setProperty('--mouse-y', y);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Auth pages: clean layout without nav/inspector/modals
    if (isAuthPage) {
        return <>{children}</>;
    }

    // ═══════════ FTUE HANDLERS ═══════════
    const handleTakeTour = useCallback(async () => {
        try {
            // Mark wizard completed, enable demo data + tutorial
            await updateFtueProgress({
                wizardCompleted: true,
                usingDemoData: true,
                isTutorialActive: true,
                tutorialStep: 0,
            });
            await refreshAllData();
        } catch (e) {
            console.error('Take tour error:', e);
        }
    }, [updateFtueProgress, refreshAllData]);

    const handleSkipTour = useCallback(async () => {
        try {
            // Mark wizard completed, no demo data, show currency picker
            await updateFtueProgress({
                wizardCompleted: true,
                usingDemoData: false,
                isTutorialActive: false,
                showCurrencyPicker: true,
            });
            await refreshAllData();
        } catch (e) {
            console.error('Skip tour error:', e);
        }
    }, [updateFtueProgress, refreshAllData]);

    const handleCurrencyPickerDone = useCallback(async () => {
        await updateFtueProgress({
            showCurrencyPicker: false,
            checklistItems: { ...ftueState?.checklistItems, setCurrencies: true },
        });
    }, [updateFtueProgress, ftueState]);

    // Determine FTUE overlays
    const showWizardOverlay = ftueState && ftueState.wizardCompleted === false;
    const showCurrencyPicker = false; // Currency is now set during onboarding
    const showOnboardingSidebar = ftueState 
        && ftueState.wizardCompleted === true 
        && !ftueState.sidebarDismissed
        && !ftueState.checklistDismissed 
        && !isAuthPage;

    return (
        <PullToRefreshWrapper>
            <div className="flex flex-col h-screen bg-transparent overflow-hidden relative">
                {/* Animated background shapes */}
                <AnimatedBackground />
                <TopConsole />

                {/* Mobile version of checklist banner */}
                {showOnboardingSidebar && (
                    <div className="md:hidden">
                        <FTUEChecklist mode="mobile" />
                    </div>
                )}

                {/* ═══════════ MAIN STAGE ═══════════ */}
                <div className="flex flex-1 overflow-hidden">
                    <main id="main-scroll" role="main" tabIndex={-1} className="flex-1 overflow-y-auto p-3 md:p-6 lg:p-8 pb-24 md:pb-8 w-full">
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

                    {isFormOpen && (
                        <div className="fixed inset-0 z-[900] flex items-center justify-center">
                            <div
                                className="absolute inset-0 bg-black/70 backdrop-blur-[4px]"
                                onClick={() => setIsFormOpen(false)}
                            />
                            <TransactionForm
                                onAdd={(tx: any) => {
                                    handleSaveTransaction(tx);
                                    setIsFormOpen(false);
                                }}
                                onCancel={() => setIsFormOpen(false)}
                                initialData={editingTransaction}
                            />
                        </div>
                    )}

                    <ConfirmationModal
                        isOpen={isDeleteModalOpen}
                        title="Delete Transaction"
                        message="Are you sure you want to delete this transaction? This action cannot be undone."
                        onConfirm={handleConfirmDelete}
                        onCancel={() => setIsDeleteModalOpen(false)}
                    />

                    <StatusModal
                        isOpen={statusModal.isOpen}
                        title={statusModal.title}
                        message={statusModal.message}
                        type={statusModal.type as any}
                        onClose={() => setStatusModal((prev: any) => ({ ...prev, isOpen: false }))}
                    />

                    <MonthlyCloseModal
                        isOpen={isMonthlyCloseModalOpen}
                        onClose={() => setIsMonthlyCloseModalOpen(false)}
                        onRecord={(snapshot: any) => {
                            handleRecordSnapshot(snapshot);
                            setIsMonthlyCloseModalOpen(false);
                        }}
                        rawTransactions={transactions}
                        rawFixedIncome={fixedIncomeTransactions}
                        rawEquity={equityTransactions}
                        rawCrypto={cryptoTransactions}
                        rawPensions={pensionTransactions}
                        rawDebt={debtTransactions}
                        rawRealEstate={realEstate}
                        rates={rates}
                        marketData={marketData}
                        pensionPrices={pensionPrices}
                        ledgerData={ledgerData}
                        fxHistory={fxHistory}
                        historicalSnapshots={historicalSnapshots as any}
                        assetClasses={assetClasses}
                    />
                </main>

                {/* Onboarding sidebar — only on desktop */}
                {showOnboardingSidebar && (
                    <div className="hidden md:block shrink-0">
                        <FTUEChecklist mode="sidebar" />
                    </div>
                )}
            </div>

                {/* ═══════════ INSPECTOR DRAWER ═══════════ */}
                <Inspector />

                {/* ═══════════ MOBILE BOTTOM NAV ═══════════ */}
                <BottomNav />

                {/* ═══════════ PWA INSTALL PROMPT ═══════════ */}
                <InstallPrompt />
                <FirstVisitGreeting />
                <GrooveCheck />

                {/* ═══════════ FTUE WIZARD OVERLAY (on top of populated dashboard) ═══════════ */}
                {showWizardOverlay && (
                    <FTUEWizard onTakeTour={handleTakeTour} onSkipTour={handleSkipTour} />
                )}

                {/* ═══════════ CURRENCY QUICK PICKER (post-tutorial) ═══════════ */}
                {showCurrencyPicker && (
                    <CurrencyQuickPicker onDone={handleCurrencyPickerDone} />
                )}
            </div>
        </PullToRefreshWrapper>
    );
}

/* ─── Pull-to-Refresh Wrapper ─── */
function PullToRefreshWrapper({ children }: { children: React.ReactNode }) {
    const { refreshAllData } = usePortfolio();
    const [pulling, setPulling] = React.useState(false);
    const [pullDistance, setPullDistance] = React.useState(0);
    const [refreshing, setRefreshing] = React.useState(false);
    const startY = React.useRef(0);
    const threshold = 80;

    const handleTouchStart = (e: React.TouchEvent) => {
        const mainEl = document.getElementById('main-scroll');
        if (mainEl && mainEl.scrollTop <= 0) {
            startY.current = e.touches[0].clientY;
            setPulling(true);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!pulling || refreshing) return;
        const diff = e.touches[0].clientY - startY.current;
        if (diff > 0) {
            setPullDistance(Math.min(diff * 0.5, 120));
        }
    };

    const handleTouchEnd = async () => {
        if (pullDistance >= threshold && !refreshing) {
            setRefreshing(true);
            setPullDistance(threshold * 0.6);
            try {
                if (refreshAllData) await refreshAllData();
            } catch (e) {
                console.error('Refresh failed:', e);
            }
            await new Promise(r => setTimeout(r, 500));
            setRefreshing(false);
        }
        setPulling(false);
        setPullDistance(0);
    };

    return (
        <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative"
        >
            {/* Pull indicator */}
            {(pullDistance > 10 || refreshing) && (
                <div
                    className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] flex items-center justify-center md:hidden"
                    style={{ opacity: Math.min(pullDistance / threshold, 1) }}
                >
                    <div className={`w-8 h-8 rounded-full border-2 border-[#D4AF37]/50 border-t-[#D4AF37] ${refreshing ? 'animate-spin' : ''}`}
                        style={{ transform: refreshing ? undefined : `rotate(${pullDistance * 3}deg)` }}
                    />
                </div>
            )}
            {children}
        </div>
    );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Demo routes use their own DemoAppShell with DemoPortfolioProvider
    // Don't wrap them in PortfolioProvider to avoid context conflicts
    if (pathname?.startsWith('/demo')) {
        return <>{children}</>;
    }

    return (
        <PortfolioProvider>
            <AppShellInner>{children}</AppShellInner>
        </PortfolioProvider>
    );
}

