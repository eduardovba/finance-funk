"use client";

import { usePortfolio } from '@/context/PortfolioContext';
import GeneralLedgerTab from '@/components/GeneralLedgerTab';

export default function GeneralLedgerPage() {
    const {
        equityTransactions,
        cryptoTransactions,
        pensionTransactions,
        debtTransactions,
        fixedIncomeTransactions,
        realEstate,
        rates,
        historicalSnapshots,
        dashboardData,
        handleRecordSnapshot,
        refreshAllData,
        marketData,
        pensionPrices,
        ledgerData,
        fxHistory,
        assetClasses,
        setAssetClasses,
        appSettings,
        handleUpdateAppSettings,
        setIsMonthlyCloseModalOpen
    } = usePortfolio();

    const handleSaveAssetClasses = async (overrides) => {
        try {
            const res = await fetch('/api/asset-classes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(overrides)
            });
            if (res.ok) {
                const data = await res.json();
                setAssetClasses(data.data || overrides);
                refreshAllData(); // Refresh summary calculations
            }
        } catch (error) {
            console.error('Failed to save asset classes', error);
        }
    };

    return (
        <GeneralLedgerTab
            equityTransactions={equityTransactions}
            cryptoTransactions={cryptoTransactions}
            pensionTransactions={pensionTransactions}
            debtTransactions={debtTransactions}
            transactions={fixedIncomeTransactions}
            realEstate={realEstate}
            rates={rates}
            historicalSnapshots={historicalSnapshots}
            dashboardData={dashboardData}
            onRecordSnapshot={handleRecordSnapshot}
            onRefreshLedger={refreshAllData}
            onDeleteSnapshot={() => {
                fetch('/api/history').then(res => res.json()).then(() => refreshAllData());
            }}
            marketData={marketData}
            pensionPrices={pensionPrices}
            ledgerData={ledgerData}
            fxHistory={fxHistory}
            assetClasses={assetClasses}
            onSaveAssetClasses={handleSaveAssetClasses}
            appSettings={appSettings}
            onUpdateAppSettings={handleUpdateAppSettings}
            setIsMonthlyCloseModalOpen={setIsMonthlyCloseModalOpen}
        />
    );
}
