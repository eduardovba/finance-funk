import React, { useState } from 'react';
import _MetricCard from '../MetricCard';
import _ConsolidatedAssetTable from '../ConsolidatedAssetTable';
import _DashboardCustomizer from '../DashboardCustomizer';
import _TutorialOverlay from '../ftue/TutorialOverlay';
const MetricCard = _MetricCard as any;
const ConsolidatedAssetTable = _ConsolidatedAssetTable as any;
const DashboardCustomizer = _DashboardCustomizer as any;
const TutorialOverlay = _TutorialOverlay as any;

import DashboardCharts from './charts';
import DashboardHero from './DashboardHero';
import useDashboard from './useDashboard';
import { StaggerList } from '@/components/ui/stagger-list';
import BudgetKpiPod from '@/components/budget/BudgetKpiPod';
import FirstGrooveFlow from '@/components/ftue/FirstGrooveFlow';
import MonthlyCloseWidget from '@/components/MonthlyCloseWidget';
import SmartMonthlyCloseModal from '@/components/SmartMonthlyCloseModal';
import _PersonalizedEmptyState from '@/components/ftue/PersonalizedEmptyState';
const PersonalizedEmptyState = _PersonalizedEmptyState as any;
import useBudgetStore from '@/stores/useBudgetStore';
import type { DashboardTabProps } from './types';
import { getPersonalization } from '@/lib/personalization';
import { usePortfolio } from '@/context/PortfolioContext';

