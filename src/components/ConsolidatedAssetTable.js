import { formatCurrency } from "@/lib/currency";

import { usePortfolio } from '@/context/PortfolioContext';

export default function ConsolidatedAssetTable({ title, categoryId, assets, rates, hideInvestment = false, onNavigate }) {
    const { primaryCurrency, secondaryCurrency, toPrimary, toSecondary, formatPrimary, formatSecondary } = usePortfolio();

    // assets should be an array of objects: { name, brl, gbp, investmentGBP, roi, isTotal }

    let activeAssets = assets.filter(a => !a.isRealisedPnL && !a.isTotal && a.brl >= 10);


    // Hide entire section if no active holdings
    if (activeAssets.length === 0) return null;

    const realisedPnL = assets.find(a => a.isRealisedPnL);
    const totalAsset = assets.find(a => a.isTotal);

    // Calculate subtotal for active assets (Current Holdings)
    const subBrl = activeAssets.reduce((s, a) => s + (a.brl || 0), 0);
    const subGbp = activeAssets.reduce((s, a) => s + (a.gbp || 0), 0);
    const subInv = activeAssets.reduce((s, a) => s + (a.investmentGBP || 0), 0);
    const subPnL = subGbp - subInv;
    const subRoi = subInv !== 0 ? (subPnL / subInv) * 100 : 0;

    return (
        <section className="mt-0 mb-10 bg-[#0D0814]/60 border border-[#D4AF37]/10 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
            {/* Subtle background glow for the cluster */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent"></div>

            <div className="flex items-center mb-8">
                <div className="w-1.5 h-8 bg-[#D4AF37] rounded-full mr-4 shadow-[0_0_8px_rgba(212,175,55,0.5)]"></div>
                <h3 className="m-0 text-2xl md:text-3xl text-[#D4AF37] font-normal font-bebas tracking-wide uppercase">
                    {title}
                </h3>
                <div className="h-px bg-gradient-to-r from-[#D4AF37]/30 to-transparent flex-grow ml-6"></div>
            </div>

            {/* Asset Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 font-space">
                {activeAssets.map((asset, index) => (
                    <div
                        key={index}
                        onClick={() => onNavigate && categoryId ? onNavigate(categoryId, asset.name) : null}
                        className={`bg-[#1A0F2E] border border-white/5 rounded-2xl p-5 shadow-lg shadow-black/40 flex flex-col justify-between
                                   transition-all duration-300 hover:bg-black/40 hover:border-[#D4AF37]/30 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(212,175,55,0.15)] group relative overflow-hidden ${onNavigate && categoryId ? 'cursor-pointer' : ''}`}
                    >
                        {/* Status glow indicator based on ROI */}
                        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] -mr-10 -mt-10 opacity-10 transition-opacity duration-300 group-hover:opacity-30 ${asset.roi >= 0 ? 'bg-vu-green' : 'bg-red-400'}`}></div>

                        <div className="z-10 relative">
                            {/* Card Header */}
                            <h4 className="text-lg font-medium text-[#F5F5DC]/90 mb-4 border-b border-[#D4AF37]/10 pb-3 truncate pr-4" title={asset.name}>
                                {asset.name}
                            </h4>

                            {/* Card Body (Values) */}
                            <div className="flex flex-col gap-3 mb-6">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-[10px] uppercase tracking-widest text-[#F5F5DC]/40">Value {primaryCurrency}</span>
                                    <span className="text-sm font-medium text-[#F5F5DC]/90">{formatPrimary(toPrimary(asset.gbp))}</span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-[10px] uppercase tracking-widest text-[#F5F5DC]/40">Value {secondaryCurrency}</span>
                                    <span className="text-sm font-medium text-[#F5F5DC]/70">{formatSecondary(toSecondary(asset.gbp))}</span>
                                </div>
                                {!hideInvestment && (
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-[10px] uppercase tracking-widest text-[#F5F5DC]/40">Net Invest ({secondaryCurrency})</span>
                                        <span className="text-sm font-medium text-[#F5F5DC]/70">{formatSecondary(toSecondary(asset.investmentGBP))}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Card Footer (ROI) */}
                        <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-end z-10 relative">
                            <span className="text-[10px] uppercase tracking-widest text-[#F5F5DC]/40 mb-1">Total ROI</span>
                            <span className={`text-3xl font-bebas tracking-wider ${asset.roi >= 0 ? 'text-vu-green drop-shadow-[0_0_5px_rgba(74,222,128,0.3)]' : 'text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.3)]'}`}>
                                {asset.roi !== null && asset.roi !== undefined ? (
                                    <>{asset.roi >= 0 ? '+' : ''}{asset.roi.toFixed(1)}%</>
                                ) : '---'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Summary Section (Subtotal, Realised P&L, Total) */}
            {(realisedPnL || totalAsset) && (
                <div className="mt-6 bg-[#0D0814] border border-[#D4AF37]/20 rounded-2xl overflow-hidden font-space">
                    {/* Current Holdings Subtotal */}
                    {realisedPnL && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 border-b border-white/5 bg-white/5 items-center">
                            <div className="col-span-2 md:col-span-1 text-[#F5F5DC]/50 italic text-sm">
                                Current Holdings
                            </div>
                            <div className="flex flex-col md:items-end">
                                <span className="text-[10px] uppercase text-[#F5F5DC]/40 md:hidden mb-1">Total {primaryCurrency}</span>
                                <span className="text-sm text-[#F5F5DC]/80">{formatPrimary(toPrimary(subGbp))}</span>
                            </div>
                            <div className="flex flex-col md:items-end">
                                <span className="text-[10px] uppercase text-[#F5F5DC]/40 md:hidden mb-1">Total {secondaryCurrency}</span>
                                <span className="text-sm text-[#F5F5DC]/60">{formatSecondary(toSecondary(subGbp))}</span>
                            </div>
                            {!hideInvestment ? (
                                <div className="flex flex-col md:items-end">
                                    <span className="text-[10px] uppercase text-[#F5F5DC]/40 md:hidden mb-1">Total Invested</span>
                                    <span className="text-sm text-[#F5F5DC]/60">{formatSecondary(toSecondary(subInv))}</span>
                                </div>
                            ) : <div></div>}
                            <div className="flex flex-col md:items-end col-span-2 md:col-span-1 border-t border-white/5 md:border-t-0 pt-2 md:pt-0 mt-2 md:mt-0">
                                <span className={`text-lg font-bebas tracking-wide ${subRoi >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                    {subRoi >= 0 ? '+' : ''}{subRoi.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Grand Total Row */}
                    {totalAsset && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-5 bg-gradient-to-r from-[#D4AF37]/10 to-transparent items-center border-t border-[#D4AF37]/20">
                            <div className="col-span-2 md:col-span-1 text-[#D4AF37] font-bebas tracking-wide text-xl uppercase">
                                {totalAsset.name}
                            </div>
                            <div className="flex flex-col md:items-end">
                                <span className="text-[10px] uppercase text-[#D4AF37]/60 md:hidden mb-1">Total {primaryCurrency}</span>
                                <span className="text-base text-[#F5F5DC]/90 font-medium">{formatPrimary(toPrimary(totalAsset.gbp))}</span>
                            </div>
                            <div className="flex flex-col md:items-end">
                                <span className="text-[10px] uppercase text-[#D4AF37]/60 md:hidden mb-1">Total {secondaryCurrency}</span>
                                <span className="text-base text-[#D4AF37] font-medium">{formatSecondary(toSecondary(totalAsset.gbp))}</span>
                            </div>
                            {!hideInvestment ? (
                                <div className="flex flex-col md:items-end">
                                    <span className="text-[10px] uppercase text-[#D4AF37]/60 md:hidden mb-1">Total Invested</span>
                                    <span className="text-base text-[#D4AF37] font-medium">{formatSecondary(toSecondary(totalAsset.investmentGBP))}</span>
                                </div>
                            ) : <div></div>}
                            <div className="flex flex-col md:items-end col-span-2 md:col-span-1 border-t border-[#D4AF37]/20 md:border-t-0 pt-3 md:pt-0 mt-2 md:mt-0">
                                <span className={`text-2xl font-bebas tracking-widest ${totalAsset.roi >= 0 ? 'text-vu-green drop-shadow-[0_0_8px_rgba(74,222,128,0.4)]' : 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.4)]'}`}>
                                    {totalAsset.roi !== null && totalAsset.roi !== undefined ? (
                                        <>{totalAsset.roi >= 0 ? '+' : ''}{totalAsset.roi.toFixed(1)}%</>
                                    ) : '---'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
