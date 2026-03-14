import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MetricCard from './MetricCard';
import ConsolidatedAssetTable from './ConsolidatedAssetTable';
import DashboardCharts from './DashboardCharts';
import { calculateTWRHistory } from '@/lib/roiUtils';

import { usePortfolio } from '@/context/PortfolioContext';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import DashboardCustomizer from './DashboardCustomizer';
import TutorialOverlay from './ftue/TutorialOverlay';

export default function DashboardTab({
    data,
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
    isLoading,
    masterMixData,
    allocationTargets,
    onNavigate
}) {
    const { primaryCurrency, secondaryCurrency, toPrimary, toSecondary, formatPrimary, formatSecondary,
        forceRefreshMarketData, isRefreshingMarketData, lastUpdated,
        appSettings, handleUpdateAppSettings, dashboardConfig, setDashboardConfig, forecastSettings,
        ftueState
    } = usePortfolio();

    const formatPrimaryNoDecimals = useCallback((val) => formatPrimary(val, { minimumFractionDigits: 0, maximumFractionDigits: 0 }), [formatPrimary]);
    const formatSecondaryNoDecimals = useCallback((val) => formatSecondary(val, { minimumFractionDigits: 0, maximumFractionDigits: 0 }), [formatSecondary]);

    const [isCustomizing, setIsCustomizing] = useState(false);
    const [heroExpanded, setHeroExpanded] = useState(false);
    const primaryMeta = SUPPORTED_CURRENCIES[primaryCurrency];
    const secondaryMeta = SUPPORTED_CURRENCIES[secondaryCurrency];

    // Tick every 30s so the "X min ago" label stays live
    const [tick, setTick] = useState(0);
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
    }, [lastUpdated, tick]);

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
            formattedAbsolute = `${(absVal / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}M`;
        } else {
            formattedAbsolute = `${(absVal / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}k`;
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
        return [...data.summaries].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    }, [data.summaries]);

    return (
        <div className="pb-10">
            {/* ═════════════════════════════════════════════ */}
            {/* MOBILE HERO SECTION (Cleaner, Native-like app)  */}
            {/* ═════════════════════════════════════════════ */}
            <div className="md:hidden flex flex-col items-center justify-center pt-2 pb-8 px-4 mb-4 relative">
                {/* Subtle Refresh Indicator */}
                <div className="absolute top-0 right-2 flex items-center gap-2">
                    {lastUpdatedLabel && (
                        <span className="text-[9px] text-[#F5F5DC]/30 font-space tracking-widest uppercase">
                            {lastUpdatedLabel}
                        </span>
                    )}
                    <button
                        onClick={forceRefreshMarketData}
                        disabled={isRefreshingMarketData}
                        className="p-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] active:scale-95 transition-all duration-300 disabled:opacity-40"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-[#D4AF37]/60 ${isRefreshingMarketData ? 'animate-spin' : ''}`}>
                            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                            <path d="M21 3v5h-5" />
                        </svg>
                    </button>
                </div>

                <span className="text-[9px] text-[#F5F5DC]/40 uppercase tracking-[4px] font-space mb-3 text-center w-full block">Total Balance</span>

                {/* Main Balance BRL + ROI Badge */}
                <div className="flex items-start justify-center gap-6 mb-1 relative">
                    <div className="flex items-start gap-1">
                        <span className="text-xl text-[#F5F5DC]/60 font-medium font-space mt-1.5">{primaryMeta?.symbol}</span>
                        <span className="text-[3.5rem] leading-[1] font-normal tracking-wide text-[#D4AF37] drop-shadow-[0_0_12px_rgba(212,175,55,0.4)] font-bebas">
                            {isLoading ? '---' : ((toPrimary(data.netWorth.amount, 'BRL') / 1000000).toLocaleString(primaryMeta?.locale || 'en-GB', { minimumFractionDigits: 3, maximumFractionDigits: 3 }))}M
                        </span>
                    </div>

                    {/* Circular ROI Badge (Matching Desktop Style) */}
                    <motion.div
                        whileTap={{ scale: 0.9 }}
                        className={`mt-0.5 relative group cursor-pointer w-16 h-16 shrink-0`}
                    >
                        <div className={`absolute inset-0 rounded-full blur-md opacity-30 ${currentROI.percentage >= 0 ? 'bg-vu-green' : 'bg-red-400'}`}></div>
                        <div className={`
                            relative z-10 w-full h-full rounded-full flex flex-col items-center justify-center
                            bg-gradient-to-br from-black/80 to-[#1A0F2E]/80 border shadow-inner transition-colors duration-500
                            ${currentROI.percentage >= 0 ? 'border-vu-green/40 shadow-vu-green/20' : 'border-red-400/40 shadow-red-400/20'}
                        `}>
                            <span className="text-[9px] uppercase tracking-widest text-[#F5F5DC]/50 font-space mt-px">ROI</span>
                            <span className={`text-[13px] font-bold font-space leading-tight ${currentROI.percentage >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                {currentROI.percentage >= 0 ? '+' : ''}{currentROI.percentage.toFixed(1)}%
                            </span>
                        </div>
                    </motion.div>
                </div>

                {/* Secondary Balance GBP */}
                <span className="text-[13px] text-[#CC5500]/70 font-space mb-6 tracking-wide text-center block">
                    ≈ {secondaryMeta?.symbol}{(toSecondary(data.netWorth.amount, 'BRL') / 1000).toLocaleString(secondaryMeta?.locale || 'en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k
                </span>

                {/* Metric Pills (MoM and Target) */}
                <div className={`flex flex-wrap justify-center gap-3 transition-opacity duration-300 ${isLoading ? 'opacity-30' : 'opacity-100'}`}>
                    {/* MoM Pill */}
                    <div className={`
                        px-2 py-1 rounded-xl font-medium text-[10px] flex items-center gap-1.5 leading-none shadow-sm border
                        ${(diffPrevMonth?.amount || 0) >= 0
                            ? 'text-vu-green bg-vu-green/[0.08] border-vu-green/20'
                            : 'text-red-400 bg-red-400/[0.08] border-red-400/20'
                        }
                    `}>
                        <span className="text-[9px] uppercase font-space tracking-widest opacity-70 hidden min-[400px]:block mt-0.5">MoM</span>
                        <span className="font-mono tracking-tight opacity-90 text-[11px]">
                            {(diffPrevMonth?.amount || 0) >= 0 ? '+' : ''}{formatPrimaryNoDecimals(toPrimary(diffPrevMonth?.amount || 0, 'BRL'))}
                        </span>
                        <div className="w-px h-3 bg-current opacity-30"></div>
                        <span className="flex items-center gap-0.5 font-space">
                            {Math.abs(diffPrevMonth?.percentage || 0).toFixed(1)}%
                            <span className="text-[7px] opacity-70 mb-[1px]">{(diffPrevMonth?.amount || 0) >= 0 ? '▲' : '▼'}</span>
                        </span>
                    </div>

                    {/* vs Target Pill */}
                    {Math.abs(diffTarget?.amount || 0) > 1 && (
                        <div className={`
                            px-2 py-1 rounded-xl font-medium text-[10px] flex items-center gap-1.5 leading-none shadow-sm border
                            ${(diffTarget?.amount || 0) >= 0
                                ? 'text-vu-green bg-vu-green/[0.08] border-vu-green/20'
                                : 'text-red-400 bg-red-400/[0.08] border-red-400/20'
                            }
                        `}>
                            <span className="text-[9px] uppercase font-space tracking-widest opacity-70 hidden min-[400px]:block mt-0.5">Target</span>
                            <span className="font-mono tracking-tight opacity-90 text-[11px]">
                                {(diffTarget?.amount || 0) >= 0 ? '+' : ''}{formatPrimaryNoDecimals(toPrimary(diffTarget?.amount || 0, 'BRL'))}
                            </span>
                            <div className="w-px h-3 bg-current opacity-30"></div>
                            <span className="flex items-center gap-0.5 font-space">
                                {Math.abs(diffTarget?.percentage || 0).toFixed(1)}%
                                <span className="text-[7px] opacity-70 mb-[1px]">{(diffTarget?.amount || 0) >= 0 ? '▲' : '▼'}</span>
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* ═════════════════════════════════════════════ */}
            {/* DESKTOP HERO & SIDEBAR SECTION (Apple TV+)    */}
            {/* ═════════════════════════════════════════════ */}
            <div className="hidden md:block mb-8">
                <div className="lg:grid lg:grid-cols-12 lg:gap-5">
                    {/* ═══ Hero Card (col-span-8) — Frosted Glass ═══ */}
                    <div id="ftue-hero" className="col-span-12 lg:col-span-8 rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] mb-8 lg:mb-0 relative overflow-hidden flex flex-col">

                        {/* Subtle shimmer */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.015] to-transparent -translate-x-full pointer-events-none"
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        />

                        {/* ── Refresh Row (top-right, minimal) ── */}
                        <div className="absolute top-4 right-5 z-20 flex items-center gap-3">
                            {lastUpdatedLabel && (
                                <span className="text-[10px] text-[#F5F5DC]/20 font-space tracking-wider uppercase">
                                    {lastUpdatedLabel}
                                </span>
                            )}
                            <button
                                onClick={forceRefreshMarketData}
                                disabled={isRefreshingMarketData}
                                className="group flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-[#D4AF37]/20 active:scale-95 transition-all duration-300 disabled:opacity-40"
                                title="Refresh live prices"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-[#F5F5DC]/30 group-hover:text-[#D4AF37]/70 transition-colors ${isRefreshingMarketData ? 'animate-spin' : ''}`}>
                                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                                    <path d="M21 3v5h-5" />
                                </svg>
                                <span className="text-[10px] text-[#F5F5DC]/25 group-hover:text-[#D4AF37]/60 font-space tracking-wider uppercase transition-colors">
                                    {isRefreshingMarketData ? '...' : 'Refresh'}
                                </span>
                            </button>
                        </div>

                        {/* ── Main Balance Area (centered) ── */}
                        <div className="flex flex-col items-center justify-center pt-10 pb-6 xl:pt-14 xl:pb-8 px-6 relative z-10">
                            <span className="text-[11px] xl:text-xs text-[#F5F5DC]/30 uppercase tracking-[4px] font-space mb-3">Total Balance</span>

                            <div className={`flex items-start justify-center gap-1 transition-opacity duration-300 ${isLoading ? 'opacity-30' : 'opacity-100'}`}>
                                <span className="text-2xl xl:text-3xl text-[#F5F5DC]/50 font-medium font-space mt-2 xl:mt-3">{primaryMeta?.symbol}</span>
                                <span className="text-7xl xl:text-8xl 2xl:text-[7.5rem] leading-none font-normal tracking-wide text-[#D4AF37] drop-shadow-[0_0_20px_rgba(212,175,55,0.35)] font-bebas">
                                    {isLoading ? '---' : ((toPrimary(data.netWorth.amount, 'BRL') / 1000000).toLocaleString(primaryMeta?.locale || 'en-GB', { minimumFractionDigits: 3, maximumFractionDigits: 3 }))}M
                                </span>
                            </div>

                            <span className={`text-base xl:text-lg text-[#CC5500]/70 font-space mt-1 tracking-wide transition-opacity duration-300 ${isLoading ? 'opacity-20' : 'opacity-100'}`}>
                                ≈ {secondaryMeta?.symbol}{(toSecondary(data.netWorth.amount, 'BRL') / 1000).toLocaleString(secondaryMeta?.locale || 'en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k
                            </span>
                        </div>

                        {/* ── Gold Gradient Divider ── */}
                        <div className="w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37]/25 to-transparent" />

                        {/* ── Stat Strip (4 columns) ── */}
                        {!isLoading && (
                            <div className="grid grid-cols-4 relative z-10">
                                {/* ROI */}
                                <div className="flex flex-col items-center py-4 xl:py-5 border-r border-white/[0.04]">
                                    <span className="text-xs xl:text-sm text-[#F5F5DC]/30 uppercase tracking-[2px] font-space mb-1.5">ROI</span>
                                    <span className={`text-xl xl:text-2xl font-bold font-space ${currentROI.percentage >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                        {currentROI.percentage >= 0 ? '+' : ''}{currentROI.percentage.toFixed(1)}%
                                    </span>
                                    <span className={`text-xs xl:text-sm font-mono mt-0.5 opacity-60 ${currentROI.percentage >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                        {currentROI.absolute >= 0 ? '+' : '-'}{currentROI.formattedAbsolute}
                                    </span>
                                </div>
                                {/* MoM */}
                                <div className="flex flex-col items-center py-4 xl:py-5 border-r border-white/[0.04]">
                                    <span className="text-xs xl:text-sm text-[#F5F5DC]/30 uppercase tracking-[2px] font-space mb-1.5">MoM</span>
                                    <span className={`text-xl xl:text-2xl font-bold font-space ${(diffPrevMonth?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                        {(diffPrevMonth?.amount || 0) >= 0 ? '+' : ''}{Math.abs(diffPrevMonth?.percentage || 0).toFixed(1)}%
                                    </span>
                                    <span className={`text-xs xl:text-sm font-mono mt-0.5 opacity-60 ${(diffPrevMonth?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                        {(diffPrevMonth?.amount || 0) >= 0 ? '+' : ''}{formatPrimaryNoDecimals(toPrimary(diffPrevMonth?.amount || 0, 'BRL'))}
                                    </span>
                                </div>
                                {/* vs Target */}
                                <div className="flex flex-col items-center py-4 xl:py-5 border-r border-white/[0.04]">
                                    <span className="text-xs xl:text-sm text-[#F5F5DC]/30 uppercase tracking-[2px] font-space mb-1.5">vs Target</span>
                                    <span className={`text-xl xl:text-2xl font-bold font-space ${(diffTarget?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                        {(diffTarget?.amount || 0) >= 0 ? '+' : ''}{Math.abs(diffTarget?.percentage || 0).toFixed(1)}%
                                    </span>
                                    <span className={`text-xs xl:text-sm font-mono mt-0.5 opacity-60 ${(diffTarget?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                        {(diffTarget?.amount || 0) >= 0 ? '+' : ''}{formatPrimaryNoDecimals(toPrimary(diffTarget?.amount || 0, 'BRL'))}
                                    </span>
                                </div>
                                {/* FX Impact */}
                                <div className="flex flex-col items-center py-4 xl:py-5">
                                    <span className="text-xs xl:text-sm text-[#F5F5DC]/30 uppercase tracking-[2px] font-space mb-1.5">FX Impact</span>
                                    <span className={`text-xl xl:text-2xl font-bold font-space ${(fxEffectBRL?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                        {(fxEffectBRL?.amount || 0) >= 0 ? '+' : ''}{Math.abs(fxEffectBRL?.percentage || 0).toFixed(1)}%
                                    </span>
                                    <span className={`text-xs xl:text-sm font-mono mt-0.5 opacity-60 ${(fxEffectBRL?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                        {(fxEffectBRL?.amount || 0) >= 0 ? '+' : ''}{formatPrimaryNoDecimals(toPrimary(fxEffectBRL?.amount || 0, 'BRL'))}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* ── Expand Chevron ── */}
                        <button
                            onClick={() => setHeroExpanded(prev => !prev)}
                            className="w-full flex items-center justify-center py-2 hover:bg-white/[0.02] transition-colors relative z-10 border-t border-white/[0.04]"
                        >
                            <motion.div animate={{ rotate: heroExpanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#F5F5DC]/20">
                                    <path d="m6 9 6 6 6-6"/>
                                </svg>
                            </motion.div>
                        </button>

                        {/* ── Expandable Drawer (Tier 2) ── */}
                        <AnimatePresence>
                            {heroExpanded && !isLoading && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                                    className="overflow-hidden relative z-10"
                                >
                                    <div className="px-6 xl:px-8 pb-8 pt-4 border-t border-white/[0.04]">
                                        <div className="grid grid-cols-2 gap-8">
                                            {/* ─ Primary Currency Details ─ */}
                                            <div className="flex flex-col gap-4">
                                                <span className="text-xs text-[#D4AF37]/50 uppercase tracking-[2px] font-space">{primaryCurrency} Details</span>

                                                {/* MoM Variance */}
                                                <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3">
                                                    <span className="text-[11px] uppercase font-space tracking-[1.5px] text-[#F5F5DC]/40">MoM</span>
                                                    <div className={`flex items-center gap-2 ${(diffPrevMonth?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                                        <span className="font-mono text-[13px] xl:text-sm font-medium">
                                                            {(diffPrevMonth?.amount || 0) >= 0 ? '+' : ''}{formatPrimaryNoDecimals(toPrimary(diffPrevMonth?.amount || 0, 'BRL'))}
                                                        </span>
                                                        <span className="text-[11px] font-space opacity-70">{Math.abs(diffPrevMonth?.percentage || 0).toFixed(1)}%</span>
                                                    </div>
                                                </div>

                                                {/* FX Attribution */}
                                                {(Math.abs(fxEffectBRL?.percentage || 0) > 0.05 || Math.abs(assetEffectBRL?.percentage || 0) > 0.05) && (
                                                    <div className="flex flex-col gap-1.5 pl-4 border-l-2 border-white/[0.06] ml-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-space text-[#F5F5DC]/40 flex items-center gap-1.5"><span className="text-[9px]">↳</span> Asset Prices</span>
                                                            <div className={`flex items-center gap-1.5 ${(assetEffectBRL?.amount || 0) >= 0 ? 'text-vu-green/80' : 'text-red-400/80'}`}>
                                                                <span className="font-mono text-[11px]">{(assetEffectBRL?.amount || 0) >= 0 ? '+' : ''}{formatPrimaryNoDecimals(toPrimary(assetEffectBRL?.amount || 0, 'BRL'))}</span>
                                                                <span className="font-space text-[10px] opacity-70">{Math.abs(assetEffectBRL?.percentage || 0).toFixed(1)}%</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-space text-[#F5F5DC]/40 flex items-center gap-1.5"><span className="text-[9px]">↳</span> FX Effect</span>
                                                            <div className={`flex items-center gap-1.5 ${(fxEffectBRL?.amount || 0) >= 0 ? 'text-vu-green/80' : 'text-red-400/80'}`}>
                                                                <span className="font-mono text-[11px]">{(fxEffectBRL?.amount || 0) >= 0 ? '+' : ''}{formatPrimaryNoDecimals(toPrimary(fxEffectBRL?.amount || 0, 'BRL'))}</span>
                                                                <span className="font-space text-[10px] opacity-70">{Math.abs(fxEffectBRL?.percentage || 0).toFixed(1)}%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Target Variance */}
                                                {Math.abs(diffTarget?.amount || 0) > 1 && (
                                                    <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3">
                                                        <span className="text-[11px] uppercase font-space tracking-[1.5px] text-[#F5F5DC]/40">Target</span>
                                                        <div className={`flex items-center gap-2 ${(diffTarget?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                                            <span className="font-mono text-[13px] xl:text-sm font-medium">{(diffTarget?.amount || 0) >= 0 ? '+' : ''}{formatPrimaryNoDecimals(toPrimary(diffTarget?.amount || 0, 'BRL'))}</span>
                                                            <span className="text-[11px] font-space opacity-70">{Math.abs(diffTarget?.percentage || 0).toFixed(1)}%</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Top Contributors Primary */}
                                                {topContributors.length > 0 && (
                                                    <div className="flex flex-col gap-2 mt-2">
                                                        <span className="text-[10px] text-[#F5F5DC]/30 uppercase tracking-[1.5px] font-space">Top Contributors</span>
                                                        {topContributors.map(c => (
                                                            <div key={`drawer-pri-${c.id}`} className="flex justify-between items-center text-[11px]">
                                                                <span className="text-[#F5F5DC]/60 font-space truncate max-w-[180px]">{c.name}</span>
                                                                <span className={`font-mono ${c.amount >= 0 ? 'text-vu-green/90' : 'text-red-400/90'}`}>
                                                                    {c.amount >= 0 ? '+' : '-'}{formatPrimaryNoDecimals(Math.abs(c.amount))}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* ─ Secondary Currency Details ─ */}
                                            <div className="flex flex-col gap-4">
                                                <span className="text-xs text-[#CC5500]/70 uppercase tracking-[2px] font-space">{secondaryCurrency} Details</span>


                                                {/* MoM */}
                                                <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3">
                                                    <span className="text-[11px] uppercase font-space tracking-[1.5px] text-[#F5F5DC]/40">MoM</span>
                                                    <div className={`flex items-center gap-2 ${(diffPrevMonthGBP?.amount || 0) >= 0 ? 'text-[#CC5500]' : 'text-red-400'}`}>
                                                        <span className="font-mono text-[13px] xl:text-sm font-medium">{(diffPrevMonthGBP?.amount || 0) >= 0 ? '+' : '-'}{formatSecondaryNoDecimals(Math.abs(diffPrevMonthGBP?.amount || 0))}</span>
                                                        <span className="text-[11px] font-space opacity-70">{Math.abs(diffPrevMonthGBP?.percentage || 0).toFixed(1)}%</span>
                                                    </div>
                                                </div>

                                                {/* FX Attribution GBP */}
                                                {(Math.abs(fxEffectGBP?.percentage || 0) > 0.05 || Math.abs(assetEffectGBP?.percentage || 0) > 0.05) && (
                                                    <div className="flex flex-col gap-1.5 pl-4 border-l-2 border-white/[0.06] ml-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-space text-[#F5F5DC]/40 flex items-center gap-1.5"><span className="text-[9px]">↳</span> Asset Prices</span>
                                                            <div className={`flex items-center gap-1.5 ${(assetEffectGBP?.amount || 0) >= 0 ? 'text-[#CC5500]/80' : 'text-red-400/80'}`}>
                                                                <span className="font-mono text-[11px]">{(assetEffectGBP?.amount || 0) >= 0 ? '+' : '-'}{formatSecondaryNoDecimals(Math.abs(assetEffectGBP?.amount || 0))}</span>
                                                                <span className="font-space text-[10px] opacity-70">{Math.abs(assetEffectGBP?.percentage || 0).toFixed(1)}%</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-space text-[#F5F5DC]/40 flex items-center gap-1.5"><span className="text-[9px]">↳</span> FX Effect</span>
                                                            <div className={`flex items-center gap-1.5 ${(fxEffectGBP?.amount || 0) >= 0 ? 'text-[#CC5500]/80' : 'text-red-400/80'}`}>
                                                                <span className="font-mono text-[11px]">{(fxEffectGBP?.amount || 0) >= 0 ? '+' : '-'}{formatSecondaryNoDecimals(Math.abs(fxEffectGBP?.amount || 0))}</span>
                                                                <span className="font-space text-[10px] opacity-70">{Math.abs(fxEffectGBP?.percentage || 0).toFixed(1)}%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Target GBP */}
                                                {Math.abs(diffTargetGBP?.amount || 0) > 1 && (
                                                    <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3">
                                                        <span className="text-[11px] uppercase font-space tracking-[1.5px] text-[#F5F5DC]/40">Target</span>
                                                        <div className={`flex items-center gap-2 ${(diffTargetGBP?.amount || 0) >= 0 ? 'text-[#CC5500]' : 'text-red-400'}`}>
                                                            <span className="font-mono text-[13px] xl:text-sm font-medium">{(diffTargetGBP?.amount || 0) >= 0 ? '+' : '-'}{formatSecondaryNoDecimals(Math.abs(diffTargetGBP?.amount || 0))}</span>
                                                            <span className="text-[11px] font-space opacity-70">{Math.abs(diffTargetGBP?.percentage || 0).toFixed(1)}%</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Top Contributors Secondary */}
                                                {topContributorsSecondary.length > 0 && (
                                                    <div className="flex flex-col gap-2 mt-2">
                                                        <span className="text-[10px] text-[#F5F5DC]/30 uppercase tracking-[1.5px] font-space">Top Contributors</span>
                                                        {topContributorsSecondary.map(c => (
                                                            <div key={`drawer-sec-${c.id}`} className="flex justify-between items-center text-[11px]">
                                                                <span className="text-[#F5F5DC]/60 font-space truncate max-w-[180px]">{c.name}</span>
                                                                <span className={`font-mono ${c.amount >= 0 ? 'text-[#CC5500]/90' : 'text-red-400/90'}`}>
                                                                    {c.amount >= 0 ? '+' : '-'}{formatSecondaryNoDecimals(Math.abs(c.amount))}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* ═══ Asset Sidebar (col-span-4) — Slim Glass Bars ═══ */}
                    <div id="ftue-sidebar" className="col-span-4 hidden lg:flex flex-col gap-1.5 h-full">
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
                                    compact={true}
                                    className="flex-1 rounded-xl bg-[#121418]/60 backdrop-blur-xl border-white/[0.06] shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-all duration-300"
                                />
                            );
                        })}
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
                dashboardConfig && dashboardConfig.charts && dashboardConfig.charts.length > 0 && (<div id="ftue-charts">
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
                        onNavigate={onNavigate}
                    />
                </div>)
            }

            {/* Sub-categories Grid (Mobile & Tablet) */}
            <div className="grid lg:hidden grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3 md:gap-6 mb-8 md:mb-12">
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
            <div id="ftue-tables" className="grid lg:grid-cols-2 gap-5 mt-4">
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
            {/* Tutorial Overlay */}
            {ftueState?.isTutorialActive && <TutorialOverlay />}
        </div >
    );
}