export default function DashboardTab(props: DashboardTabProps) {
    const {
        data, rates, historicalSnapshots, monthlyInvestments,
        diffPrevMonth, diffPrevMonthGBP, fxEffectBRL, assetEffectBRL,
        fxEffectGBP, assetEffectGBP, diffTarget, diffTargetGBP,
        assetDiffs, assetDiffsGBP, categoryAssetDiffs,
        isLoading, masterMixData, allocationTargets, onNavigate
    } = props;

    const h = useDashboard(props);
    const { singleCurrencyMode } = usePortfolio() as any;
    const personalization = getPersonalization(h.ftueState || { onboardingGoal: null, onboardingExperience: 'beginner' });
    const budgetTransactions = useBudgetStore((s: any) => s.transactions);
    const [isSmartCloseOpen, setIsSmartCloseOpen] = useState(false);

    const hasPortfolioData = data?.netWorth?.amount > 0 ||
        data?.categories?.some((cat: any) => cat.assets?.length > 1);
    const hasBudgetData = budgetTransactions?.length > 0;
    const hasAnyData = hasPortfolioData || hasBudgetData;

    // Show unified empty state for new users with no data (not demo mode)
    if (!hasAnyData && !isLoading && !h.ftueState?.usingDemoData) {
        return (
            <div className="pb-10">
                <FirstGrooveFlow />
                <PersonalizedEmptyState
                    copyKey="emptyPortfolioDashboard"
                    actionLabel="🎸 Import Your Data"
                    onAction={() => { window.location.href = '/import'; }}
                    secondaryLabel="Add Manually"
                    onSecondaryAction={() => {
                        const goal = h.ftueState?.onboardingGoal || 'both';
                        if (goal === 'budget') window.location.href = '/budget';
                        else window.location.href = '/assets/equity';
                    }}
                />
            </div>
        );
    }

    return (
        <div className="pb-10">
            {/* First Groove — guided first action for new users */}
            <FirstGrooveFlow />

            {/* Smart Monthly Close — task checklist widget */}
            <MonthlyCloseWidget onOpenChecklist={() => setIsSmartCloseOpen(true)} />
            <SmartMonthlyCloseModal isOpen={isSmartCloseOpen} onClose={() => setIsSmartCloseOpen(false)} />

            {/* Mobile Hero */}
            <DashboardHero
                data={data}
                historicalSnapshots={historicalSnapshots}
                isLoading={isLoading}
                primaryMeta={h.primaryMeta}
                secondaryMeta={h.secondaryMeta}
                primaryCurrency={h.primaryCurrency}
                secondaryCurrency={h.secondaryCurrency}
                toPrimary={h.toPrimary}
                toSecondary={h.toSecondary}
                formatPrimaryNoDecimals={h.formatPrimaryNoDecimals}
                formatSecondaryNoDecimals={h.formatSecondaryNoDecimals}
                currentROI={h.currentROI}
                diffPrevMonth={diffPrevMonth}
                diffPrevMonthGBP={diffPrevMonthGBP}
                diffTarget={diffTarget}
                diffTargetGBP={diffTargetGBP}
                fxEffectBRL={fxEffectBRL}
                assetEffectBRL={assetEffectBRL}
                fxEffectGBP={fxEffectGBP}
                assetEffectGBP={assetEffectGBP}
                topContributors={h.topContributors}
                topContributorsSecondary={h.topContributorsSecondary}
                heroExpanded={h.heroExpanded}
                setHeroExpanded={h.setHeroExpanded}
                lastUpdatedLabel={h.lastUpdatedLabel}
                forceRefreshMarketData={h.forceRefreshMarketData}
                isRefreshingMarketData={h.isRefreshingMarketData}
                sidebar={h.expandedSummaries.map((metric: any) => {
                    const contributors = categoryAssetDiffs?.[metric.id]
                        ? Object.entries(categoryAssetDiffs[metric.id])
                            .map(([name, diff]: [string, any]) => ({ name, amount: diff.amount, percentage: diff.percentage }))
                            .filter(c => Math.abs(c.amount) > 10)
                            .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
                            .slice(0, 3)
                        : [];
                    return (
                        <MetricCard
                            key={metric.id}
                            id={metric.navigateId || metric.id}
                            title={metric.title}
                            amount={h.toPrimary(metric.amount, 'BRL')}
                            currency={h.primaryCurrency}
                            primaryCurrency={h.primaryCurrency}
                            secondaryCurrency={h.secondaryCurrency}
                            singleCurrencyMode={singleCurrencyMode}
                            rates={rates}
                            percentage={assetDiffs?.[metric.id]?.percentage || 0}
                            diffAmount={h.toPrimary(assetDiffs?.[metric.id]?.amount || 0, 'BRL')}
                            contributors={contributors}
                            invertColor={metric.id === 'debt'}
                            isLoading={isLoading}
                            onNavigate={onNavigate}
                            compact={true}
                            className="flex-1 rounded-xl bg-[#121418]/60 backdrop-blur-xl border-white/[0.06] shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-all duration-300"
                        />
                    );
                })}
            />

            {/* Dashboard Customizer Modal */}
            {h.isCustomizing && (
                <DashboardCustomizer
                    initialConfig={h.dashboardConfig || { charts: [] }}
                    onClose={() => h.setIsCustomizing(false)}
                    onSave={(newConfig: any) => {
                        h.setDashboardConfig(newConfig);
                        h.setIsCustomizing(false);
                    }}
                />
            )}

            {/* Dashboard Charts */}
            {h.dashboardConfig && h.dashboardConfig.charts && h.dashboardConfig.charts.length > 0 && (
                <div id="ftue-charts">
                    <DashboardCharts
                        historicalData={historicalSnapshots || []}
                        currentMonthData={data}
                        rates={rates}
                        monthlyInvestments={monthlyInvestments}
                        masterMixData={masterMixData}
                        allocationTargets={allocationTargets}
                        onCustomizeClick={() => h.setIsCustomizing(true)}
                        forecastSettings={h.forecastSettings}
                        dashboardConfig={h.dashboardConfig}
                        singleCurrencyMode={singleCurrencyMode}
                        onNavigate={onNavigate}
                    />
                </div>
            )}

            {/* Budget KPI Pod */}
            <div className="mb-4">
                <BudgetKpiPod />
            </div>

            {/* Sub-categories Grid (Mobile & Tablet) */}
            <StaggerList className="grid lg:hidden grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3 md:gap-6 mb-8 md:mb-12">
                {h.expandedSummaries.map((metric: any) => {
                    const contributors = categoryAssetDiffs?.[metric.id]
                        ? Object.entries(categoryAssetDiffs[metric.id])
                            .map(([name, diff]: [string, any]) => ({ name, amount: diff.amount, percentage: diff.percentage }))
                            .filter(c => Math.abs(c.amount) > 10)
                            .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
                            .slice(0, 3)
                        : [];

                    return (
                        <MetricCard
                            key={metric.id}
                            id={metric.navigateId || metric.id}
                            title={metric.title}
                            amount={h.toPrimary(metric.amount, 'BRL')}
                            currency={h.primaryCurrency}
                            primaryCurrency={h.primaryCurrency}
                            secondaryCurrency={h.secondaryCurrency}
                            singleCurrencyMode={singleCurrencyMode}
                            rates={rates}
                            percentage={assetDiffs?.[metric.id]?.percentage || 0}
                            diffAmount={h.toPrimary(assetDiffs?.[metric.id]?.amount || 0, 'BRL')}
                            contributors={contributors}
                            invertColor={metric.id === 'debt'}
                            isLoading={isLoading}
                            onNavigate={onNavigate}
                        />
                    );
                })}
            </StaggerList>

            {/* Detailed Tables Section */}
            {personalization.showAdvancedFeatures ? (
                <div id="ftue-tables" className="grid lg:grid-cols-2 gap-5 mt-4">
                    {data.categories.map((cat: any) => (
                        <ConsolidatedAssetTable
                            key={cat.id}
                            categoryId={cat.id}
                            title={cat.title}
                            assets={cat.assets}
                            rates={rates}
                            hideInvestment={cat.id === 'debt'}
                            singleCurrencyMode={singleCurrencyMode}
                            onNavigate={onNavigate}
                        />
                    ))}
                </div>
            ) : (
                <details className="mt-4">
                    <summary className="text-sm text-[#F5F5DC]/40 font-space cursor-pointer hover:text-[#F5F5DC]/60 transition-colors py-2">
                        Show detailed positions &rarr;
                    </summary>
                    <div id="ftue-tables" className="grid lg:grid-cols-2 gap-5 mt-2">
                        {data.categories.map((cat: any) => (
                            <ConsolidatedAssetTable
                                key={cat.id}
                                categoryId={cat.id}
                                title={cat.title}
                                assets={cat.assets}
                                rates={rates}
                                hideInvestment={cat.id === 'debt'}
                                singleCurrencyMode={singleCurrencyMode}
                                onNavigate={onNavigate}
                            />
                        ))}
                    </div>
                </details>
            )}

            {/* Tutorial Overlay */}
            {h.ftueState?.isTutorialActive && <TutorialOverlay />}
        </div>
    );
}
