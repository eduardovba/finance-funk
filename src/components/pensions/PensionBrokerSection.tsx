import React from 'react';
import { formatCurrency } from '@/lib/currency';
import pensionMap from '../../data/pension_fund_map.json';
import _AssetCard from '../AssetCard';
import _AssetLogo from '../AssetLogo';
const AssetCard = _AssetCard as any;
const AssetLogo = _AssetLogo as any;


interface PensionBrokerSectionProps {
    brokerName: string;
    items: any[];
    brokerDict: Record<string, string>;
    lockedPnL: Record<string, number>;
    marketData: Record<string, any>;
    livePrices: Record<string, any>;
    rates: Record<string, number> | null;
    expandedBrokers: Record<string, boolean>;
    toggleBroker: (b: string) => void;
    newlyAddedBrokers: string[];
    explicitDbBrokers: string[];
    showEmptyBrokers: boolean;
    selectedAsset: any;
    setSelectedAsset: (a: any) => void;
    handleBuyClick: (h: any) => void;
    handleSellClick: (h: any) => void;
    handleNewBuyClick: (b: string) => void;
    handleDeleteBrokerClick: (b: string) => void;
}

const BASE_BROKER_CURRENCY: Record<string, string> = { 'Fidelity': 'GBP', 'Hargreaves Lansdown': 'GBP', 'Legal & General': 'GBP', 'OAB': 'GBP' };

