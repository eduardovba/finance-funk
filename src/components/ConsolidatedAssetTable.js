import { formatCurrency } from "@/lib/currency";
import { usePortfolio } from '@/context/PortfolioContext';

export default function ConsolidatedAssetTable({ title, categoryId, assets, rates, hideInvestment = false, onNavigate }) {
    const { primaryCurrency, secondaryCurrency, toPrimary, toSecondary, formatPrimary, formatSecondary } = usePortfolio();

    const formatPrimaryNoDecimals = (val) => formatPrimary(val, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const formatSecondaryNoDecimals = (val) => formatSecondary(val, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

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
        <section className="mt-0 mb-6 bg-[#0D0814]/60 border border-[#D4AF37]/10 rounded-2xl p-4 md:p-5 shadow-2xl relative overflow-hidden">
            {/* Subtle background glow for the cluster */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent"></div>

            <div className="flex items-center mb-5">
                <div className="w-1 h-6 bg-[#D4AF37] rounded-full mr-3 shadow-[0_0_8px_rgba(212,175,55,0.5)]"></div>
                <h3 className="m-0 text-xl md:text-2xl text-[#D4AF37] font-normal font-bebas tracking-wide uppercase">
                    {title}
                </h3>
                <div className="h-px bg-gradient-to-r from-[#D4AF37]/30 to-transparent flex-grow ml-4"></div>
            </div>

            {/* Asset Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 font-space">
                {activeAssets.map((asset, index) => (
                    <div
                        key={index}
                        onClick={() => onNavigate && categoryId ? onNavigate(categoryId, asset.name) : null}
                        className={`bg-[#1A0F2E] border border-white/5 rounded-xl p-3 xl:p-4 shadow-lg shadow-black/40 flex flex-col justify-between
                                   transition-all duration-300 hover:bg-black/40 hover:border-[#D4AF37]/30 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(212,175,55,0.1)] group relative overflow-hidden ${onNavigate && categoryId ? 'cursor-pointer' : ''}`}
                    >
                        {/* Status glow indicator based on ROI */}
                        <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-[40px] -mr-8 -mt-8 opacity-10 transition-opacity duration-300 group-hover:opacity-25 ${asset.roi >= 0 ? 'bg-vu-green' : 'bg-red-400'}`}></div>

                        <div className="z-10 relative">
                            {/* Card Header */}
                            <h4 className="text-sm font-medium text-[#F5F5DC]/90 mb-3 border-b border-[#D4AF37]/10 pb-2 truncate pr-2" title={asset.name}>
                                {asset.name}
                            </h4>

                            {/* Card Body (Values) */}
                            <div className="flex flex-col gap-1.5 mb-3">
                                <div className="flex justify-end items-baseline gap-2">
                                    <span className="text-xs font-medium text-[#F5F5DC]/90 truncate">{formatPrimaryNoDecimals(toPrimary(asset.gbp))}</span>
                                </div>
                                <div className="flex justify-end items-baseline gap-2">
                                    <span className="text-xs font-medium text-[#F5F5DC]/70 truncate">{formatSecondaryNoDecimals(toSecondary(asset.gbp))}</span>
                                </div>

                            </div>
                        </div>

                        {/* Card Footer (ROI) */}
                        <div className="mt-auto pt-2.5 border-t border-white/5 flex justify-between items-center z-10 relative">
                            <span className="text-[9px] uppercase tracking-widest text-[#F5F5DC]/40">ROI</span>
                            <span className={`text-xl font-bebas tracking-wider ${asset.roi >= 0 ? 'text-vu-green drop-shadow-[0_0_4px_rgba(74,222,128,0.3)]' : 'text-red-400 drop-shadow-[0_0_4px_rgba(248,113,113,0.3)]'}`}>
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
                <div className="mt-4 bg-[#0D0814] border border-[#D4AF37]/20 rounded-xl overflow-hidden font-space">
                    {/* Current Holdings Subtotal */}
                    {realisedPnL && categoryId !== 'real-estate' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 border-b border-white/5 bg-white/5 items-center">
                            <div className="col-span-2 md:col-span-1 text-[#F5F5DC]/50 italic text-xs">
                                Current Holdings
                            </div>
                            <div className="flex flex-col md:items-end">
                                <span className="text-[9px] uppercase text-[#F5F5DC]/40 md:hidden mb-0.5">{primaryCurrency}</span>
                                <span className="text-xs text-[#F5F5DC]/80">{formatPrimaryNoDecimals(toPrimary(subGbp))}</span>
                            </div>
                            <div className="flex flex-col md:items-end">
                                <span className="text-[9px] uppercase text-[#F5F5DC]/40 md:hidden mb-0.5">{secondaryCurrency}</span>
                                <span className="text-xs text-[#F5F5DC]/60">{formatSecondaryNoDecimals(toSecondary(subGbp))}</span>
                            </div>
                            <div className="flex flex-col md:items-end col-span-2 md:col-span-1 border-t border-white/5 md:border-t-0 pt-1.5 md:pt-0 mt-1.5 md:mt-0">
                                <span className={`text-base font-bebas tracking-wide ${subRoi >= 0 ? 'text-vu-green' : 'text-red-400'}`}>
                                    {subRoi >= 0 ? '+' : ''}{subRoi.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Grand Total Row */}
                    {totalAsset && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 xl:p-4 bg-gradient-to-r from-[#D4AF37]/10 to-transparent items-center border-t border-[#D4AF37]/20">
                            <div className="col-span-2 md:col-span-1 text-[#D4AF37] font-bebas tracking-wide text-lg uppercase">
                                {totalAsset.name}
                            </div>
                            <div className="flex flex-col md:items-end">
                                <span className="text-[9px] uppercase text-[#D4AF37]/60 md:hidden mb-0.5">{primaryCurrency}</span>
                                <span className="text-sm text-[#F5F5DC]/90 font-medium">{formatPrimaryNoDecimals(toPrimary(totalAsset.gbp))}</span>
                            </div>
                            <div className="flex flex-col md:items-end">
                                <span className="text-[9px] uppercase text-[#D4AF37]/60 md:hidden mb-0.5">{secondaryCurrency}</span>
                                <span className="text-sm text-[#D4AF37] font-medium">{formatSecondaryNoDecimals(toSecondary(totalAsset.gbp))}</span>
                            </div>
                            <div className="flex flex-col md:items-end col-span-2 md:col-span-1 border-t border-[#D4AF37]/20 md:border-t-0 pt-2 md:pt-0 mt-1.5 md:mt-0">
                                <span className={`text-xl font-bebas tracking-widest ${totalAsset.roi >= 0 ? 'text-vu-green drop-shadow-[0_0_6px_rgba(74,222,128,0.4)]' : 'text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.4)]'}`}>
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
