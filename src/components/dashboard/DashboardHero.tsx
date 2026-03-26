import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { usePortfolio } from '@/context/PortfolioContext';
import { getJargon, type ExperienceLevel } from '@/lib/personalization';

interface DashboardHeroProps {
    data: any;
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
        data, isLoading, primaryMeta, secondaryMeta, primaryCurrency, secondaryCurrency,
        toPrimary, toSecondary, formatPrimaryNoDecimals, formatSecondaryNoDecimals,
        currentROI, diffPrevMonth, diffPrevMonthGBP, diffTarget, diffTargetGBP,
        fxEffectBRL, assetEffectBRL, fxEffectGBP, assetEffectGBP,
        topContributors, topContributorsSecondary,
        heroExpanded, setHeroExpanded, lastUpdatedLabel, forceRefreshMarketData, isRefreshingMarketData,
        sidebar
    } = props;

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
        <div className="md:hidden flex flex-col items-center justify-center pt-2 pb-8 px-4 mb-4 relative">
            <div className="absolute top-0 right-2 flex items-center gap-2">
                {lastUpdatedLabel && (
                    <span className="text-2xs text-[#F5F5DC]/30 font-space tracking-widest uppercase">{lastUpdatedLabel}</span>
                )}
                <RefreshButton />
            </div>

            <span className="text-2xs text-[#F5F5DC]/40 uppercase tracking-[4px] font-space mb-3 text-center w-full block">{getJargon('netWorth', experience)}</span>

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

            <div className={`flex flex-wrap justify-center gap-3 transition-opacity duration-300 ${isLoading ? 'opacity-30' : 'opacity-100'}`}>
                {/* MoM Pill */}
                <div className={`px-2 py-1 rounded-xl font-medium text-xs flex items-center gap-1.5 leading-none shadow-sm border ${(diffPrevMonth?.amount || 0) >= 0 ? 'text-vu-green bg-vu-green/[0.08] border-vu-green/20' : 'text-red-400 bg-red-400/[0.08] border-red-400/20'}`}>
                    <span className="text-2xs uppercase font-space tracking-widest opacity-70 hidden min-[400px]:block mt-0.5">{getJargon('monthlyChange', experience)}</span>
                    <span className="font-space  tracking-tight opacity-90 text-data-xs">
                        {(diffPrevMonth?.amount || 0) >= 0 ? '+' : ''}{formatPrimaryNoDecimals(toPrimary(diffPrevMonth?.amount || 0, 'BRL'))}
                    </span>
                    <div className="w-px h-3 bg-current opacity-30" />
                    <span className="flex items-center gap-0.5 font-space">
                        {Math.abs(diffPrevMonth?.percentage || 0).toFixed(1)}%
                        <span className="text-2xs opacity-70 mb-[1px]">{(diffPrevMonth?.amount || 0) >= 0 ? '▲' : '▼'}</span>
                    </span>
                </div>

                {/* vs Target Pill */}
                {Math.abs(diffTarget?.amount || 0) > 1 && (
                    <div className={`px-2 py-1 rounded-xl font-medium text-xs flex items-center gap-1.5 leading-none shadow-sm border ${(diffTarget?.amount || 0) >= 0 ? 'text-vu-green bg-vu-green/[0.08] border-vu-green/20' : 'text-red-400 bg-red-400/[0.08] border-red-400/20'}`}>
                        <span className="text-2xs uppercase font-space tracking-widest opacity-70 hidden min-[400px]:block mt-0.5">Target</span>
                        <span className="font-space  tracking-tight opacity-90 text-data-xs">
                            {(diffTarget?.amount || 0) >= 0 ? '+' : ''}{formatPrimaryNoDecimals(toPrimary(diffTarget?.amount || 0, 'BRL'))}
                        </span>
                        <div className="w-px h-3 bg-current opacity-30" />
                        <span className="flex items-center gap-0.5 font-space">
                            {Math.abs(diffTarget?.percentage || 0).toFixed(1)}%
                            <span className="text-2xs opacity-70 mb-[1px]">{(diffTarget?.amount || 0) >= 0 ? '▲' : '▼'}</span>
                        </span>
                    </div>
                )}
            </div>
        </div>

        {/* DESKTOP HERO */}
        <div className="hidden md:block mb-8">
            <div className="lg:grid lg:grid-cols-12 lg:gap-5 lg:items-stretch">
                {/* Hero Card */}
                <div id="ftue-hero" className="col-span-12 lg:col-span-8 rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] mb-8 lg:mb-0 relative overflow-hidden flex flex-col">
                    <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.015] to-transparent -translate-x-full pointer-events-none" animate={{ x: ['-100%', '200%'] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} />

                    {/* Refresh Row */}
                    <div className="absolute top-4 right-5 z-20 flex items-center gap-3">
                        {lastUpdatedLabel && (
                            <span className="text-xs text-[#F5F5DC]/20 font-space tracking-wider uppercase">{lastUpdatedLabel}</span>
                        )}
                        <RefreshButton size={12} showLabel />
                    </div>

                    {/* Main Balance */}
                    <div className="flex flex-col items-center justify-center pt-6 pb-3 xl:pt-8 xl:pb-4 px-6 relative z-10">
                        <span className="text-xs xl:text-xs text-[#F5F5DC]/30 uppercase tracking-[4px] font-space mb-2">{getJargon('netWorth', experience)}</span>
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

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37]/25 to-transparent my-1" />

                    {/* Stat Strip */}
                    {!isLoading && (
                        <div className={`grid ${singleCurrencyMode ? 'grid-cols-3' : 'grid-cols-4'} relative z-10`}>
                            <div className="flex flex-col items-center py-4 xl:py-5 border-r border-white/[0.04]">
                                <span className="text-xs xl:text-sm text-[#F5F5DC]/30 uppercase tracking-[2px] font-space mb-1.5">{getJargon('roi', experience)}</span>
                                <span className={`text-xl xl:text-2xl font-bold font-space ${currentROI.percentage >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                    {currentROI.percentage >= 0 ? '+' : ''}{currentROI.percentage.toFixed(1)}%
                                </span>
                                <span className={`text-data-xs xl:text-sm font-space  mt-0.5 opacity-60 ${currentROI.percentage >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                    {currentROI.absolute >= 0 ? '+' : '-'}{currentROI.formattedAbsolute}
                                </span>
                            </div>
                            <div className="flex flex-col items-center py-4 xl:py-5 border-r border-white/[0.04]">
                                <span className="text-xs xl:text-sm text-[#F5F5DC]/30 uppercase tracking-[2px] font-space mb-1.5">{getJargon('monthlyChange', experience)}</span>
                                <span className={`text-xl xl:text-2xl font-bold font-space ${(diffPrevMonth?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                    {(diffPrevMonth?.amount || 0) >= 0 ? '+' : ''}{Math.abs(diffPrevMonth?.percentage || 0).toFixed(1)}%
                                </span>
                                <span className={`text-data-xs xl:text-sm font-space  mt-0.5 opacity-60 ${(diffPrevMonth?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                    {(diffPrevMonth?.amount || 0) >= 0 ? '+' : ''}{formatPrimaryNoDecimals(toPrimary(diffPrevMonth?.amount || 0, 'BRL'))}
                                </span>
                            </div>
                            <div className={`flex flex-col items-center py-4 xl:py-5 ${singleCurrencyMode ? '' : 'border-r border-white/[0.04]'}`}>
                                <span className="text-xs xl:text-sm text-[#F5F5DC]/30 uppercase tracking-[2px] font-space mb-1.5">vs Target</span>
                                <span className={`text-xl xl:text-2xl font-bold font-space ${(diffTarget?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                    {(diffTarget?.amount || 0) >= 0 ? '+' : ''}{Math.abs(diffTarget?.percentage || 0).toFixed(1)}%
                                </span>
                                <span className={`text-data-xs xl:text-sm font-space  mt-0.5 opacity-60 ${(diffTarget?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                    {(diffTarget?.amount || 0) >= 0 ? '+' : ''}{formatPrimaryNoDecimals(toPrimary(diffTarget?.amount || 0, 'BRL'))}
                                </span>
                            </div>
                            {!singleCurrencyMode && (
                                <div className="flex flex-col items-center py-4 xl:py-5">
                                    <span className="text-xs xl:text-sm text-[#F5F5DC]/30 uppercase tracking-[2px] font-space mb-1.5">{getJargon('fxImpact', experience)}</span>
                                    <span className={`text-xl xl:text-2xl font-bold font-space ${(fxEffectBRL?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                        {(fxEffectBRL?.amount || 0) >= 0 ? '+' : ''}{Math.abs(fxEffectBRL?.percentage || 0).toFixed(1)}%
                                    </span>
                                    <span className={`text-data-xs xl:text-sm font-space  mt-0.5 opacity-60 ${(fxEffectBRL?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                        {(fxEffectBRL?.amount || 0) >= 0 ? '+' : ''}{formatPrimaryNoDecimals(toPrimary(fxEffectBRL?.amount || 0, 'BRL'))}
                                    </span>
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
                                            <span className="text-xs text-[#D4AF37]/50 uppercase tracking-[2px] font-space">{primaryCurrency} Details</span>
                                            <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3">
                                                <span className="text-xs uppercase font-space tracking-[1.5px] text-[#F5F5DC]/40">{getJargon('monthlyChange', experience)}</span>
                                                <div className={`flex items-center gap-2 ${(diffPrevMonth?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                                    <span className="font-space  text-data-sm xl:text-sm font-medium">{(diffPrevMonth?.amount || 0) >= 0 ? '+' : ''}{formatPrimaryNoDecimals(toPrimary(diffPrevMonth?.amount || 0, 'BRL'))}</span>
                                                    <span className="text-xs font-space opacity-70">{Math.abs(diffPrevMonth?.percentage || 0).toFixed(1)}%</span>
                                                </div>
                                            </div>
                                            {(Math.abs(fxEffectBRL?.percentage || 0) > 0.05 || Math.abs(assetEffectBRL?.percentage || 0) > 0.05) && (
                                                <div className="flex flex-col gap-1.5 pl-4 border-l-2 border-white/[0.06] ml-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-space text-[#F5F5DC]/40 flex items-center gap-1.5"><span className="text-2xs">↳</span> Asset Prices</span>
                                                        <div className={`flex items-center gap-1.5 ${(assetEffectBRL?.amount || 0) >= 0 ? 'text-vu-green/80' : 'text-red-400/80'}`}>
                                                            <span className="font-space  text-data-xs">{(assetEffectBRL?.amount || 0) >= 0 ? '+' : ''}{formatPrimaryNoDecimals(toPrimary(assetEffectBRL?.amount || 0, 'BRL'))}</span>
                                                            <span className="font-space text-xs opacity-70">{Math.abs(assetEffectBRL?.percentage || 0).toFixed(1)}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-space text-[#F5F5DC]/40 flex items-center gap-1.5"><span className="text-2xs">↳</span> {getJargon('fxImpact', experience)}</span>
                                                        <div className={`flex items-center gap-1.5 ${(fxEffectBRL?.amount || 0) >= 0 ? 'text-vu-green/80' : 'text-red-400/80'}`}>
                                                            <span className="font-space  text-data-xs">{(fxEffectBRL?.amount || 0) >= 0 ? '+' : ''}{formatPrimaryNoDecimals(toPrimary(fxEffectBRL?.amount || 0, 'BRL'))}</span>
                                                            <span className="font-space text-xs opacity-70">{Math.abs(fxEffectBRL?.percentage || 0).toFixed(1)}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {Math.abs(diffTarget?.amount || 0) > 1 && (
                                                <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3">
                                                    <span className="text-xs uppercase font-space tracking-[1.5px] text-[#F5F5DC]/40">Target</span>
                                                    <div className={`flex items-center gap-2 ${(diffTarget?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                                        <span className="font-space  text-data-sm xl:text-sm font-medium">{(diffTarget?.amount || 0) >= 0 ? '+' : ''}{formatPrimaryNoDecimals(toPrimary(diffTarget?.amount || 0, 'BRL'))}</span>
                                                        <span className="text-xs font-space opacity-70">{Math.abs(diffTarget?.percentage || 0).toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                            )}
                                            {topContributors.length > 0 && (
                                                <div className="flex flex-col gap-2 mt-2">
                                                    <span className="text-xs text-[#F5F5DC]/30 uppercase tracking-[1.5px] font-space">Top Contributors</span>
                                                    {topContributors.map((c: any) => (
                                                        <div key={`drawer-pri-${c.id}`} className="flex justify-between items-center text-xs">
                                                            <span className="text-[#F5F5DC]/60 font-space truncate max-w-[180px]">{c.name}</span>
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
                                            <span className="text-xs text-[#CC5500]/70 uppercase tracking-[2px] font-space">{secondaryCurrency} Details</span>
                                            <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3">
                                                <span className="text-xs uppercase font-space tracking-[1.5px] text-[#F5F5DC]/40">{getJargon('monthlyChange', experience)}</span>
                                                <div className={`flex items-center gap-2 ${(diffPrevMonthGBP?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                                    <span className="font-space  text-data-sm xl:text-sm font-medium">{(diffPrevMonthGBP?.amount || 0) >= 0 ? '+' : '-'}{formatSecondaryNoDecimals(Math.abs(diffPrevMonthGBP?.amount || 0))}</span>
                                                    <span className="text-xs font-space opacity-70">{Math.abs(diffPrevMonthGBP?.percentage || 0).toFixed(1)}%</span>
                                                </div>
                                            </div>
                                            {(Math.abs(fxEffectGBP?.percentage || 0) > 0.05 || Math.abs(assetEffectGBP?.percentage || 0) > 0.05) && (
                                                <div className="flex flex-col gap-1.5 pl-4 border-l-2 border-white/[0.06] ml-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-space text-[#F5F5DC]/40 flex items-center gap-1.5"><span className="text-2xs">↳</span> Asset Prices</span>
                                                        <div className={`flex items-center gap-1.5 ${(assetEffectGBP?.amount || 0) >= 0 ? 'text-vu-green/80' : 'text-red-400/80'}`}>
                                                            <span className="font-space  text-data-xs">{(assetEffectGBP?.amount || 0) >= 0 ? '+' : '-'}{formatSecondaryNoDecimals(Math.abs(assetEffectGBP?.amount || 0))}</span>
                                                            <span className="font-space text-xs opacity-70">{Math.abs(assetEffectGBP?.percentage || 0).toFixed(1)}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-space text-[#F5F5DC]/40 flex items-center gap-1.5"><span className="text-2xs">↳</span> {getJargon('fxImpact', experience)}</span>
                                                        <div className={`flex items-center gap-1.5 ${(fxEffectGBP?.amount || 0) >= 0 ? 'text-vu-green/80' : 'text-red-400/80'}`}>
                                                            <span className="font-space  text-data-xs">{(fxEffectGBP?.amount || 0) >= 0 ? '+' : '-'}{formatSecondaryNoDecimals(Math.abs(fxEffectGBP?.amount || 0))}</span>
                                                            <span className="font-space text-xs opacity-70">{Math.abs(fxEffectGBP?.percentage || 0).toFixed(1)}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {Math.abs(diffTargetGBP?.amount || 0) > 1 && (
                                                <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3">
                                                    <span className="text-xs uppercase font-space tracking-[1.5px] text-[#F5F5DC]/40">Target</span>
                                                    <div className={`flex items-center gap-2 ${(diffTargetGBP?.amount || 0) >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                                        <span className="font-space  text-data-sm xl:text-sm font-medium">{(diffTargetGBP?.amount || 0) >= 0 ? '+' : '-'}{formatSecondaryNoDecimals(Math.abs(diffTargetGBP?.amount || 0))}</span>
                                                        <span className="text-xs font-space opacity-70">{Math.abs(diffTargetGBP?.percentage || 0).toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                            )}
                                            {topContributorsSecondary.length > 0 && (
                                                <div className="flex flex-col gap-2 mt-2">
                                                    <span className="text-xs text-[#F5F5DC]/30 uppercase tracking-[1.5px] font-space">Top Contributors</span>
                                                    {topContributorsSecondary.map((c: any) => (
                                                        <div key={`drawer-sec-${c.id}`} className="flex justify-between items-center text-xs">
                                                            <span className="text-[#F5F5DC]/60 font-space truncate max-w-[180px]">{c.name}</span>
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