export default function PensionBrokerSection({
    brokerName, items, brokerDict, lockedPnL, marketData, livePrices, rates,
    expandedBrokers, toggleBroker, newlyAddedBrokers, explicitDbBrokers, showEmptyBrokers,
    selectedAsset, setSelectedAsset, handleBuyClick, handleSellClick, handleNewBuyClick, handleDeleteBrokerClick
}: PensionBrokerSectionProps) {
    let rows = [...items];
    const isNewlyAdded = newlyAddedBrokers.includes(brokerName);
    if (!showEmptyBrokers && !isNewlyAdded && (items.length === 0 && (!lockedPnL[brokerName] || lockedPnL[brokerName] === 0))) return null;
    if (!rows.find(r => r.asset === 'Cash')) {
        rows.push({ asset: 'Cash', qty: 0, totalCost: 0, broker: brokerName, currentValue: 0, pnl: 0, roi: 0 } as any);
    }

    const cur = brokerDict[brokerName] || BASE_BROKER_CURRENCY[brokerName] || 'GBP';

    let totalCurrentValue = 0;
    let totalPurchasePrice = 0;

    rows = rows.map(h => {
        const mapItem = (pensionMap as any[]).find((m: any) => m.asset === h.asset);
        let livePrice: number | null = null;
        let priceCurrency = 'GBP';

        if (mapItem && mapItem.ticker && marketData[mapItem.ticker]) {
            livePrice = marketData[mapItem.ticker].price;
            priceCurrency = marketData[mapItem.ticker].currency || 'GBP';
        } else {
            const priceData = livePrices[h.asset];
            livePrice = priceData ? priceData.price : null;
            priceCurrency = priceData ? priceData.currency : 'GBP';
        }

        const brokerCur = brokerDict[brokerName] || BASE_BROKER_CURRENCY[brokerName] || 'GBP';
        if (livePrice && priceCurrency !== brokerCur) {
            if (priceCurrency === 'USD' && brokerCur === 'GBP') {
                const rate = (rates as any)?.['GBP-USD'] || 1.25;
                livePrice = livePrice / rate;
            }
        }

        const currentValue = livePrice ? livePrice * h.qty : h.totalCost;
        const pnl = currentValue - h.totalCost;
        const roi = h.totalCost !== 0 ? (pnl / h.totalCost * 100) : 0;
        const valuePerShare = h.qty !== 0 ? currentValue / h.qty : 0;

        totalCurrentValue += currentValue;
        totalPurchasePrice += h.totalCost;
        return { ...h, currentValue, pnl, roi, valuePerShare, livePrice };
    });

    rows.sort((a, b) => {
        if (a.asset === 'Cash') return -1;
        if (b.asset === 'Cash') return 1;
        return ((b as any).currentValue || 0) - ((a as any).currentValue || 0);
    });

    const totalPnL = totalCurrentValue - totalPurchasePrice + (lockedPnL[brokerName] || 0);
    const isOpen = expandedBrokers[brokerName] || isNewlyAdded;
    const glowClass = isNewlyAdded ? 'shadow-[0_0_25px_rgba(212,175,55,0.4)] border-[#D4AF37] ring-1 ring-[#D4AF37]/50' : '';

    return (
        <div key={brokerName} id={encodeURIComponent(brokerName)} className={`mb-8 rounded-2xl transition-all duration-1000 ${glowClass}`}>
            <div
                onClick={() => toggleBroker(brokerName)}
                className="flex justify-between items-center mb-4 px-4 py-3 cursor-pointer bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] hover:bg-[#121418]/70 rounded-2xl transition-colors shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
            >
                <div className="flex items-center gap-3">
                    <span className="text-white/40 transform transition-transform duration-300 text-xs" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                    <div className="flex flex-col">
                        <h3 className="text-lg font-semibold text-white/90 m-0">{brokerName}</h3>
                        <span className={`text-xs font-semibold mt-0.5 ${totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL, cur)} ({totalPurchasePrice !== 0 ? ((totalPnL / totalPurchasePrice * 100) >= 0 ? '+' : '') + (totalPnL / totalPurchasePrice * 100).toFixed(1) : '0.0'}%)
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <span className="text-xl font-bold text-white tracking-tight">{formatCurrency(totalCurrentValue, cur)}</span>
                        <span className="text-xs text-white/40 mt-0.5">Cost: {formatCurrency(totalPurchasePrice, cur)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {(explicitDbBrokers.includes(brokerName) || items.length === 0) && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteBrokerClick(brokerName); }}
                                className="w-8 h-8 rounded-full bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center transition-colors shrink-0 text-sm"
                                title="Delete Broker"
                            >🗑️</button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); handleNewBuyClick(brokerName); }}
                            className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex items-center justify-center text-lg font-bold transition-colors shrink-0"
                            title="Add Transaction"
                        >+</button>
                    </div>
                </div>
            </div>

            {isOpen && (
                <>
                    <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {rows.map((r: any) => {
                            const isCash = r.asset === 'Cash';
                            return (
                                <AssetCard
                                    key={r.asset}
                                    title={r.asset}
                                    subtitle={r.ticker || (isCash ? 'Liquid' : '-')}
                                    value={formatCurrency(r.currentValue, cur)}
                                    performance={isCash ? null : `${r.pnl >= 0 ? '+' : ''}${formatCurrency(r.pnl, cur)} (${(r.roi || 0).toFixed(1)}%)`}
                                    isPositive={r.pnl >= 0}
                                    icon={isCash ? '💵' : <AssetLogo ticker={r.ticker} name={r.asset} size={40} />}
                                    expandedContent={
                                        <div className="flex flex-col gap-3 py-2">
                                            <div className="grid grid-cols-2 gap-4">
                                                {!isCash && (
                                                    <div>
                                                        <span className="block text-xs text-white/40 mb-1">Shares Hosted</span>
                                                        <span className="text-sm font-medium text-white/90">{Math.abs(r.qty).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                                                    </div>
                                                )}
                                                {!isCash && (
                                                    <div>
                                                        <span className="block text-xs text-white/40 mb-1">Live Price</span>
                                                        <span className="text-sm font-medium text-white/90">{r.livePrice ? formatCurrency(r.livePrice, cur) : 'N/A'}</span>
                                                    </div>
                                                )}
                                                <div>
                                                    <span className="block text-xs text-white/40 mb-1">{isCash ? 'Deposits' : 'Purchase Price'}</span>
                                                    <span className="text-sm font-medium text-white/90">{formatCurrency(r.totalCost, cur)}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                                                <button onClick={(e) => { e.stopPropagation(); handleBuyClick(r); }} className="flex-1 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-semibold transition-colors">{isCash ? 'Deposit' : 'Buy'}</button>
                                                <button onClick={(e) => { e.stopPropagation(); handleSellClick(r); }} className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-sm font-semibold transition-colors">{isCash ? 'Withdraw' : 'Sell'}</button>
                                            </div>
                                        </div>
                                    }
                                />
                            );
                        })}
                        {lockedPnL[brokerName] && lockedPnL[brokerName] !== 0 && (
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col justify-center">
                                <span className="text-xs text-white/40 mb-1 font-medium tracking-wide uppercase">Realised P&L</span>
                                <span className={`text-lg font-bold ${lockedPnL[brokerName] >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {lockedPnL[brokerName] >= 0 ? '+' : ''}{formatCurrency(lockedPnL[brokerName], cur)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Desktop List View */}
                    <div className="hidden lg:block">
                        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#121418]/50 backdrop-blur-lg shadow-[0_4px_16px_rgba(0,0,0,0.3)] divide-y divide-white/[0.04]">
                            {rows.map((r: any) => {
                                const isCash = r.asset === 'Cash';
                                const isSelected = selectedAsset && selectedAsset.asset === r.asset;
                                const displayName = r.asset.length > 25 ? r.asset.substring(0, 24) + '…' : r.asset;

                                return (
                                    <div
                                        key={r.asset}
                                        onClick={() => setSelectedAsset({ ...r, brokerCurrency: cur })}
                                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 group ${isSelected
                                            ? 'bg-white/[0.08] border-l-2 border-l-[#D4AF37]'
                                            : 'hover:bg-white/[0.04] border-l-2 border-l-transparent'
                                            }`}
                                    >
                                        {isCash ? (
                                            <div className="w-9 h-9 min-w-[36px] rounded-full bg-emerald-500/20 flex items-center justify-center text-lg shrink-0">💵</div>
                                        ) : (
                                            <AssetLogo ticker={r.ticker} name={r.asset} size={36} />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-white/90 truncate leading-tight">{displayName}</p>
                                            <p className="text-data-xs text-white/40 mt-0.5 font-space ">
                                                {isCash ? 'Liquid' : `${Math.abs(r.qty).toLocaleString(undefined, { maximumFractionDigits: 4 })} shares${r.ticker ? ` · ${r.ticker}` : ''}`}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-bold text-white tracking-tight leading-tight">{formatCurrency(r.currentValue, cur)}</p>
                                            {!isCash && (
                                                <p className={`text-xs mt-0.5 font-semibold ${r.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {r.pnl >= 0 ? '+' : ''}{formatCurrency(r.pnl, cur)} ({r.roi >= 0 ? '+' : ''}{(r.roi || 0).toFixed(1)}%)
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {lockedPnL[brokerName] && lockedPnL[brokerName] !== 0 && (
                            <div className="mt-4 bg-white/5 rounded-2xl p-4 border border-white/10 flex justify-between items-center w-72">
                                <span className="text-xs text-white/40 font-medium tracking-wide uppercase">Realised P&L</span>
                                <span className={`text-sm font-bold ${lockedPnL[brokerName] >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {lockedPnL[brokerName] >= 0 ? '+' : ''}{formatCurrency(lockedPnL[brokerName], cur)}
                                </span>
                            </div>
                        )}
                    </div>
                </>
            )}

            {isOpen && items.length === 0 && !lockedPnL[brokerName] && (
                <div className="px-4 pb-4">
                    <div className="bg-white/[0.02] rounded-xl border border-white/5 p-6 text-center">
                        <p className="text-white/40 text-sm">No holdings in this broker yet.</p>
                        <button onClick={() => handleNewBuyClick(brokerName)}
                            className="mt-3 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm font-medium transition-colors text-white/70">
                            Add a Holding
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
