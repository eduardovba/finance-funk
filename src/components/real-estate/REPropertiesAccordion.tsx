import React from 'react';
import _AssetCard from '../AssetCard';
const AssetCard = _AssetCard as any;
import { formatCurrency } from '@/lib/currency';
import type { PropertyData, PropertyDisplayData } from './types';

interface REPropertiesAccordionProps {
    activeProperties: PropertyData[];
    soldProperties: PropertyData[];
    newlyAddedProperties: string[];
    expandedAccordions: Record<string, boolean>;
    selectedAsset: any;
    BRL: number;
    getPropertyDisplayData: (prop: PropertyData) => PropertyDisplayData;
    toggleAccordion: (name: string) => void;
    setSelectedAsset: (asset: any) => void;
    setContextTab: (tab: string) => void;
    setRightPaneMode: (mode: string) => void;
}

export default function REPropertiesAccordion({
    activeProperties, soldProperties, newlyAddedProperties, expandedAccordions, selectedAsset,
    BRL, getPropertyDisplayData, toggleAccordion, setSelectedAsset, setContextTab, setRightPaneMode,
}: REPropertiesAccordionProps) {
    const allProps = [...activeProperties, ...soldProperties];
    const propToBRL = (amount: number, currency: string) => {
        if (currency === 'BRL') return amount;
        if (currency === 'GBP') return amount * BRL;
        return amount;
    };
    let totalVal = 0, totalCost = 0;
    allProps.forEach(p => {
        const d = getPropertyDisplayData(p);
        if (p.status !== 'Sold') {
            totalVal += propToBRL(p.mortgage ? d.equity : d.currentValue, p.currency);
            totalCost += propToBRL(d.investment, p.currency);
        }
    });
    const totalRealisedPnL = soldProperties.reduce((s, p) => s + propToBRL(getPropertyDisplayData(p).profitLoss, p.currency), 0);
    const totalPnL = totalVal - totalCost + totalRealisedPnL;
    const isOpen = expandedAccordions['Properties'];
    const currency = 'BRL';

    return (
        <div className="mb-4">
            <div
                onClick={() => toggleAccordion('Properties')}
                className="flex justify-between items-center mb-4 px-4 py-3 cursor-pointer bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] hover:bg-[#121418]/70 rounded-2xl transition-colors shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
            >
                <div className="flex items-center gap-3">
                    <span className="text-white/40 transform transition-transform duration-300 text-xs" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                    <div className="flex flex-col">
                        <h3 className="text-lg font-semibold text-white/90 m-0">Properties</h3>
                        <span className={`text-xs font-semibold mt-0.5 ${totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL, currency)}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <span className="text-xl font-bold text-white tracking-tight">{formatCurrency(totalVal, currency)}</span>
                        <span className="text-xs text-white/40 mt-0.5">Cost: {formatCurrency(totalCost, currency)}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setRightPaneMode('add-property'); }}
                        className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex items-center justify-center text-lg font-bold transition-colors shrink-0">+</button>
                </div>
            </div>

            {isOpen && (
                <>
                    {/* Mobile */}
                    <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {activeProperties.map(prop => {
                            const d = getPropertyDisplayData(prop);
                            const displayVal = prop.mortgage ? d.equity : d.currentValue;
                            const isNewProp = newlyAddedProperties.includes(prop.name);
                            return (
                                <div key={prop.id} className={`rounded-2xl transition-all duration-1000 ${isNewProp ? 'shadow-[0_0_25px_rgba(212,175,55,0.4)] ring-1 ring-[#D4AF37]/50' : ''}`}>
                                    <AssetCard
                                        title={prop.name}
                                        subtitle={prop.currency}
                                        value={formatCurrency(displayVal, prop.currency)}
                                        performance={`${d.profitLoss >= 0 ? '+' : ''}${formatCurrency(d.profitLoss, prop.currency)} (${d.roi.toFixed(1)}%)`}
                                        isPositive={d.profitLoss >= 0}
                                        icon="🏢"
                                        expandedContent={
                                            <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                                                <button onClick={(e: any) => { e.stopPropagation(); setSelectedAsset({ ...prop, type: 'property', displayData: d }); setContextTab('overview'); }}
                                                    className="flex-1 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-semibold transition-colors">
                                                    View Details
                                                </button>
                                            </div>
                                        }
                                    />
                                </div>
                            );
                        })}
                        {soldProperties.length > 0 && (
                            <div className="col-span-full bg-white/5 rounded-3xl p-4 border border-white/10">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs text-white/40 font-medium tracking-wide uppercase block">Realised P&L</span>
                                    <span className={`text-sm font-bold ${totalRealisedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {totalRealisedPnL >= 0 ? '+' : ''}{formatCurrency(totalRealisedPnL, currency)}
                                    </span>
                                </div>
                                {soldProperties.map(prop => {
                                    const d = getPropertyDisplayData(prop);
                                    return (
                                        <div key={prop.id} className="flex justify-between items-center py-2">
                                            <span className="text-sm text-white/70">{prop.name}</span>
                                            <span className={`text-sm font-bold ${d.profitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {d.profitLoss >= 0 ? '+' : ''}{formatCurrency(d.profitLoss, prop.currency)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Desktop */}
                    <div className="hidden lg:block">
                        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#121418]/50 backdrop-blur-lg shadow-[0_4px_16px_rgba(0,0,0,0.3)] divide-y divide-white/[0.04]">
                            {activeProperties.sort((a, b) => {
                                const aVal = getPropertyDisplayData(a);
                                const bVal = getPropertyDisplayData(b);
                                return (b.mortgage ? bVal.equity : bVal.currentValue) - (a.mortgage ? aVal.equity : aVal.currentValue);
                            }).map(prop => {
                                const d = getPropertyDisplayData(prop);
                                const displayVal = prop.mortgage ? d.equity : d.currentValue;
                                const isSelected = selectedAsset?.id === prop.id;
                                const isNewProp = newlyAddedProperties.includes(prop.name);
                                return (
                                    <div
                                        key={prop.id}
                                        onClick={() => { setSelectedAsset({ ...prop, type: 'property', displayData: d }); setContextTab('overview'); setRightPaneMode('default'); }}
                                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 group ${isSelected ? 'bg-white/[0.08] border-l-2 border-l-[#D4AF37]' : 'hover:bg-white/[0.04] border-l-2 border-l-transparent'} ${isNewProp ? 'shadow-[0_0_20px_rgba(212,175,55,0.3)] bg-[#D4AF37]/[0.05]' : ''}`}
                                    >
                                        <div className="w-9 h-9 min-w-[36px] rounded-full bg-emerald-500/20 flex items-center justify-center text-lg shrink-0">🏢</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-white/90 truncate leading-tight">{prop.name}</p>
                                            <p className="text-[0.75rem] text-white/40 mt-0.5 font-mono tabular-nums">
                                                {prop.currency} · <span className={`px-1.5 py-0.5 rounded text-[0.6875rem] uppercase font-bold ${prop.status === 'Sold' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-emerald-500/20 text-emerald-400'}`}>{prop.status}</span>
                                                {prop.mortgage && ' · Mortgage'}
                                                {prop.rental && ' · Rental'}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-bold text-white tracking-tight leading-tight">{formatCurrency(displayVal, prop.currency)}</p>
                                            <p className={`text-[0.75rem] mt-0.5 font-semibold ${d.profitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {d.profitLoss >= 0 ? '+' : ''}{formatCurrency(d.profitLoss, prop.currency)} ({d.roi >= 0 ? '+' : ''}{d.roi.toFixed(1)}%)
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {soldProperties.length > 0 && (
                            <div className="mt-4 bg-white/5 rounded-2xl p-4 border border-white/10">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs text-white/40 font-medium tracking-wide uppercase block">Realised P&L</span>
                                    <span className={`text-sm font-bold ${totalRealisedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {totalRealisedPnL >= 0 ? '+' : ''}{formatCurrency(totalRealisedPnL, currency)}
                                    </span>
                                </div>
                                <div className="overflow-hidden rounded-xl border border-white/5 bg-black/40 divide-y divide-white/[0.04]">
                                    {soldProperties.map(prop => {
                                        const d = getPropertyDisplayData(prop);
                                        const isSelected = selectedAsset?.id === prop.id;
                                        return (
                                            <div
                                                key={prop.id}
                                                onClick={() => { setSelectedAsset({ ...prop, type: 'property', displayData: d }); setContextTab('overview'); setRightPaneMode('default'); }}
                                                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 ${isSelected ? 'bg-white/[0.08] border-l-2 border-l-[#D4AF37]' : 'hover:bg-white/[0.04] border-l-2 border-l-transparent'}`}
                                            >
                                                <div className="w-9 h-9 min-w-[36px] rounded-full bg-yellow-500/20 flex items-center justify-center text-lg shrink-0">🏠</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-white/90 truncate">{prop.name}</p>
                                                    <p className="text-[0.75rem] text-white/40 mt-0.5"><span className="px-1.5 py-0.5 rounded text-[0.6875rem] uppercase font-bold bg-yellow-500/20 text-yellow-500">Sold</span></p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className={`text-sm font-bold ${d.profitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {d.profitLoss >= 0 ? '+' : ''}{formatCurrency(d.profitLoss, prop.currency)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
