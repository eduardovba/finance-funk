import React from 'react';
import { formatCurrency } from '@/lib/currency';
import _AssetCard from '../AssetCard';
const AssetCard = _AssetCard as any;
import type { FixedIncomeHolding } from './types';

interface FIBrokerSectionProps {
    brokerName: string;
    items: FixedIncomeHolding[];
    cur: string;
    isOpen: boolean;
    isNewlyAdded: boolean;
    showEmptyBrokers: boolean;
    selectedAsset: any;
    explicitDbBrokers: string[];
    onToggle: () => void;
    onAddClick: (brokerName: string) => void;
    onDeleteBroker: (brokerName: string) => void;
    onUpdateClick: (item: FixedIncomeHolding) => void;
    onSelectAsset: (item: FixedIncomeHolding) => void;
}

export default function FIBrokerSection({
    brokerName, items, cur, isOpen, isNewlyAdded, showEmptyBrokers,
    selectedAsset, explicitDbBrokers,
    onToggle, onAddClick, onDeleteBroker, onUpdateClick, onSelectAsset
}: FIBrokerSectionProps) {
    if (!showEmptyBrokers && !isNewlyAdded && items.length === 0) return null;

    const totalValue = items.reduce((sum, i) => sum + i.currentValue, 0);
    const totalInv = items.reduce((sum, i) => sum + i.investment, 0);
    const totalInt = items.reduce((sum, i) => sum + i.interest, 0);
    const totalROI = Math.abs(totalInv) > 0.1 ? (totalInt / Math.abs(totalInv) * 100) : 0;

    const glowClass = isNewlyAdded ? 'shadow-[0_0_25px_rgba(212,175,55,0.4)] border-[#D4AF37] ring-1 ring-[#D4AF37]/50' : '';

    return (
        <div id={encodeURIComponent(brokerName)} className={`mb-8 rounded-2xl transition-all duration-1000 ${glowClass}`}>
            <div
                onClick={onToggle}
                className="flex justify-between items-center mb-4 px-4 py-3 cursor-pointer bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] hover:bg-[#121418]/70 rounded-2xl transition-colors shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
            >
                <div className="flex items-center gap-3">
                    <span className="text-white/40 transform transition-transform duration-300 text-xs" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                    <div className="flex flex-col">
                        <h3 className="text-lg font-semibold text-white/90 m-0">{brokerName}</h3>
                        <span className={`text-xs font-semibold mt-0.5 ${totalInt >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {totalInt >= 0 ? '+' : ''}{formatCurrency(totalInt, cur)} ({totalROI >= 0 ? '+' : ''}{totalROI.toFixed(1)}%)
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <span className="text-xl font-bold text-white tracking-tight">{formatCurrency(totalValue, cur)}</span>
                        <span className="text-xs text-white/40 mt-0.5">Principal: {formatCurrency(totalInv, cur)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        {(explicitDbBrokers.includes(brokerName) || items.length === 0) && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDeleteBroker(brokerName); }}
                                className="w-8 h-8 rounded-full bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center transition-colors shrink-0 text-sm"
                                title="Delete Broker"
                            >
                                🗑️
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); onAddClick(brokerName); }}
                            className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex items-center justify-center text-lg font-bold transition-colors shrink-0"
                            title="Add Transaction"
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>

            {isOpen && items.length > 0 && (
                <>
                    {/* Mobile & Tablet Card Grid View */}
                    <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {items.map(item => (
                            <AssetCard
                                key={item.name}
                                title={item.name}
                                subtitle={item.broker}
                                value={formatCurrency(item.currentValue, cur)}
                                performance={`${item.interest >= 0 ? '+' : ''}${formatCurrency(item.interest, cur)} (${item.roi >= 0 ? '+' : ''}${item.roi.toFixed(1)}%)`}
                                isPositive={item.interest >= 0}
                                icon={item.name.substring(0, 1)}
                                expandedContent={
                                    <div className="flex flex-col gap-3 py-2">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <span className="block text-xs text-white/40 mb-1">Principal</span>
                                                <span className="text-sm font-medium text-white/90">{formatCurrency(item.investment, cur)}</span>
                                            </div>
                                            <div>
                                                <span className="block text-xs text-white/40 mb-1">Accrued Interest</span>
                                                <span className="text-sm font-medium text-[#10b981]">{formatCurrency(item.interest, cur)}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onUpdateClick(item); }}
                                                className="flex-1 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-semibold transition-colors"
                                            >
                                                Update Value
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onAddClick(brokerName); }}
                                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-sm font-semibold transition-colors"
                                            >
                                                Add Transaction
                                            </button>
                                        </div>
                                    </div>
                                }
                            />
                        ))}
                    </div>

                    {/* Desktop List View — Trading 212 Style */}
                    <div className="hidden lg:block">
                        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#121418]/50 backdrop-blur-lg shadow-[0_4px_16px_rgba(0,0,0,0.3)] divide-y divide-white/[0.04]">
                            {items.map(item => {
                                const isSelected = selectedAsset && selectedAsset.name === item.name;
                                const displayName = item.name.length > 25 ? item.name.substring(0, 24) + '…' : item.name;

                                return (
                                    <div
                                        key={item.name}
                                        onClick={() => onSelectAsset(item)}
                                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 group ${isSelected
                                            ? 'bg-white/[0.08] border-l-2 border-l-[#D4AF37]'
                                            : 'hover:bg-white/[0.04] border-l-2 border-l-transparent'
                                            }`}
                                    >
                                        {/* Icon */}
                                        <div className="w-9 h-9 min-w-[36px] rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-400 shrink-0">
                                            {item.name.substring(0, 2)}
                                        </div>

                                        {/* Name & Subtitle */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-white/90 truncate leading-tight">{displayName}</p>
                                            <p className="text-[0.75rem] text-white/40 mt-0.5 font-mono tabular-nums">
                                                Principal: {formatCurrency(item.investment, cur)}
                                            </p>
                                        </div>

                                        {/* Value & Interest */}
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-bold text-white tracking-tight leading-tight">{formatCurrency(item.currentValue, cur)}</p>
                                            <p className={`text-[0.75rem] mt-0.5 font-semibold ${item.interest >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {item.interest >= 0 ? '+' : ''}{formatCurrency(item.interest, cur)} ({item.roi >= 0 ? '+' : ''}{item.roi.toFixed(1)}%)
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {isOpen && items.length === 0 && (
                <div className="px-4 pb-4">
                    <div className="bg-white/[0.02] rounded-xl border border-white/5 p-6 text-center">
                        <p className="text-white/40 text-sm">No holdings in this broker yet.</p>
                        <button onClick={() => onAddClick(brokerName)}
                            className="mt-3 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm font-medium transition-colors text-white/70">
                            Add a Transaction
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
