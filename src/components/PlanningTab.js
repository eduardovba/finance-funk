import React from 'react';
import { motion } from 'framer-motion';
import AllocationTargetsBox from './AllocationTargetsBox';
import GrowthForecastTab from './growth-forecast';
import RebalanceAdvisorTab from './RebalanceAdvisorTab';
import AssetsClassificationTab from './AssetsClassificationTab';
import { usePortfolio } from '@/context/PortfolioContext';
import useBudgetStore from '@/stores/useBudgetStore';

export default function PlanningTab({
    activeTab = 'targets',
    currentPortfolioValueBrl,
    currentPortfolioValueGbp,
    liveContributionBrl,
    liveContributionGbp,
    masterMixData,
    allocationTargets,
    onTargetsSaved
}) {

    const {
        equityTransactions,
        cryptoTransactions,
        pensionTransactions,
        debtTransactions,
        fixedIncomeTransactions,
        realEstate,
        assetClasses,
        setAssetClasses,
        refreshAllData
    } = usePortfolio();

    // ─── Budget → Forecast integration ──────────────────────
    const { currentRollup, fetchRollup } = useBudgetStore();
    React.useEffect(() => { fetchRollup(); }, [fetchRollup]);
    const budgetSurplusBrl = React.useMemo(() => {
        if (!currentRollup) return undefined;
        const surplusCents = currentRollup.total_income_cents - currentRollup.total_expenses_cents;
        return Math.round(surplusCents / 100);
    }, [currentRollup]);

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
                refreshAllData();
            }
        } catch (error) {
            console.error('Failed to save asset classes', error);
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6">

            {/* Sub-Tab Content Rendering */}
            <div className="relative w-full">

                {/* 1. Allocation Targets & Classification (Stacked Layout) */}
                {activeTab === 'targets' && (
                    <motion.div
                        key="tab-allocation"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col gap-8 w-full"
                    >
                        {/* Top Section: Targets Strategy (Donuts & Inputs) */}
                        <div className="w-full">
                            <AllocationTargetsBox
                                masterMixData={masterMixData}
                                allocationTargets={allocationTargets}
                                onTargetsSaved={onTargetsSaved}
                            />
                        </div>

                        {/* Bottom Section: Asset Classification */}
                        <div className="w-full pb-12 lg:pb-0">
                            <AssetsClassificationTab
                                assetClasses={assetClasses}
                                onSave={handleSaveAssetClasses}
                                equityTransactions={equityTransactions}
                                cryptoTransactions={cryptoTransactions}
                                pensionTransactions={pensionTransactions}
                                debtTransactions={debtTransactions}
                                transactions={fixedIncomeTransactions}
                                realEstate={realEstate}
                            />
                        </div>
                    </motion.div>
                )}

                {/* 2. Growth Forecast */}
                {activeTab === 'forecast' && (
                    <motion.div
                        key="tab-forecast"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <GrowthForecastTab
                            currentPortfolioValueBrl={currentPortfolioValueBrl}
                            currentPortfolioValueGbp={currentPortfolioValueGbp}
                            liveContributionBrl={liveContributionBrl}
                            liveContributionGbp={liveContributionGbp}
                            masterMixData={masterMixData}
                            allocationTargets={allocationTargets}
                            budgetSurplusBrl={budgetSurplusBrl}
                        />
                    </motion.div>
                )}

                {/* 3. Rebalance Advisor */}
                {activeTab === 'advisor' && (
                    <motion.div
                        key="tab-rebalance"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <RebalanceAdvisorTab
                            masterMixData={masterMixData}
                            allocationTargets={allocationTargets}
                        />
                    </motion.div>
                )}
            </div>

        </div>
    );
}
