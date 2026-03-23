import React from 'react';
import _AssetCard from '../AssetCard';
const AssetCard = _AssetCard as any;
import { formatCurrency } from '@/lib/currency';
import type { FundHoldingComputed } from './types';

interface REFundAccordionProps {
    brokerName: string;
    fundHoldings: FundHoldingComputed[];
    expandedAccordions: Record<string, boolean>;
    selectedAsset: any;
    newlyAddedBrokers: string[];
    toggleAccordion: (name: string) => void;
    setSelectedAsset: (asset: any) => void;
    setRightPaneMode: (mode: string) => void;
    handleFundBuyClick: (f: any) => void;
    handleFundSellClick: (f: any) => void;
    handleNewFundBuyClick: (brokerName: string) => void;
    handleDeleteBrokerClick: (brokerName: string) => void;
}

export default function REFundAccordion({
    brokerName, fundHoldings, expandedAccordions, selectedAsset, newlyAddedBrokers,
    toggleAccordion, setSelectedAsset, setRightPaneMode,
    handleFundBuyClick, handleFundSellClick, handleNewFundBuyClick, handleDeleteBrokerClick,
}: REFundAccordionProps) {
    const brokerFunds = fundHoldings.filter(f => f.broker === brokerName).sort((a, b) => b.currentValue - a.currentValue);
    let totalVal = 0, totalCost = 0;
    brokerFunds.forEach(f => { totalVal += f.currentValue; totalCost += f.totalInvestment; });
    const bPnL = totalVal - totalCost;
    const bROI = totalCost !== 0 ? (bPnL / totalCost * 100) : 0;
    const isOpen = expandedAccordions[brokerName];

    return (
        <div className={`mb-4 rounded-2xl transition-all duration-1000 ${newlyAddedBrokers.includes(brokerName) ? 'shadow-[0_0_25px_rgba(212,175,55,0.4)] border-[#D4AF37] ring-1 ring-[#D4AF37]/50' : ''}`}>
            <div onClick={() => toggleAccordion(brokerName)}
                className="flex justify-between items-center mb-4 px-4 py-3 cursor-pointer bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] hover:bg-[#121418]/70 rounded-2xl transition-colors shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
                <div className="flex items-center gap-3">
                    <span className="text-white/40 transform transition-transform duration-300 text-xs" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                    <div className="flex flex-col">
                        <h3 className="text-lg font-semibold text-white/90 m-0">{brokerName}</h3>
                        <span className={`text-xs font-semibold mt-0.5 ${bPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {bPnL >= 0 ? '+' : ''}{formatCurrency(bPnL, 'BRL')} ({bROI >= 0 ? '+' : ''}{bROI.toFixed(1)}%)
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <span className="text-xl font-bold text-white tracking-tight">{formatCurrency(totalVal, 'BRL')}</span>
                        <span className="text-xs text-white/40 mt-0.5">Cost: {formatCurrency(totalCost, 'BRL')}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleNewFundBuyClick(brokerName); }}
                        className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex items-center justify-center text-lg font-bold transition-colors shrink-0">+</button>
                    {brokerFunds.length === 0 && (
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteBrokerClick(brokerName); }}
                            className="w-8 h-8 rounded-full bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center transition-colors shrink-0 text-sm"
                            title="Delete Broker">🗑️</button>
                    )}
                </div>
            </div>

            {isOpen && (
                <>
                    {brokerFunds.length === 0 ? (
                        <div className="p-6 text-center bg-white/[0.02] border border-white/5 rounded-xl">
                            <p className="text-sm text-white/40 mb-3">No fund holdings yet</p>
                            <button onClick={() => handleNewFundBuyClick(brokerName)}
                                className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-semibold transition-colors">
                                Buy First Fund
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Mobile */}
                            <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {brokerFunds.map(f => (
                                    <AssetCard key={f.ticker} title={f.fund}
                                        subtitle={`${f.totalQuantity} shares · ${formatCurrency(f.currentPrice, 'BRL')}/share`}
                                        value={formatCurrency(f.currentValue, 'BRL')}
                                        performance={`${f.pnl >= 0 ? '+' : ''}${formatCurrency(f.pnl, 'BRL')} (${f.roi.toFixed(1)}%)`}
                                        isPositive={f.pnl >= 0}
                                        icon={<div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">{f.ticker.slice(0, 2)}</div>}
                                        expandedContent={
                                            <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                                                <button onClick={(e: any) => { e.stopPropagation(); handleFundBuyClick(f); }} className="flex-1 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-semibold transition-colors">Buy</button>
                                                <button onClick={(e: any) => { e.stopPropagation(); handleFundSellClick(f); }} className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-sm font-semibold transition-colors">Sell</button>
                                            </div>
                                        }
                                    />
                                ))}
                            </div>
                            {/* Desktop */}
                            <div className="hidden lg:block">
                                <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#121418]/50 backdrop-blur-lg shadow-[0_4px_16px_rgba(0,0,0,0.3)] divide-y divide-white/[0.04]">
                                    {brokerFunds.map(f => {
                                        const isSelected = selectedAsset?.ticker === f.ticker && selectedAsset?.type === 'fund';
                                        return (
                                            <div key={f.ticker} onClick={() => { setSelectedAsset({ ...f, type: 'fund' }); setRightPaneMode('default'); }}
                                                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 group ${isSelected ? 'bg-white/[0.08] border-l-2 border-l-[#D4AF37]' : 'hover:bg-white/[0.04] border-l-2 border-l-transparent'}`}>
                                                <div className="w-9 h-9 min-w-[36px] rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0">{f.ticker.slice(0, 2)}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-white/90 truncate leading-tight">{f.fund}</p>
                                                    <p className="text-data-xs text-white/40 mt-0.5 font-space ">{f.totalQuantity} shares · {f.ticker}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-sm font-bold text-white tracking-tight leading-tight">{formatCurrency(f.currentValue, 'BRL')}</p>
                                                    <p className={`text-xs mt-0.5 font-semibold ${f.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {f.pnl >= 0 ? '+' : ''}{formatCurrency(f.pnl, 'BRL')} ({f.roi >= 0 ? '+' : ''}{f.roi.toFixed(1)}%)
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
