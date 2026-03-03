"use client";

import { useEffect } from 'react';
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

function AppShellInner({ children }) {
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
        rates, marketData, pensionPrices, ledgerData, fxHistory, historicalSnapshots, assetClasses
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

    return (
        <div className="flex flex-col h-screen bg-transparent overflow-hidden relative">
            <InteractiveDots />
            <TopConsole />

            {/* ═══════════ MAIN STAGE ═══════════ */}
            <main className="flex-1 overflow-y-auto p-6 lg:p-8 w-full">
                {children}

                {isFormOpen && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div
                            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
                            onClick={() => setIsFormOpen(false)}
                        />
                        <TransactionForm
                            onAdd={handleSaveTransaction}
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
