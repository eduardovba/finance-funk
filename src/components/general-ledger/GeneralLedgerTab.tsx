import React from 'react';
import _PageTutorialOverlay from '../ftue/PageTutorialOverlay';
const PageTutorialOverlay = _PageTutorialOverlay as any;

import useGeneralLedger from './useGeneralLedger';
import LedgerIncomeView from './LedgerIncomeView';
import LedgerInvestmentsView from './LedgerInvestmentsView';
import LedgerHistoricalsView from './LedgerHistoricalsView';
import LedgerModals from './LedgerModals';
import type { GeneralLedgerTabProps } from './types';

const INCOME_TUTORIAL_STEPS = [
    { type: 'spotlight', targetId: 'ftue-income-pods', title: 'Income Performance', message: "Monitor your top-level income performance. We\u2019ve separated organic income (like your salary) from investment yield (like dividends) for absolute clarity.", position: 'bottom' },
    { type: 'spotlight', targetId: 'ftue-income-chart', title: 'Revenue Stream Analysis', message: "Visualize exactly how your income sources are performing over time. We calculate your investment yield automatically based on your asset pages.", position: 'top' },
    { type: 'spotlight', targetId: 'ftue-income-table', title: 'Unified Revenue Ledger', message: "A detailed monthly breakdown of all your income sources, consolidated and automatically compiled for your convenience.", position: 'top' },
];

const INVESTMENT_TUTORIAL_STEPS = [
    { type: 'spotlight', targetId: 'ftue-investment-pods', title: 'Capital Deployment Pulse', message: "Keep a finger on the pulse of how much fresh capital you are injecting into your portfolio across all asset classes each month.", position: 'bottom' },
    { type: 'spotlight', targetId: 'ftue-investment-chart', title: 'Investment Trends Analysis', message: "See precisely where your capital is being deployed. The net monthly line calculates your fresh capital invested minus any withdrawals or debt.", position: 'top' },
    { type: 'spotlight', targetId: 'ftue-investment-table', title: 'Investment Records', message: "Access a comprehensive history of your monthly capital deployments, giving you an unambiguous view of your saving and investment habits.", position: 'top' },
];

const TOTALS_TUTORIAL_STEPS = [
    { type: 'spotlight', targetId: 'ftue-totals-pods', title: 'Definitive Portfolio Pulse', message: "This is the ultimate perspective on your finances. Track your true net worth, overall ROI, and progress against your core financial goals.", position: 'bottom' },
    { type: 'spotlight', targetId: 'ftue-totals-table', title: 'Monthly Wealth Records', message: "Record your final net worth each month to construct a robust historical track record. This is where you see your wealth truly compound.", position: 'top' },
];

const noop = () => {};

export default function GeneralLedgerTab(props: GeneralLedgerTabProps) {
    const {
        onRecordSnapshot,
        appSettings = {},
        onUpdateAppSettings = noop,
        setIsMonthlyCloseModalOpen = noop,
    } = props;

    const h = useGeneralLedger(props);

    if (h.loading) return <div style={{ padding: '32px', color: 'var(--fg-secondary)' }}>Loading ledger data...</div>;

    return (
        <>
            <div id="ftue-ledger-container" className="w-full max-w-[1800px] mx-auto pb-4 lg:pb-0">
                {h.view === 'income' && (
                    <LedgerIncomeView
                        incomeData={h.incomeData}
                        showExtraordinary={h.showExtraordinary}
                        setShowExtraordinary={h.setShowExtraordinary}
                        showLedgerTable={h.showLedgerTable}
                        setShowLedgerTable={h.setShowLedgerTable}
                        currentMonth={h.currentMonth}
                        handleEditClick={h.handleEditClick}
                        setDeleteLedgerMonth={h.setDeleteLedgerMonth as (m: string | null) => void}
                    />
                )}

                {h.view === 'historicals' && (
                    <LedgerHistoricalsView
                        combinedSnapshots={h.combinedSnapshots}
                        forecastSettings={h.forecastSettings}
                        showHistoricalsLedger={h.showHistoricalsLedger}
                        setShowHistoricalsLedger={h.setShowHistoricalsLedger}
                        onRecordSnapshot={onRecordSnapshot}
                        appSettings={appSettings as Record<string, any>}
                        onUpdateAppSettings={onUpdateAppSettings as (s: Record<string, any>) => void}
                        setIsMonthlyCloseModalOpen={setIsMonthlyCloseModalOpen as (open: boolean) => void}
                        handleEditClick={h.handleEditClick}
                        setDeleteMonth={h.setDeleteMonth as (m: string | null) => void}
                    />
                )}

                {h.view === 'investments' && (
                    <LedgerInvestmentsView
                        investmentData={h.investmentData}
                        showInvestmentLedgerTable={h.showInvestmentLedgerTable}
                        setShowInvestmentLedgerTable={h.setShowInvestmentLedgerTable}
                        currentMonth={h.currentMonth}
                        handleEditClick={h.handleEditClick}
                        setDeleteLedgerMonth={h.setDeleteLedgerMonth as (m: string | null) => void}
                    />
                )}

                <LedgerModals
                    editingRow={h.editingRow}
                    editForm={h.editForm}
                    isSaving={h.isSaving}
                    deleteMonth={h.deleteMonth}
                    deleteLedgerMonth={h.deleteLedgerMonth}
                    setEditingRow={h.setEditingRow}
                    setEditForm={h.setEditForm}
                    handleEditSave={h.handleEditSave}
                    handleDeleteSnapshot={h.handleDeleteSnapshot}
                    handleDeleteLedgerData={h.handleDeleteLedgerData}
                    setDeleteMonth={h.setDeleteMonth as (m: string | null) => void}
                    setDeleteLedgerMonth={h.setDeleteLedgerMonth as (m: string | null) => void}
                />
            </div>
            {h.view === 'income' && <PageTutorialOverlay pageId="ledger-income" steps={INCOME_TUTORIAL_STEPS} />}
            {h.view === 'investments' && <PageTutorialOverlay pageId="ledger-investments" steps={INVESTMENT_TUTORIAL_STEPS} />}
            {h.view === 'historicals' && <PageTutorialOverlay pageId="ledger-totals" steps={TOTALS_TUTORIAL_STEPS} />}
        </>
    );
}
