import React, { useMemo, useState, useEffect } from 'react';
import MetricCard from './MetricCard';
import ConsolidatedAssetTable from './ConsolidatedAssetTable';
import DashboardCharts from './DashboardCharts';
import { calculateTWRHistory } from '@/lib/roiUtils';

import { usePortfolio } from '@/context/PortfolioContext';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import DashboardCustomizer from './DashboardCustomizer';

export default function DashboardTab({
    data,
    rates,
    historicalSnapshots,
    monthlyInvestments,
    diffPrevMonth,
    diffPrevMonthGBP,
    diffTarget,
    diffTargetGBP,
    assetDiffs,
    assetDiffsGBP,
    categoryAssetDiffs,
    isLoading,
    masterMixData,
    allocationTargets,
    onNavigate
}) {
    const { primaryCurrency, secondaryCurrency, toPrimary, toSecondary, formatPrimary, formatSecondary,
        forceRefreshMarketData, isRefreshingMarketData, lastUpdated,
        appSettings, handleUpdateAppSettings, dashboardConfig, setDashboardConfig, forecastSettings
    } = usePortfolio();
    const [isCustomizing, setIsCustomizing] = useState(false);
    const primaryMeta = SUPPORTED_CURRENCIES[primaryCurrency];
    const secondaryMeta = SUPPORTED_CURRENCIES[secondaryCurrency];

    // Tick every 30s so the "X min ago" label stays live
    const [, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 30000);
        return () => clearInterval(id);
    }, []);

    const lastUpdatedLabel = useMemo(() => {
        if (!lastUpdated) return null;
        const mins = Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 60000);
        if (mins < 1) return 'just now';
        if (mins === 1) return '1m ago';
        return `${mins}m ago`;
    }, [lastUpdated, /* tick forces recompute */]);

    // Calculate current ROI for the Hero badge
    const currentROI = useMemo(() => {
        if (!historicalSnapshots || !monthlyInvestments || !data?.netWorth) return { percentage: 0, absolute: 0 };

        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const liveSnapshot = {
            month: currentMonth,
            networthBRL: data.netWorth.amount,
            impliedRate: rates.BRL
        };

        const snapshotsForTWR = [
            ...historicalSnapshots.map(d => ({
                ...d,
                networthBRL: d.networthBRL || d.totalminuspensionsBRL || 0,
                networthGBP: d.networthGBP || d.totalminuspensionsGBP || (d.networthBRL / rates.BRL)
            })),
            liveSnapshot
        ];

        const twrHistoryMap = calculateTWRHistory(snapshotsForTWR, monthlyInvestments || [], rates);

        // Calculate absolute return (Current Net Worth - Total Invested)
        const totalInvested = Object.values(monthlyInvestments || []).reduce((sum, inv) => {
            const total = inv.total !== undefined ? inv.total : (
                (inv.equity || 0) +
                (inv.fixedIncome || 0) +
                (inv.realEstate || 0) +
                (inv.pensions || 0) +
                (inv.crypto || 0) +
                (inv.debt || 0)
            );
            return sum + total;
        }, 0);
        // Add initial value if exists
        const initialValue = historicalSnapshots.length > 0 ? (historicalSnapshots[0].networthBRL || historicalSnapshots[0].totalminuspensionsBRL || 0) : 0;

        const absoluteReturn = data.netWorth.amount - (totalInvested + initialValue);

        const absVal = Math.abs(absoluteReturn);
        let formattedAbsolute = '';
        if (absVal >= 1000000) {
            formattedAbsolute = `${(absVal / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}M`;
        } else {
            formattedAbsolute = `${(absVal / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`;
        }

        return {
            percentage: twrHistoryMap[currentMonth] || 0,
            absolute: absoluteReturn,
            formattedAbsolute
        };
    }, [historicalSnapshots, monthlyInvestments, data, rates]);

    // Calculate Top Contributors (Primary Currency)
    const topContributors = useMemo(() => {
        if (!assetDiffs) return [];
        return Object.entries(assetDiffs)
            .map(([id, diff]) => ({
                id,
                name: data.summaries.find(s => s.id === id)?.title || id,
                amount: diff.amount,
                percentage: diff.percentage
            }))
            .filter(c => Math.abs(c.amount) > 100)
            .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
            .slice(0, 3);
    }, [assetDiffs, data.summaries]);

    // Calculate Top Contributors (Secondary Currency)
    const topContributorsSecondary = useMemo(() => {
        if (!assetDiffsGBP) return [];
        return Object.entries(assetDiffsGBP)
            .map(([id, diff]) => ({
                id,
                name: data.summaries.find(s => s.id === id)?.title || id,
                amount: diff.amount,
                percentage: diff.percentage
            }))
            .filter(c => Math.abs(c.amount) > 10) // Lower threshold for GBP
            .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
            .slice(0, 3);
    }, [assetDiffsGBP, data.summaries]);

    // Use original summaries for the MetricCard grid (one card per category)
    const expandedSummaries = useMemo(() => {
        return data.summaries;
    }, [data.summaries]);

    return (
        <div className="pb-10">
            {/* Hero Section - Total Net Worth */}
            <div className="bg-[#1A0F2E] border-t border-l border-t-[#D4AF37]/40 border-l-[#D4AF37]/40 border-b-2 border-r-2 border-b-black/60 border-r-black/60 shadow-2xl rounded-2xl overflow-hidden mb-8">
                <div className="p-8">
                    <div className="flex justify-center mb-8 relative">
                        <h3 className="text-[#D4AF37]/60 text-2xl uppercase tracking-[4px] m-0 font-bebas flex items-center gap-4">
                            Total Net Worth
                        </h3>
                        {/* Refresh Prices Button */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-3">
                            {lastUpdatedLabel && (
                                <span className="text-[10px] text-[#F5F5DC]/25 font-space tracking-wider uppercase">
                                    {lastUpdatedLabel}
                                </span>
                            )}
                            <button
                                onClick={forceRefreshMarketData}
                                disabled={isRefreshingMarketData}
                                className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-[#D4AF37]/20 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Refresh live prices"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-[#F5F5DC]/40 group-hover:text-[#D4AF37]/70 transition-colors ${isRefreshingMarketData ? 'animate-spin' : ''}`}>
                                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                                    <path d="M21 3v5h-5" />
                                </svg>
                                <span className="text-[10px] text-[#F5F5DC]/30 group-hover:text-[#D4AF37]/60 font-space tracking-wider uppercase transition-colors">
                                    {isRefreshingMarketData ? 'Refreshing...' : 'Refresh'}
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className={`grid grid-cols-1 lg:grid-cols-[1fr_1px_auto_1px_1fr] gap-6 lg:gap-10 items-center transition-opacity duration-300 ${isLoading ? 'opacity-30' : 'opacity-100'}`}>

                        {/* Primary Currency Section */}
                        <div className="text-center p-8 rounded-xl bg-black/40 shadow-inner border border-white/5 flex flex-col justify-center min-h-[220px] transition-all duration-300 hover:bg-black/60 hover:border-[#D4AF37]/30 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(212,175,55,0.1)]">
                            <div className="flex items-baseline justify-center gap-3 mb-4">
                                <span className="text-2xl text-[#F5F5DC]/60 font-medium font-space">{primaryMeta?.symbol}</span>
                                <span className="text-7xl font-normal tracking-wide text-[#D4AF37] drop-shadow-[0_0_15px_rgba(212,175,55,0.6)] font-bebas">
                                    {isLoading ? '---' : ((toPrimary(data.netWorth.amount, 'BRL') / 1000000).toLocaleString(primaryMeta?.locale || 'en-GB', { minimumFractionDigits: 3, maximumFractionDigits: 3 }))}M
                                </span>
                            </div>

                            {/* Primary Variances */}
                            <div className={`flex flex-col items-center gap-2 ${isLoading ? 'invisible' : 'visible'}`}>
                                <div className="text-center">
                                    <div className={`text-base font-semibold font-space flex items-center gap-1.5 ${(diffPrevMonth?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                        <span className="text-xs uppercase tracking-widest text-[#F5F5DC]/40 mr-1 font-space font-medium">MoM:</span>
                                        {(diffPrevMonth?.amount || 0) >= 0 ? '+' : '-'} {primaryMeta?.symbol} {Math.abs(toPrimary(diffPrevMonth?.amount || 0, 'BRL')).toLocaleString(primaryMeta?.locale || 'en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        <span className="ml-1">({(diffPrevMonth?.percentage || 0) >= 0 ? '+' : ''}{(diffPrevMonth?.percentage || 0).toFixed(1)}%)</span>
                                        <span className="text-sm">{(diffPrevMonth?.amount || 0) >= 0 ? '▲' : '▼'}</span>
                                    </div>
                                </div>
                                {Math.abs(diffTarget?.amount || 0) > 1 && (
                                    <div className="text-center">
                                        <div className={`text-base font-semibold font-space flex items-center gap-1.5 ${(diffTarget?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                            <span className="text-xs uppercase tracking-widest text-[#F5F5DC]/40 mr-1 font-space font-medium">vs Target:</span>
                                            {(diffTarget?.amount || 0) >= 0 ? '+' : '-'} {primaryMeta?.symbol} {Math.abs(toPrimary(diffTarget?.amount || 0, 'BRL')).toLocaleString(primaryMeta?.locale || 'en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            <span className="ml-1">({(diffTarget?.percentage || 0) >= 0 ? '+' : ''}{(diffTarget?.percentage || 0).toFixed(1)}%)</span>
                                            <span className="text-sm">{(diffTarget?.amount || 0) >= 0 ? '▲' : '▼'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Top Contributors */}
                            {!isLoading && topContributors.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-white/5 w-full">
                                    <p className="text-[10px] uppercase tracking-[2px] text-[#F5F5DC]/40 mb-3 font-space text-center">Top Contributors (MoM)</p>
                                    <div className="flex justify-center gap-6">
                                        {topContributors.map(c => (
                                            <div key={c.id} className="flex flex-col items-center">
                                                <span className={`text-xs font-bold font-mono ${c.amount >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                                    {c.amount >= 0 ? '▲' : '▼'} {primaryMeta?.symbol}{Math.abs(toPrimary(c.amount, 'BRL') / 1000).toFixed(1)}k
                                                </span>
                                                <span className="text-[9px] uppercase tracking-wider text-[#F5F5DC]/30 font-space mt-1">{c.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Left Divider */}
                        <div className="hidden lg:block w-px h-[100px] bg-gradient-to-b from-transparent via-[#D4AF37]/20 to-transparent mx-2" />

                        {/* Center ROI Badge */}
                        <div className="flex flex-col items-center justify-center relative px-6 group cursor-default">
                            <div className={`absolute inset-0 rounded-full blur-xl opacity-20 transition-all duration-500 group-hover:opacity-40 group-hover:scale-110 ${currentROI.percentage >= 0 ? 'bg-vu-green' : 'bg-red-400'}`}></div>
                            <div className={`
                                    relative z-10 w-44 h-44 rounded-full flex flex-col items-center justify-center
                                    bg-gradient-to-br from-black/80 to-[#1A0F2E]/80 border shadow-inner transition-colors duration-500
                                    ${currentROI.percentage >= 0 ? 'border-vu-green/40 shadow-vu-green/20' : 'border-red-400/40 shadow-red-400/20'}
                                `}>
                                <div className="absolute top-4 flex items-center justify-center">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentROI.percentage >= 0 ? 'bg-vu-green' : 'bg-red-400'}`}></span>
                                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${currentROI.percentage >= 0 ? 'bg-vu-green' : 'bg-red-400'}`}></span>
                                    </span>
                                </div>
                                <div className="absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300 group-hover:opacity-0">
                                    <span className={`text-4xl mt-3 font-medium font-bebas tracking-wide drop-shadow-[0_0_8px_currentColor] ${currentROI.percentage >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                        {isLoading ? '---' : `${currentROI.percentage >= 0 ? '+' : ''}${currentROI.percentage.toFixed(1)}%`}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-widest text-[#F5F5DC]/50 font-space mt-1 text-center">
                                        All-Time<br />ROI
                                    </span>
                                </div>
                                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                    <span className={`text-4xl mt-3 font-medium font-bebas tracking-wide drop-shadow-[0_0_8px_currentColor] flex items-baseline gap-1 ${currentROI.percentage >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                        {isLoading ? '---' : (
                                            <>
                                                <span className="text-xl font-space opacity-70">R$</span>
                                                {currentROI.absolute >= 0 ? '+' : '-'}{currentROI.formattedAbsolute}
                                            </>
                                        )}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-widest text-[#F5F5DC]/50 font-space mt-1 text-center">
                                        Total<br />Return
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Right Divider */}
                        <div className="hidden lg:block w-px h-[100px] bg-gradient-to-b from-transparent via-[#D4AF37]/20 to-transparent mx-2" />

                        {/* Secondary Currency Section */}
                        <div className="text-center p-8 rounded-xl bg-black/40 shadow-inner border border-white/5 flex flex-col justify-center min-h-[220px] transition-all duration-300 hover:bg-black/60 hover:border-[#CC5500]/30 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(204,85,0,0.1)]">
                            <div className="flex items-baseline justify-center gap-3 mb-4">
                                <span className="text-2xl text-[#F5F5DC]/40 font-medium font-space">{secondaryMeta?.symbol}</span>
                                <span className="text-7xl font-normal tracking-wide text-[#CC5500] drop-shadow-[0_0_12px_rgba(204,85,0,0.5)] font-bebas">
                                    {isLoading ? '---' : ((toSecondary(data.netWorth.amount, 'BRL') / 1000).toLocaleString(secondaryMeta?.locale || 'en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 }))}k
                                </span>
                            </div>

                            {/* Secondary Variances */}
                            <div className={`flex flex-col items-center gap-2 ${isLoading ? 'invisible' : 'visible'}`}>
                                <div className="text-center">
                                    <div className={`text-base font-semibold font-space flex items-center gap-1.5 ${(diffPrevMonthGBP?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                        <span className="text-xs uppercase tracking-widest text-[#F5F5DC]/40 mr-1 font-space font-medium">MoM:</span>
                                        {(diffPrevMonthGBP?.amount || 0) >= 0 ? '+' : '-'} {secondaryMeta?.symbol}{Math.abs(diffPrevMonthGBP?.amount || 0).toLocaleString(secondaryMeta?.locale || 'en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        <span className="ml-1">({(diffPrevMonthGBP?.percentage || 0) >= 0 ? '+' : ''}{(diffPrevMonthGBP?.percentage || 0).toFixed(1)}%)</span>
                                        <span className="text-sm">{(diffPrevMonthGBP?.amount || 0) >= 0 ? '▲' : '▼'}</span>
                                    </div>
                                </div>
                                {Math.abs(diffTargetGBP?.amount || 0) > 1 && (
                                    <div className="text-center">
                                        <div className={`text-base font-semibold font-space flex items-center gap-1.5 ${(diffTargetGBP?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                            <span className="text-xs uppercase tracking-widest text-[#F5F5DC]/40 mr-1 font-space font-medium">vs Target:</span>
                                            {(diffTargetGBP?.amount || 0) >= 0 ? '+' : '-'} {secondaryMeta?.symbol}{Math.abs(diffTargetGBP?.amount || 0).toLocaleString(secondaryMeta?.locale || 'en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            <span className="ml-1">({(diffTargetGBP?.percentage || 0) >= 0 ? '+' : ''}{(diffTargetGBP?.percentage || 0).toFixed(1)}%)</span>
                                            <span className="text-sm">{(diffTargetGBP?.amount || 0) >= 0 ? '▲' : '▼'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Top Contributors (Secondary) */}
                            {!isLoading && topContributorsSecondary.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-white/5 w-full">
                                    <p className="text-[10px] uppercase tracking-[2px] text-[#F5F5DC]/40 mb-3 font-space text-center">Top Contributors (MoM)</p>
                                    <div className="flex justify-center gap-6">
                                        {topContributorsSecondary.map(c => (
                                            <div key={c.id} className="flex flex-col items-center">
                                                <span className={`text-xs font-bold font-mono ${c.amount >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                                    {c.amount >= 0 ? '▲' : '▼'} {secondaryMeta?.symbol}{Math.abs(c.amount).toLocaleString(secondaryMeta?.locale || 'en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                </span>
                                                <span className="text-[9px] uppercase tracking-wider text-[#F5F5DC]/30 font-space mt-1">{c.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {/* Dashboard Customizer Modal */}
            {
                isCustomizing && (
                    <DashboardCustomizer
                        initialConfig={dashboardConfig || { charts: [] }}
                        onClose={() => setIsCustomizing(false)}
                        onSave={(newConfig) => {
                            setDashboardConfig(newConfig);
                            setIsCustomizing(false);
                        }}
                    />
                )
            }

            {/* Dashboard Charts */}
            {
                dashboardConfig && dashboardConfig.charts && dashboardConfig.charts.length > 0 && (
                    <DashboardCharts
                        historicalData={historicalSnapshots || []}
                        currentMonthData={data} // Changed from dashboardData to data, assuming data is the prop
                        rates={rates}
                        monthlyInvestments={monthlyInvestments}
                        masterMixData={masterMixData}
                        allocationTargets={allocationTargets}
                        onCustomizeClick={() => setIsCustomizing(true)}
                        forecastSettings={forecastSettings}
                        dashboardConfig={dashboardConfig} // Added dashboardConfig prop
                    />
                )
            }

            {/* Sub-categories Grid */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 mb-12">
                {expandedSummaries.map((metric) => {
                    const contributors = categoryAssetDiffs?.[metric.id]
                        ? Object.entries(categoryAssetDiffs[metric.id])
                            .map(([name, diff]) => ({ name, amount: diff.amount, percentage: diff.percentage }))
                            .filter(c => Math.abs(c.amount) > 10)
                            .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
                            .slice(0, 3)
                        : [];

                    return (
                        <MetricCard
                            key={metric.id}
                            id={metric.navigateId || metric.id}
                            title={metric.title}
                            amount={toPrimary(metric.amount, 'BRL')}
                            currency={primaryCurrency}
                            primaryCurrency={primaryCurrency}
                            secondaryCurrency={secondaryCurrency}
                            rates={rates}
                            percentage={assetDiffs?.[metric.id]?.percentage || 0}
                            diffAmount={toPrimary(assetDiffs?.[metric.id]?.amount || 0, 'BRL')}
                            contributors={contributors}
                            invertColor={metric.id === 'debt'}
                            isLoading={isLoading}
                            onNavigate={onNavigate}
                        />
                    );
                })}
            </div>

            {/* Detailed Tables Section */}
            <div className="flex flex-col gap-8 mt-6">
                {data.categories.map((cat) => (
                    <ConsolidatedAssetTable
                        key={cat.id}
                        categoryId={cat.id}
                        title={cat.title}
                        assets={cat.assets}
                        rates={rates}
                        hideInvestment={cat.id === 'debt'}
                        onNavigate={onNavigate}
                    />
                ))}
            </div>
        </div >
    );
}
