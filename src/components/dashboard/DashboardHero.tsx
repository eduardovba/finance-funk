import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { usePortfolio } from '@/context/PortfolioContext';
import { getJargon, type ExperienceLevel } from '@/lib/personalization';

interface DashboardHeroProps {
    data: any;
    historicalSnapshots?: any[];
    isLoading: boolean;
    primaryMeta: any;
    secondaryMeta: any;
    primaryCurrency: string;
    secondaryCurrency: string;
    toPrimary: (val: number, cur: string) => number;
    toSecondary: (val: number, cur: string) => number;
    formatPrimaryNoDecimals: (val: number) => string;
    formatSecondaryNoDecimals: (val: number) => string;
    currentROI: { percentage: number; absolute: number; formattedAbsolute: string };
    diffPrevMonth: any;
    diffPrevMonthGBP: any;
    diffTarget: any;
    diffTargetGBP: any;
    fxEffectBRL: any;
    assetEffectBRL: any;
    fxEffectGBP: any;
    assetEffectGBP: any;
    topContributors: any[];
    topContributorsSecondary: any[];
    heroExpanded: boolean;
    setHeroExpanded: (fn: (prev: boolean) => boolean) => void;
    lastUpdatedLabel: string | null;
    forceRefreshMarketData: () => void;
    isRefreshingMarketData: boolean;
    sidebar?: React.ReactNode;
}

