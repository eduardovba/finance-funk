"use client";

import React, { useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { PortfolioProvider, usePortfolio } from '@/context/PortfolioContext';
import TopConsole from '@/components/TopConsole';
import TransactionForm from '@/components/TransactionForm';
import ConfirmationModal from '@/components/ConfirmationModal';
import StatusModal from '@/components/StatusModal';
import InteractiveDots from '@/components/InteractiveDots';
import Inspector from '@/components/Inspector';
import MonthlyCloseModal from '@/components/MonthlyCloseModal';
import BottomNav from '@/components/BottomNav';
import InstallPrompt from '@/components/InstallPrompt';
import FTUEWizard from '@/components/ftue/FTUEWizard';
import FTUEChecklist from '@/components/ftue/FTUEChecklist';
import CurrencyQuickPicker from '@/components/ftue/CurrencyQuickPicker';

function AppShellInner({ children }) {
    const {
        isFormOpen, setIsFormOpen,
        inspectorMode, // Import inspectorMode here
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

    // Auth pages get a clean layout without the app shell chrome
    const isAuthPage = pathname === '/login' || pathname === '/register';

    // Scroll to top on route change
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    // Tracking mouse position for background interactivity
    useEffect(() => {
        const handleMouseMove = (e) => {
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
    const showCurrencyPicker = ftueState?.showCurrencyPicker && !ftueState?.isTutorialActive;

    return (
        <PullToRefreshWrapper>
            <div className="flex flex-col h-screen bg-transparent overflow-hidden relative">
                {/* InteractiveDots — hidden on mobile for performance */}
                <div className="hidden md:block">
                    <InteractiveDots />
                </div>
                <TopConsole />

                {/* ═══════════ MAIN STAGE ═══════════ */}
                <main id="main-scroll" className="flex-1 overflow-y-auto p-3 md:p-6 lg:p-8 pb-24 md:pb-8 w-full">
                    {children}

                    {isFormOpen && inspectorMode !== 'add-transaction' && (
                        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div
                                style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
                                onClick={() => setIsFormOpen(false)}
                            />
                            <TransactionForm
                                onAdd={(tx) => {
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
                        type={statusModal.type}
                        onClose={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
                    />

                    <MonthlyCloseModal
                        isOpen={isMonthlyCloseModalOpen}
                        onClose={() => setIsMonthlyCloseModalOpen(false)}
                        onRecord={(snapshot) => {
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
                        historicalSnapshots={historicalSnapshots}
                        assetClasses={assetClasses}
                    />
                </main>

                {/* ═══════════ INSPECTOR DRAWER ═══════════ */}
                <Inspector />

                {/* ═══════════ MOBILE BOTTOM NAV ═══════════ */}
                <BottomNav />

                {/* ═══════════ PWA INSTALL PROMPT ═══════════ */}
                <InstallPrompt />

                {/* ═══════════ FTUE PROGRESS CHECKLIST ═══════════ */}
                <FTUEChecklist />

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
function PullToRefreshWrapper({ children }) {
    const { refreshAllData } = usePortfolio();
    const [pulling, setPulling] = React.useState(false);
    const [pullDistance, setPullDistance] = React.useState(0);
    const [refreshing, setRefreshing] = React.useState(false);
    const startY = React.useRef(0);
    const threshold = 80;

    const handleTouchStart = (e) => {
        const mainEl = document.getElementById('main-scroll');
        if (mainEl && mainEl.scrollTop <= 0) {
            startY.current = e.touches[0].clientY;
            setPulling(true);
        }
    };

    const handleTouchMove = (e) => {
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
                    className="fixed top-12 left-1/2 -translate-x-1/2 z-[996] flex items-center justify-center md:hidden"
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

export default function AppShell({ children }) {
    return (
        <PortfolioProvider>
            <AppShellInner>{children}</AppShellInner>
        </PortfolioProvider>
    );
}

