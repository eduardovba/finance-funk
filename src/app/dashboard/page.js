"use client";

import { usePortfolio } from '@/context/PortfolioContext';
import DashboardTab from '@/components/DashboardTab';

export default function DashboardPage() {
    const {
        dashboardData,
        rates,
        historicalSnapshots,
        monthlyInvestments,
        diffPrevMonth,
        diffPrevMonthGBP,
        fxEffectBRL,
        assetEffectBRL,
        fxEffectGBP,
        assetEffectGBP,
        diffTarget,
        diffTargetGBP,
        assetDiffs,
        assetDiffsGBP,
        categoryAssetDiffs,
        isInitialLoading,
        masterMixData,
        allocationTargets,
    } = usePortfolio();

    return (
        <DashboardTab
            data={dashboardData}
            rates={rates}
            historicalSnapshots={historicalSnapshots}
            monthlyInvestments={monthlyInvestments}
            diffPrevMonth={diffPrevMonth}
            diffPrevMonthGBP={diffPrevMonthGBP}
            fxEffectBRL={fxEffectBRL}
            assetEffectBRL={assetEffectBRL}
            fxEffectGBP={fxEffectGBP}
            assetEffectGBP={assetEffectGBP}
            diffTarget={diffTarget}
            diffTargetGBP={diffTargetGBP}
            assetDiffs={assetDiffs}
            assetDiffsGBP={assetDiffsGBP}
            categoryAssetDiffs={categoryAssetDiffs}
            isLoading={isInitialLoading}
            masterMixData={masterMixData}
            allocationTargets={allocationTargets}
            onNavigate={(tabId, assetName) => {
                // Map old tab IDs to new routes
                const routeMap = {
                    'fixed-income': '/assets/fixed-income',
                    'equity': '/assets/equity',
                    'real-estate': '/assets/real-estate',
                    'crypto': '/assets/crypto',
                    'pensions': '/assets/pensions',
                    'debt': '/assets/debt',
                    'dashboard': '/dashboard',
                    'general-ledger': '/ledger/income',
                    'forecast': '/targets',
                    'long-term-forecast': '/forecast',
                    'live-tracking': '/live-tracking',
                };
                let targetUrl = routeMap[tabId] || `/assets/${tabId}`;
                if (assetName) {
                    targetUrl += '#' + encodeURIComponent(assetName);
                }
                window.location.href = targetUrl;
            }}
        />
    );
}