export default function DashboardHero(props: DashboardHeroProps) {
    const { ftueState, singleCurrencyMode } = usePortfolio() as any;
    const experience = (ftueState?.onboardingExperience || 'beginner') as ExperienceLevel;
    const {
        data, historicalSnapshots, isLoading, primaryMeta, secondaryMeta, primaryCurrency, secondaryCurrency,
        toPrimary, toSecondary, formatPrimaryNoDecimals, formatSecondaryNoDecimals,
        currentROI, diffPrevMonth, diffPrevMonthGBP, diffTarget, diffTargetGBP,
        fxEffectBRL, assetEffectBRL, fxEffectGBP, assetEffectGBP,
        topContributors, topContributorsSecondary,
        heroExpanded, setHeroExpanded, lastUpdatedLabel, forceRefreshMarketData, isRefreshingMarketData,
        sidebar
    } = props;

    const sparklinePath = React.useMemo(() => {
        if (!historicalSnapshots || historicalSnapshots.length < 2) {
            return "M0,250 C150,220 250,120 400,160 C550,200 650,80 800,120 C900,140 1000,90 1000,90";
        }
        
        const sorted = [...historicalSnapshots].sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
        const values = sorted.map(s => s.networthBRL || s.totalminuspensionsBRL || 0);
        values.push(data?.netWorth?.amount || 0);

        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;
        
        const height = 230;
        const width = 1000;
        
        const points = values.map((val, i) => {
            const x = (i / (values.length - 1)) * width;
            const y = 280 - ((val - min) / range) * height;
            return { x, y };
        });

        let path = `M${points[0].x},${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const xMid = p1.x + (p2.x - p1.x) / 2;
            path += ` C${xMid},${p1.y} ${xMid},${p2.y} ${p2.x},${p2.y}`;
        }
        return path;
    }, [historicalSnapshots, data]);

    const sparklineFill = `${sparklinePath} L1000,300 L0,300 Z`;

    const RefreshButton = ({ size = 14, showLabel = false }: { size?: number; showLabel?: boolean }) => (
        <button
            onClick={forceRefreshMarketData}
            disabled={isRefreshingMarketData}
            className={`${showLabel ? 'group flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-[#D4AF37]/20' : 'p-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08]'} active:scale-95 transition-all duration-300 disabled:opacity-40`}
            title="Refresh live prices"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${showLabel ? 'text-[#F5F5DC]/30 group-hover:text-[#D4AF37]/70' : 'text-[#D4AF37]/60'} transition-colors ${isRefreshingMarketData ? 'animate-spin' : ''}`}>
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
            </svg>
            {showLabel && (
                <span className="text-xs text-[#F5F5DC]/25 group-hover:text-[#D4AF37]/60 font-space tracking-wider uppercase transition-colors">
                    {isRefreshingMarketData ? '...' : 'Refresh'}
                </span>
            )}
        </button>
    );

    return (
        <>
        {/* MOBILE HERO */}
        <div className="md:hidden flex flex-col items-center justify-center pt-2 pb-8 px-4 mb-4 relative overflow-hidden rounded-2xl bg-[#121418]/30 shadow-inner">
            <div className="absolute inset-x-0 bottom-0 h-40 z-0 pointer-events-none opacity-40 mix-blend-screen px-2">
                <svg viewBox="0 0 1000 300" preserveAspectRatio="none" className="w-full h-full text-[#D4AF37]" style={{overflow: 'visible'}}>
                    <defs>
                        <linearGradient id="chart-mobile" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                        </linearGradient>
                        <filter id="glow-mobile">
                            <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>
                    <path d={sparklineFill} fill="url(#chart-mobile)" />
                    <path d={sparklinePath} fill="none" stroke="currentColor" strokeWidth="4" filter="url(#glow-mobile)" />
                </svg>
            </div>

            <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
                {lastUpdatedLabel && (
                    <span className="text-2xs text-[#F5F5DC]/30 font-space tracking-widest uppercase">{lastUpdatedLabel}</span>
                )}
                <RefreshButton />
            </div>

            <span className="text-2xs text-[#F5F5DC]/40 uppercase tracking-[4px] font-space mb-3 text-center w-full block">Net Worth</span>

            <div className="flex items-start justify-center gap-6 mb-1 relative">
                <div className="flex items-start gap-1">
                    <span className="text-xl text-[#F5F5DC]/60 font-medium font-space mt-1.5">{primaryMeta?.symbol}</span>
                    <span className="text-[3.5rem] leading-[1] font-normal tracking-wide text-[#D4AF37] drop-shadow-[0_0_12px_rgba(212,175,55,0.4)] font-bebas">
                        {isLoading ? '---' : <><AnimatedNumber value={toPrimary(data.netWorth.amount, 'BRL') / 1000000} formatter={(v) => v.toLocaleString(primaryMeta?.locale || 'en-GB', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} />M</>}
                    </span>
                </div>

                <motion.div whileTap={{ scale: 0.9 }} className="mt-0.5 relative group cursor-pointer w-16 h-16 shrink-0">
                    <div className={`absolute inset-0 rounded-full blur-md opacity-30 ${currentROI.percentage >= 0 ? 'bg-vu-green' : 'bg-red-400'}`} />
                    <div className={`relative z-10 w-full h-full rounded-full flex flex-col items-center justify-center bg-gradient-to-br from-black/80 to-[#1A0F2E]/80 border shadow-inner transition-colors duration-500 ${currentROI.percentage >= 0 ? 'border-vu-green/40 shadow-vu-green/20' : 'border-red-400/40 shadow-red-400/20'}`}>
                        <span className="text-2xs uppercase tracking-widest text-[#F5F5DC]/50 font-space mt-px">{getJargon('roi', experience)}</span>
                        <span className={`text-sm font-bold font-space leading-tight ${currentROI.percentage >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                            {currentROI.percentage >= 0 ? '+' : ''}{currentROI.percentage.toFixed(1)}%
                        </span>
                    </div>
                </motion.div>
            </div>

            {!singleCurrencyMode && (
                <span className="text-sm text-[#CC5500]/70 font-space mb-6 tracking-wide text-center block">
                    ≈ {secondaryMeta?.symbol}<AnimatedNumber value={toSecondary(data.netWorth.amount, 'BRL') / 1000} formatter={(v) => v.toLocaleString(secondaryMeta?.locale || 'en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} />k
                </span>
            )}
            {singleCurrencyMode && <div className="h-4" />}

            <div className={`flex flex-wrap justify-center gap-3 relative z-10 transition-opacity duration-300 ${isLoading ? 'opacity-30' : 'opacity-100'}`}>
                {/* MoM Pill */}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md bg-white/[0.03] border shadow-[0_4px_12px_rgba(0,0,0,0.2)] ${(diffPrevMonth?.amount || 0) >= 0 ? 'border-vu-green/20 shadow-vu-green/[0.05]' : 'border-red-400/20 shadow-red-400/[0.05]'}`}>
                    <div className={`flex items-center justify-center w-5 h-5 rounded-full bg-black/40 ${(diffPrevMonth?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-2xs uppercase font-space tracking-widest opacity-60 hidden min-[400px]:block">{getJargon('monthlyChange', experience)}</span>
                        <span className={`text-xs font-bold font-space leading-none ${(diffPrevMonth?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                            {(diffPrevMonth?.amount || 0) >= 0 ? '+' : ''}{formatPrimaryNoDecimals(toPrimary(diffPrevMonth?.amount || 0, 'BRL'))}
                        </span>
                    </div>
                </div>

                {/* vs Target Pill */}
                {Math.abs(diffTarget?.amount || 0) > 1 && (
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md bg-white/[0.03] border shadow-[0_4px_12px_rgba(0,0,0,0.2)] ${(diffTarget?.amount || 0) >= 0 ? 'border-vu-green/20 shadow-vu-green/[0.05]' : 'border-red-400/20 shadow-red-400/[0.05]'}`}>
                        <div className={`flex items-center justify-center w-5 h-5 rounded-full bg-black/40 ${(diffTarget?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xs uppercase font-space tracking-widest opacity-60 hidden min-[400px]:block">Target</span>
                            <span className={`text-xs font-bold font-space leading-none ${(diffTarget?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                {(diffTarget?.amount || 0) >= 0 ? '+' : ''}{formatPrimaryNoDecimals(toPrimary(diffTarget?.amount || 0, 'BRL'))}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* DESKTOP HERO */}
        <div className="hidden md:block mb-8">
            <div className="lg:grid lg:grid-cols-12 lg:gap-5 lg:items-stretch">
                {/* Hero Card */}
                <div id="ftue-hero" className="col-span-12 lg:col-span-8 rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] mb-8 lg:mb-0 relative overflow-hidden flex flex-col">
                    <motion.div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/[0.015] to-transparent -translate-x-full pointer-events-none" animate={{ x: ['-100%', '200%'] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} />

                    {/* Glow Area Chart Background - Absolute to Top */}
                    <div className="absolute top-0 inset-x-0 h-[320px] z-0 pointer-events-none opacity-40 mix-blend-screen origin-top scale-y-110">
                        <svg viewBox="0 0 1000 300" preserveAspectRatio="none" className="w-full h-full text-[#D4AF37] translate-y-6" style={{overflow: 'visible'}}>
                            <defs>
                                <linearGradient id="chart-desktop" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                                </linearGradient>
                                <filter id="glow-desktop">
                                    <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
                                    <feMerge>
                                        <feMergeNode in="coloredBlur"/>
                                        <feMergeNode in="SourceGraphic"/>
                                    </feMerge>
                                </filter>
                            </defs>
                            <path d={sparklineFill} fill="url(#chart-desktop)" />
                            <path d={sparklinePath} fill="none" stroke="currentColor" strokeWidth="4" filter="url(#glow-desktop)" />
                        </svg>
                    </div>

                    {/* Refresh Row */}
                    <div className="absolute top-4 right-5 z-20 flex items-center gap-3">
                        {lastUpdatedLabel && (
                            <span className="text-xs text-[#F5F5DC]/20 font-space tracking-wider uppercase">{lastUpdatedLabel}</span>
                        )}
                        <RefreshButton size={12} showLabel />
                    </div>

                    {/* Main Balance */}
                    <div className="flex flex-col items-center justify-center pt-6 pb-3 xl:pt-8 xl:pb-4 px-6 relative z-10">
                        <span className="text-xs xl:text-xs text-[#F5F5DC]/30 uppercase tracking-[4px] font-space mb-2">Net Worth</span>
                        <div className={`flex items-start justify-center gap-1 transition-opacity duration-300 ${isLoading ? 'opacity-30' : 'opacity-100'}`}>
                            <span className="text-2xl xl:text-3xl text-[#F5F5DC]/50 font-medium font-space mt-2 xl:mt-3">{primaryMeta?.symbol}</span>
                            <span className="text-7xl xl:text-8xl 2xl:text-[7.5rem] leading-none font-normal tracking-wide text-[#D4AF37] drop-shadow-[0_0_20px_rgba(212,175,55,0.35)] font-bebas">
                                {isLoading ? '---' : <><AnimatedNumber value={toPrimary(data.netWorth.amount, 'BRL') / 1000000} formatter={(v) => v.toLocaleString(primaryMeta?.locale || 'en-GB', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} />M</>}
                            </span>
                        </div>
                        {!singleCurrencyMode && (
                            <span className={`text-base xl:text-lg text-[#CC5500]/70 font-space mt-1 tracking-wide transition-opacity duration-300 ${isLoading ? 'opacity-20' : 'opacity-100'}`}>
                                ≈ {secondaryMeta?.symbol}<AnimatedNumber value={toSecondary(data.netWorth.amount, 'BRL') / 1000} formatter={(v) => v.toLocaleString(secondaryMeta?.locale || 'en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} />k
                            </span>
                        )}
                    </div>



                    {/* Stat Pills Strip */}
                    {!isLoading && (
                        <div className="flex flex-wrap justify-center items-stretch gap-3 relative z-10 pt-2 pb-3 xl:pt-3 xl:pb-4 px-4 mt-auto">
                            {/* ROI Pill */}
                            <div className={`flex flex-col gap-1.5 min-w-[140px] flex-1 max-w-[180px] px-4 py-3 rounded-2xl backdrop-blur-xl bg-white/[0.06] border shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-all hover:bg-white/[0.09] hover:shadow-[0_6px_20px_rgba(0,0,0,0.4)] ${currentROI.percentage >= 0 ? 'border-white/[0.10]' : 'border-white/[0.10]'}`}>
                                <div className="flex items-center gap-2">
                                    <div className={`flex items-center justify-center w-6 h-6 rounded-full bg-black/50 ${currentROI.percentage >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d={currentROI.percentage >= 0 ? "m5 12 7-7 7 7" : "m19 12-7 7-7-7"}/></svg>
                                    </div>
                                    <span className="text-[11px] text-[#F5F5DC]/50 uppercase tracking-widest font-space leading-none pt-0.5">ROI</span>
                                </div>
                                <div className="flex items-end gap-2 px-1">
                                    <span className={`text-xl font-bold font-space leading-none ${currentROI.percentage >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                        {currentROI.percentage >= 0 ? '+' : ''}{currentROI.percentage.toFixed(1)}%
                                    </span>
                                    <span className={`text-xs font-space opacity-70 mb-[1px] ${currentROI.percentage >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                        {currentROI.absolute >= 0 ? '+' : '-'}{currentROI.formattedAbsolute}
                                    </span>
                                </div>
                            </div>

                            {/* MoM Pill */}
                            <div className={`flex flex-col gap-1.5 min-w-[140px] flex-1 max-w-[180px] px-4 py-3 rounded-2xl backdrop-blur-xl bg-white/[0.06] border shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-all hover:bg-white/[0.09] hover:shadow-[0_6px_20px_rgba(0,0,0,0.4)] ${(diffPrevMonth?.amount || 0) >= 0 ? 'border-white/[0.10]' : 'border-white/[0.10]'}`}>
                                <div className="flex items-center gap-2">
                                    <div className={`flex items-center justify-center w-6 h-6 rounded-full bg-black/50 ${(diffPrevMonth?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                                    </div>
                                    <span className="text-[11px] text-[#F5F5DC]/50 uppercase tracking-widest font-space leading-none pt-0.5">MoM</span>
                                </div>
                                <div className="flex items-end gap-2 px-1">
                                    <span className={`text-xl font-bold font-space leading-none ${(diffPrevMonth?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                        {(diffPrevMonth?.amount || 0) >= 0 ? '+' : ''}{Math.abs(diffPrevMonth?.percentage || 0).toFixed(1)}%
                                    </span>
                                    <span className={`text-xs font-space opacity-70 mb-[1px] ${(diffPrevMonth?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                        {(diffPrevMonth?.amount || 0) >= 0 ? '+' : ''}{formatPrimaryNoDecimals(toPrimary(diffPrevMonth?.amount || 0, 'BRL'))}
                                    </span>
                                </div>
                            </div>

                            {/* Vs Target Pill */}
                            <div className={`flex flex-col gap-1.5 min-w-[140px] flex-1 max-w-[180px] px-4 py-3 rounded-2xl backdrop-blur-xl bg-white/[0.06] border shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-all hover:bg-white/[0.09] hover:shadow-[0_6px_20px_rgba(0,0,0,0.4)] ${(diffTarget?.amount || 0) >= 0 ? 'border-white/[0.10]' : 'border-white/[0.10]'}`}>
                                <div className="flex items-center gap-2">
                                    <div className={`flex items-center justify-center w-6 h-6 rounded-full bg-black/50 ${(diffTarget?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                                    </div>
                                    <span className="text-[11px] text-[#F5F5DC]/50 uppercase tracking-widest font-space leading-none pt-0.5">Vs Target</span>
                                </div>
                                <div className="flex items-end gap-2 px-1">
                                    <span className={`text-xl font-bold font-space leading-none ${(diffTarget?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                        {(diffTarget?.amount || 0) >= 0 ? '+' : ''}{Math.abs(diffTarget?.percentage || 0).toFixed(1)}%
                                    </span>
                                    <span className={`text-xs font-space opacity-70 mb-[1px] ${(diffTarget?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                        {(diffTarget?.amount || 0) >= 0 ? '+' : ''}{formatPrimaryNoDecimals(toPrimary(diffTarget?.amount || 0, 'BRL'))}
                                    </span>
                                </div>
                            </div>

                            {/* FX Impact Pill */}
                            {!singleCurrencyMode && (
                                <div className={`flex flex-col gap-1.5 min-w-[140px] flex-1 max-w-[180px] px-4 py-3 rounded-2xl backdrop-blur-xl bg-white/[0.06] border shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-all hover:bg-white/[0.09] hover:shadow-[0_6px_20px_rgba(0,0,0,0.4)] border-white/[0.10]`}>
                                    <div className="flex items-center gap-2">
                                        <div className={`flex items-center justify-center w-6 h-6 rounded-full bg-black/50 ${(fxEffectBRL?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h12"/><path d="M4 14h9"/><path d="M19 6a7.7 7.7 0 0 0-5.2-2M19 18a7.7 7.7 0 0 1-5.2 2"/></svg>
                                        </div>
                                        <span className="text-[11px] text-[#F5F5DC]/50 uppercase tracking-widest font-space leading-none pt-0.5">FX Impact</span>
                                    </div>
                                    <div className="flex items-end gap-2 px-1">
                                        <span className={`text-xl font-bold font-space leading-none ${(fxEffectBRL?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                            {(fxEffectBRL?.amount || 0) >= 0 ? '+' : ''}{Math.abs(fxEffectBRL?.percentage || 0).toFixed(1)}%
                                        </span>
                                        <span className={`text-xs font-space opacity-70 mb-[1px] ${(fxEffectBRL?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                            {(fxEffectBRL?.amount || 0) >= 0 ? '+' : ''}{formatPrimaryNoDecimals(toPrimary(fxEffectBRL?.amount || 0, 'BRL'))}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Expand Chevron */}
                    <button onClick={() => setHeroExpanded(prev => !prev)} className="w-full flex items-center justify-center py-1.5 hover:bg-white/[0.02] transition-colors relative z-10 border-t border-white/[0.04]">
                        <motion.div animate={{ rotate: heroExpanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#F5F5DC]/20"><path d="m6 9 6 6 6-6"/></svg>
                        </motion.div>
                    </button>

                    {/* Expandable Drawer */}
                    <AnimatePresence>
                        {heroExpanded && !isLoading && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: 'easeInOut' }} className="overflow-hidden relative z-10">
                                <div className="px-6 xl:px-8 pb-8 pt-4 border-t border-white/[0.04]">
                                    <div className={`grid ${singleCurrencyMode ? 'grid-cols-1 max-w-2xl mx-auto' : 'grid-cols-2 gap-8'}`}>
                                        {/* Primary Currency Details */}
                                        <div className="flex flex-col gap-4">
                                            <span className="text-sm text-[#D4AF37]/60 uppercase tracking-[2px] font-space font-bold">{primaryCurrency} Details</span>
                                            <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3.5">
                                                <span className="text-sm uppercase font-space tracking-[1.5px] text-[#F5F5DC]/40">{getJargon('monthlyChange', experience)}</span>
                                                <div className={`flex items-center gap-2 ${(diffPrevMonth?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                                    <span className="font-space text-sm font-medium">{(diffPrevMonth?.amount || 0) >= 0 ? '+' : ''}{formatPrimaryNoDecimals(toPrimary(diffPrevMonth?.amount || 0, 'BRL'))}</span>
                                                    <span className="text-sm font-space opacity-70">{Math.abs(diffPrevMonth?.percentage || 0).toFixed(1)}%</span>
                                                </div>
                                            </div>
                                            {(Math.abs(fxEffectBRL?.percentage || 0) > 0.05 || Math.abs(assetEffectBRL?.percentage || 0) > 0.05) && (
                                                <div className="flex flex-col gap-1.5 pl-4 border-l-2 border-white/[0.06] ml-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-space text-[#F5F5DC]/40 flex items-center gap-1.5"><span className="text-xs">↳</span> Asset Prices</span>
                                                        <div className={`flex items-center gap-1.5 ${(assetEffectBRL?.amount || 0) >= 0 ? 'text-vu-green/80' : 'text-red-400/80'}`}>
                                                            <span className="font-space text-sm">{(assetEffectBRL?.amount || 0) >= 0 ? '+' : ''}{formatPrimaryNoDecimals(toPrimary(assetEffectBRL?.amount || 0, 'BRL'))}</span>
                                                            <span className="font-space text-sm opacity-70">{Math.abs(assetEffectBRL?.percentage || 0).toFixed(1)}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-space text-[#F5F5DC]/40 flex items-center gap-1.5"><span className="text-xs">↳</span> {getJargon('fxImpact', experience)}</span>
                                                        <div className={`flex items-center gap-1.5 ${(fxEffectBRL?.amount || 0) >= 0 ? 'text-vu-green/80' : 'text-red-400/80'}`}>
                                                            <span className="font-space text-sm">{(fxEffectBRL?.amount || 0) >= 0 ? '+' : ''}{formatPrimaryNoDecimals(toPrimary(fxEffectBRL?.amount || 0, 'BRL'))}</span>
                                                            <span className="font-space text-sm opacity-70">{Math.abs(fxEffectBRL?.percentage || 0).toFixed(1)}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {Math.abs(diffTarget?.amount || 0) > 1 && (
                                                <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3.5">
                                                    <span className="text-sm uppercase font-space tracking-[1.5px] text-[#F5F5DC]/40">Target</span>
                                                    <div className={`flex items-center gap-2 ${(diffTarget?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                                        <span className="font-space text-sm font-medium">{(diffTarget?.amount || 0) >= 0 ? '+' : ''}{formatPrimaryNoDecimals(toPrimary(diffTarget?.amount || 0, 'BRL'))}</span>
                                                        <span className="text-sm font-space opacity-70">{Math.abs(diffTarget?.percentage || 0).toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                            )}
                                            {topContributors.length > 0 && (
                                                <div className="flex flex-col gap-2.5 mt-2">
                                                    <span className="text-sm text-[#F5F5DC]/30 uppercase tracking-[1.5px] font-space">Top Contributors</span>
                                                    {topContributors.map((c: any) => (
                                                        <div key={`drawer-pri-${c.id}`} className="flex justify-between items-center text-sm">
                                                            <span className="text-[#F5F5DC]/60 font-space truncate max-w-[200px]">{c.name}</span>
                                                            <span className={`font-space tabular-nums ${c.amount >= 0 ? 'text-vu-green/90' : 'text-red-400/90'}`}>
                                                                {c.amount >= 0 ? '+' : '-'}{formatPrimaryNoDecimals(Math.abs(c.amount))}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Secondary Currency Details */}
                                        {!singleCurrencyMode && (
                                            <div className="flex flex-col gap-4">
                                            <span className="text-sm text-[#CC5500]/80 uppercase tracking-[2px] font-space font-bold">{secondaryCurrency} Details</span>
                                            <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3.5">
                                                <span className="text-sm uppercase font-space tracking-[1.5px] text-[#F5F5DC]/40">{getJargon('monthlyChange', experience)}</span>
                                                <div className={`flex items-center gap-2 ${(diffPrevMonthGBP?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                                    <span className="font-space text-sm font-medium">{(diffPrevMonthGBP?.amount || 0) >= 0 ? '+' : '-'}{formatSecondaryNoDecimals(Math.abs(diffPrevMonthGBP?.amount || 0))}</span>
                                                    <span className="text-sm font-space opacity-70">{Math.abs(diffPrevMonthGBP?.percentage || 0).toFixed(1)}%</span>
                                                </div>
                                            </div>
                                            {(Math.abs(fxEffectGBP?.percentage || 0) > 0.05 || Math.abs(assetEffectGBP?.percentage || 0) > 0.05) && (
                                                <div className="flex flex-col gap-1.5 pl-4 border-l-2 border-white/[0.06] ml-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-space text-[#F5F5DC]/40 flex items-center gap-1.5"><span className="text-xs">↳</span> Asset Prices</span>
                                                        <div className={`flex items-center gap-1.5 ${(assetEffectGBP?.amount || 0) >= 0 ? 'text-vu-green/80' : 'text-red-400/80'}`}>
                                                            <span className="font-space text-sm">{(assetEffectGBP?.amount || 0) >= 0 ? '+' : '-'}{formatSecondaryNoDecimals(Math.abs(assetEffectGBP?.amount || 0))}</span>
                                                            <span className="font-space text-sm opacity-70">{Math.abs(assetEffectGBP?.percentage || 0).toFixed(1)}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-space text-[#F5F5DC]/40 flex items-center gap-1.5"><span className="text-xs">↳</span> {getJargon('fxImpact', experience)}</span>
                                                        <div className={`flex items-center gap-1.5 ${(fxEffectGBP?.amount || 0) >= 0 ? 'text-vu-green/80' : 'text-red-400/80'}`}>
                                                            <span className="font-space text-sm">{(fxEffectGBP?.amount || 0) >= 0 ? '+' : '-'}{formatSecondaryNoDecimals(Math.abs(fxEffectGBP?.amount || 0))}</span>
                                                            <span className="font-space text-sm opacity-70">{Math.abs(fxEffectGBP?.percentage || 0).toFixed(1)}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {Math.abs(diffTargetGBP?.amount || 0) > 1 && (
                                                <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3.5">
                                                    <span className="text-sm uppercase font-space tracking-[1.5px] text-[#F5F5DC]/40">Target</span>
                                                    <div className={`flex items-center gap-2 ${(diffTargetGBP?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                                        <span className="font-space text-sm font-medium">{(diffTargetGBP?.amount || 0) >= 0 ? '+' : '-'}{formatSecondaryNoDecimals(Math.abs(diffTargetGBP?.amount || 0))}</span>
                                                        <span className="text-sm font-space opacity-70">{Math.abs(diffTargetGBP?.percentage || 0).toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                            )}
                                            {topContributorsSecondary.length > 0 && (
                                                <div className="flex flex-col gap-2.5 mt-2">
                                                    <span className="text-sm text-[#F5F5DC]/30 uppercase tracking-[1.5px] font-space">Top Contributors</span>
                                                    {topContributorsSecondary.map((c: any) => (
                                                        <div key={`drawer-sec-${c.id}`} className="flex justify-between items-center text-sm">
                                                            <span className="text-[#F5F5DC]/60 font-space truncate max-w-[200px]">{c.name}</span>
                                                            <span className={`font-space tabular-nums ${c.amount >= 0 ? 'text-[#CC5500]/90' : 'text-red-400/90'}`}>
                                                                {c.amount >= 0 ? '+' : '-'}{formatSecondaryNoDecimals(Math.abs(c.amount))}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Desktop Sidebar (Asset Cards) */}
                {sidebar && (
                    <div id="ftue-sidebar" className="col-span-4 hidden lg:flex flex-col gap-1.5 h-full">
                        {sidebar}
                    </div>
                )}
            </div>
        </div>
        </>
    );
}
