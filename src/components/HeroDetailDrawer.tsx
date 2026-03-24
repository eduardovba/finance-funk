import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePortfolio } from '@/context/PortfolioContext';
import { formatCurrency, convertCurrency, SUPPORTED_CURRENCIES } from '@/lib/currency';

/**
 * HeroDetailDrawer — expandable detail panel for asset page hero cards.
 *
 * Props:
 *   categoryId    – one of 'equity','crypto','fixed-income','pensions','real-estate','debt'
 *   effectiveCurrency – the currency currently displayed in the hero card
 *   totalCurrentValue – the tab's total current value in effectiveCurrency (used for FX proportion)
 */
export default function HeroDetailDrawer({ categoryId, effectiveCurrency, totalCurrentValue }: any) {
    const {
        assetDiffs, assetDiffsGBP, categoryAssetDiffs,
        fxEffectBRL, assetEffectBRL, fxEffectGBP, assetEffectGBP,
        totalNetWorthBRL,
        primaryCurrency, secondaryCurrency,
        toPrimary, toSecondary,
        formatPrimary, formatSecondary,
        rates,
    } = usePortfolio();

    const [expanded, setExpanded] = useState(false);

    // Determine which "base" BRL amount maps to our category
    const catDiffBRL = assetDiffs?.[categoryId] || { amount: 0, percentage: 0 };
    const catDiffGBP = assetDiffsGBP?.[categoryId] || { amount: 0, percentage: 0 };

    // Use the currency that matches the effective display currency
    const isBRLBased = effectiveCurrency === 'BRL';
    const isGBPBased = effectiveCurrency === 'GBP';
    const currencyMeta = SUPPORTED_CURRENCIES[effectiveCurrency];

    // MoM diff in effectiveCurrency
    const momDiff = useMemo(() => {
        // catDiffBRL.amount is in BRL, catDiffGBP.amount is in GBP
        // Convert to effectiveCurrency
        if (!rates) return { amount: 0, percentage: 0 };
        const amount = convertCurrency(catDiffBRL.amount, 'BRL', effectiveCurrency, rates);
        return { amount, percentage: catDiffBRL.percentage };
    }, [catDiffBRL, effectiveCurrency, rates]);

    // FX decomposition — scale global FX effect proportionally to this category's share
    const fxDecomposition = useMemo(() => {
        if (!totalNetWorthBRL || totalNetWorthBRL === 0 || !rates) return null;

        // Our category's BRL total as a proportion of the whole portfolio
        // We use the previous month's value via the diff: current = prev + diff, so prev ≈ current - diff
        // But for simplicity, use the percentage directly from global FX
        const globalFxBRL = fxEffectBRL || { amount: 0, percentage: 0 };
        const globalAssetBRL = assetEffectBRL || { amount: 0, percentage: 0 };

        // Scale by category's proportion of net worth
        // A rough approach: category MoM amount = catFxAmount + catAssetAmount
        // where catFxAmount ≈ globalFx% * catPrevValue ≈ globalFx% / globalMoM% * catMoM.amount
        // Simpler: just use global percentages as they represent the same rate environment

        const catFxAmount = convertCurrency(globalFxBRL.amount, 'BRL', effectiveCurrency, rates) *
            (Math.abs(catDiffBRL.amount) / (Math.abs(fxEffectBRL.amount + assetEffectBRL.amount) || 1));
        const catAssetAmount = momDiff.amount - catFxAmount;

        // Only show if the FX effect is meaningful
        if (Math.abs(globalFxBRL.percentage) < 0.05) return null;

        return {
            fxAmount: catFxAmount,
            fxPercentage: globalFxBRL.percentage,
            assetAmount: catAssetAmount,
            assetPercentage: globalAssetBRL.percentage,
        };
    }, [fxEffectBRL, assetEffectBRL, totalNetWorthBRL, catDiffBRL, momDiff, effectiveCurrency, rates]);

    // Top contributors
    const topContributors = useMemo(() => {
        const catAssets = categoryAssetDiffs?.[categoryId] || {};
        return Object.entries(catAssets)
            .map(([name, diff]) => ({
                name,
                amountBRL: diff.amount,
                percentage: diff.percentage,
                amount: rates ? convertCurrency(diff.amount, 'BRL', effectiveCurrency, rates) : diff.amount,
            }))
            .filter(c => Math.abs(c.amount) > 1)
            .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
            .slice(0, 5);
    }, [categoryAssetDiffs, categoryId, effectiveCurrency, rates]);

    // Format helpers for the effectiveCurrency
    const fmt = (val: number) => formatCurrency(val, effectiveCurrency, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const hasData = Math.abs(momDiff.amount) > 0.01 || topContributors.length > 0;
    if (!hasData) return null;

    return (
        <>
            {/* Gold Gradient Divider */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />

            {/* Expand Chevron */}
            <button
                onClick={() => setExpanded(prev => !prev)}
                className="w-full flex items-center justify-center py-2 hover:bg-white/[0.02] transition-colors relative z-10"
            >
                <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#F5F5DC]/20">
                        <path d="m6 9 6 6 6-6"/>
                    </svg>
                </motion.div>
            </button>

            {/* Expandable Drawer */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-6 pt-2 border-t border-white/[0.04]">
                            <div className="flex flex-col gap-4 max-w-md mx-auto">

                                {/* MoM Variance */}
                                <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3">
                                    <span className="text-xs uppercase font-space tracking-[1.5px] text-[#F5F5DC]/40">MoM</span>
                                    <div className={`flex items-center gap-2 ${momDiff.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        <span className="font-space  text-data-sm xl:text-sm font-medium">
                                            {momDiff.amount >= 0 ? '+' : ''}{fmt(momDiff.amount)}
                                        </span>
                                        <span className="text-xs font-space opacity-70">{Math.abs(momDiff.percentage).toFixed(1)}%</span>
                                    </div>
                                </div>

                                {/* FX Decomposition */}
                                {fxDecomposition && (
                                    <div className="flex flex-col gap-1.5 pl-4 border-l-2 border-white/[0.06] ml-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-space text-[#F5F5DC]/40 flex items-center gap-1.5">
                                                <span className="text-2xs">↳</span> Asset Prices
                                            </span>
                                            <div className={`flex items-center gap-1.5 ${fxDecomposition.assetAmount >= 0 ? 'text-emerald-400/80' : 'text-red-400/80'}`}>
                                                <span className="font-space  text-data-xs">
                                                    {fxDecomposition.assetAmount >= 0 ? '+' : ''}{fmt(fxDecomposition.assetAmount)}
                                                </span>
                                                <span className="font-space text-xs opacity-70">{Math.abs(fxDecomposition.assetPercentage).toFixed(1)}%</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-space text-[#F5F5DC]/40 flex items-center gap-1.5">
                                                <span className="text-2xs">↳</span> FX Effect
                                            </span>
                                            <div className={`flex items-center gap-1.5 ${fxDecomposition.fxAmount >= 0 ? 'text-emerald-400/80' : 'text-red-400/80'}`}>
                                                <span className="font-space  text-data-xs">
                                                    {fxDecomposition.fxAmount >= 0 ? '+' : ''}{fmt(fxDecomposition.fxAmount)}
                                                </span>
                                                <span className="font-space text-xs opacity-70">{Math.abs(fxDecomposition.fxPercentage).toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Top Contributors */}
                                {topContributors.length > 0 && (
                                    <div className="flex flex-col gap-2 mt-2">
                                        <span className="text-xs text-[#F5F5DC]/30 uppercase tracking-[1.5px] font-space">Top Contributors</span>
                                        {topContributors.map((c: any) => (
                                            <div key={c.name} className="flex justify-between items-center text-xs">
                                                <span className="text-[#F5F5DC]/60 font-space truncate max-w-[200px]">{c.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-space tabular-nums ${c.amount >= 0 ? 'text-emerald-400/90' : 'text-red-400/90'}`}>
                                                        {c.amount >= 0 ? '+' : ''}{fmt(c.amount)}
                                                    </span>
                                                    <span className={`font-space text-xs opacity-60 ${c.percentage >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                                                        {c.percentage >= 0 ? '+' : ''}{Math.abs(c.percentage).toFixed(1)}%
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
