import React from 'react';
import { Button } from '@/components/ui';
import { formatCurrency, SUPPORTED_CURRENCIES } from '@/lib/currency';
import { X } from 'lucide-react';
import _AssetSearch from '../AssetSearch';
import _CurrencySelector from '../CurrencySelector';
import _BrokerForm from '../BrokerForm';
import _NumberInput from '../NumberInput';
const AssetSearch = _AssetSearch as any;
const CurrencySelector = _CurrencySelector as any;
const BrokerForm = _BrokerForm as any;
const NumberInput = _NumberInput as any;

import { BROKER_CURRENCY } from './useEquity';

interface EquityFormProps {
    rightPaneMode: string;
    buyData: any;
    sellData: any;
    editingTr: any;
    isFetchingPrice: boolean;
    searchTerm: string;
    brokers: string[];
    brokerDict: Record<string, string>;
    marketData: Record<string, any>;
    rates: Record<string, number> | null;
    isSellModalOpen: boolean;
    setSearchTerm: (v: string) => void;
    setRightPaneMode: (v: string) => void;
    setBuyData: (fn: any) => void;
    setSellData: (fn: any) => void;
    setEditingTr: (fn: any) => void;
    setIsFetchingPrice: (v: boolean) => void;
    setIsSellModalOpen: (v: boolean) => void;
    handleBuyConfirm: () => void;
    handleSellConfirm: () => void;
    handleEditSave: () => void;
    handleEditChange: (field: string, value: any) => void;
    updateBuyCalc: (field: string, value: string) => void;
    updateSellCalc: (field: string, value: string) => void;
    fetchBrokers: () => void;
}

export default function EquityForm({
    rightPaneMode, buyData, sellData, editingTr, isFetchingPrice, searchTerm, brokers, brokerDict, marketData, rates, isSellModalOpen,
    setSearchTerm, setRightPaneMode, setBuyData, setSellData, setEditingTr, setIsFetchingPrice, setIsSellModalOpen,
    handleBuyConfirm, handleSellConfirm, handleEditSave, handleEditChange, updateBuyCalc, updateSellCalc, fetchBrokers
}: EquityFormProps) {

    const renderBuyAssetForm = () => {
        if (!buyData) return null;
        return (
            <div className="w-full h-full p-6 text-left relative flex flex-col z-10 overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h3 className="font-bebas text-xl tracking-widest text-[#D4AF37] uppercase">
                        {buyData.asset ? `Buy More ${buyData.asset}` : 'New Purchase'}
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => setRightPaneMode('default')} className="rounded-full ml-auto"><X size={16} /></Button>
                </div>

                <div className="flex flex-col gap-5 flex-1 pb-4">
                    {/* Broker & Currency */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block text-white/60 text-xs mb-1">Broker</label>
                            <select
                                value={buyData.broker}
                                onChange={e => setBuyData((prev: any) => ({ ...prev, broker: e.target.value, currency: BROKER_CURRENCY[e.target.value] || 'GBP' }))}
                                className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#D4AF37]/50"
                            >
                                <option value="">Select Broker...</option>
                                {brokers.map(b => (<option key={b} value={b} className="bg-neutral-900">{b}</option>))}
                            </select>
                        </div>
                        <div className="w-full sm:w-28 shrink-0">
                            <label className="block text-white/60 text-xs mb-1">Currency</label>
                            <CurrencySelector value={buyData.currency} onChange={(val: string) => setBuyData((prev: any) => ({ ...prev, currency: val }))} />
                        </div>
                    </div>

                    {/* Date & Asset */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block text-white/60 text-xs mb-1">Date</label>
                            <input type="date" value={buyData.date} onChange={e => setBuyData((prev: any) => ({ ...prev, date: e.target.value }))}
                                className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#D4AF37]/50" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <label className="block text-white/60 text-xs mb-1">Asset</label>
                            {buyData.ticker ? (
                                <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between gap-3 overflow-hidden">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="font-semibold text-[#D4AF37] text-sm shrink-0">{buyData.ticker}</span>
                                        <span className="text-white/60 text-xs truncate">{buyData.asset}</span>
                                    </div>
                                    <button onClick={() => setBuyData((prev: any) => ({ ...prev, ticker: '', asset: '' }))} className="text-white/40 hover:text-white transition-colors shrink-0"><X size={14} /></button>
                                </div>
                            ) : (
                                <AssetSearch onSelect={async (selectedAsset: any) => {
                                    setIsFetchingPrice(true);
                                    const destCurrency = BROKER_CURRENCY[buyData.broker] || 'GBP';
                                    let lp = marketData[selectedAsset.symbol]?.price;
                                    let sourceCurrency = marketData[selectedAsset.symbol]?.currency || 'USD';

                                    try {
                                        if (!lp || !marketData[selectedAsset.symbol]?.currency) {
                                            const res = await fetch('/api/market-data', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ tickers: [selectedAsset.symbol] })
                                            });
                                            const data = await res.json();
                                            if (data[selectedAsset.symbol]?.price) {
                                                lp = data[selectedAsset.symbol].price;
                                                sourceCurrency = data[selectedAsset.symbol].currency || 'USD';
                                            }
                                        }

                                        let finalPrice: any = lp || '';
                                        if (lp && sourceCurrency !== destCurrency && rates) {
                                            const sourceRate = (rates as any)[sourceCurrency] || 1;
                                            const destRate = (rates as any)[destCurrency] || 1;
                                            finalPrice = (parseFloat(lp) / sourceRate) * destRate;
                                        }

                                        setBuyData((prev: any) => ({
                                            ...prev,
                                            asset: selectedAsset.name,
                                            ticker: selectedAsset.symbol,
                                            buyPricePerShare: finalPrice,
                                            totalInvestment: finalPrice ? (parseFloat(prev.qtyToBuy) || 0) * finalPrice : 0,
                                        }));
                                    } catch (e) {
                                        console.error('Failed to fetch/convert price:', e);
                                    } finally {
                                        setIsFetchingPrice(false);
                                    }
                                }} />
                            )}
                            {isFetchingPrice && (
                                <div className="text-xs text-[#D4AF37] mt-1.5 flex items-center gap-1.5 font-medium">
                                    <span className="animate-spin text-[0.75rem]">⏳</span> Fetching price...
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Qty & Price */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block text-white/60 text-xs mb-1">Quantity</label>
                            <input type="number" value={buyData.qtyToBuy} onChange={e => updateBuyCalc('qtyToBuy', e.target.value)}
                                placeholder="0" step="any"
                                className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#D4AF37]/50" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-white/60 text-xs mb-1">Price / Share ({(SUPPORTED_CURRENCIES as any)[buyData.currency]?.symbol || buyData.currency})</label>
                            <input type="number" value={buyData.buyPricePerShare} onChange={e => updateBuyCalc('buyPricePerShare', e.target.value)}
                                placeholder="0.00" step="any"
                                className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#D4AF37]/50" />
                        </div>
                    </div>

                    {/* Salary Contribution */}
                    <div className="flex items-center gap-2.5 pt-1">
                        <div className="relative flex items-center">
                            <input type="checkbox" checked={buyData.isSalaryContribution || false}
                                onChange={e => setBuyData((prev: any) => ({ ...prev, isSalaryContribution: e.target.checked }))}
                                id="buy-salary-contribution"
                                className="w-4 h-4 rounded appearance-none border border-white/20 bg-white/5 checked:bg-emerald-500/20 checked:border-emerald-500/50 transition-colors cursor-pointer" />
                            {buyData.isSalaryContribution && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-emerald-400">
                                    <svg viewBox="0 0 14 14" fill="none" className="w-2.5 h-2.5">
                                        <path d="M3 7.5L5.5 10L11 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <label htmlFor="buy-salary-contribution" className="text-white/80 text-xs font-medium cursor-pointer select-none">Funded by Salary</label>
                    </div>

                    {/* Total Investment */}
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 mt-2">
                        <label className="block text-emerald-500/80 text-xs font-semibold uppercase tracking-wider mb-2">Total Amount</label>
                        <div className="relative flex items-center">
                            <span className="absolute left-3 text-emerald-400 font-bold">
                                {buyData.currency === 'BRL' ? 'R$' : (buyData.currency === 'USD' ? '$' : '£')}
                            </span>
                            <input type="number" value={buyData.totalInvestment} onChange={e => updateBuyCalc('totalInvestment', e.target.value)}
                                step="any" className="w-full py-2.5 pl-8 pr-3 bg-white/5 border border-emerald-500/30 rounded-lg text-emerald-50 text-base font-bold outline-none focus:border-emerald-500" />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 mt-4 shrink-0 pt-2 border-t border-white/5">
                        <Button variant="secondary" className="flex-1" type="button" onClick={() => setRightPaneMode('default')}>Cancel</Button>
                        <Button variant="primary" className="flex-1" type="button" onClick={handleBuyConfirm}>Confirm</Button>
                    </div>
                </div>
            </div>
        );
    };

    const renderEmptyState = () => {
        if (rightPaneMode === 'add-broker') {
            return (
                <div className="w-full h-full p-8 text-left relative flex flex-col z-10">
                    <div className="flex justify-between items-center mb-6">
                        <Button variant="ghost" size="sm" onClick={() => setRightPaneMode('default')} className="rounded-full ml-auto"><X size={16} /></Button>
                    </div>
                    <div className="flex-1">
                        <BrokerForm assetClass="Equity" onSave={() => { setRightPaneMode('default'); fetchBrokers(); }} onCancel={() => setRightPaneMode('default')} />
                    </div>
                </div>
            );
        }
        if (rightPaneMode === 'buy-transaction') {
            return renderBuyAssetForm();
        }
        if (rightPaneMode === 'sell-transaction' && sellData) {
            return renderSellForm();
        }
        if (rightPaneMode === 'edit-transaction' && editingTr) {
            return (
                <div className="w-full h-full p-8 text-left relative flex flex-col z-10">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white">Edit Transaction</h3>
                        <Button variant="ghost" size="sm" onClick={() => { setRightPaneMode('default'); setEditingTr(null); }} className="rounded-full"><X size={16} /></Button>
                    </div>
                    <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
                        {[['date', 'Date'], ['asset', 'Asset'], ['broker', 'Broker'], ['investment', 'Investment'], ['quantity', 'Quantity'], ['costPerShare', 'Cost/Share'], ['currency', 'Currency'], ['pnl', 'P&L'], ['roiPercent', 'ROI %']].map(([field, label]) => (
                            <div key={field}>
                                <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">{label}</label>
                                {field === 'currency' ? (
                                    <CurrencySelector value={editingTr.currency} onChange={(val: string) => handleEditChange('currency', val)} />
                                ) : (
                                    <input type="text" value={editingTr[field] ?? ''}
                                        onChange={e => handleEditChange(field, e.target.value)}
                                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all" />
                                )}
                            </div>
                        ))}
                        <div className="flex items-center gap-2 mt-2">
                            <input type="checkbox" checked={editingTr.isSalaryContribution || false}
                                onChange={e => handleEditChange('isSalaryContribution', e.target.checked)}
                                id="eq-edit-salary-contribution-pane" className="w-4 h-4 accent-[#D4AF37]" />
                            <label htmlFor="eq-edit-salary-contribution-pane" className="text-white text-sm cursor-pointer">Funded by Salary Contribution</label>
                        </div>
                    </div>
                    <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-white/10">
                        <Button variant="secondary" onClick={() => { setRightPaneMode('default'); setEditingTr(null); }}>Cancel</Button>
                        <Button variant="primary" onClick={handleEditSave}>Save</Button>
                    </div>
                </div>
            );
        }

        return (
            <div className="p-8 pb-4 h-full flex flex-col items-center justify-center text-center relative z-10 space-y-8">
                <div className="w-full max-w-md relative">
                    <input type="text" placeholder="Search holdings..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-12 text-white border-none focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all placeholder:text-white/30 backdrop-blur-md shadow-2xl" />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center -mt-16 w-full max-w-[280px] mx-auto opacity-60">
                    <div className="w-20 h-20 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mb-6 ring-1 ring-[#D4AF37]/20 shadow-[0_0_30px_rgba(212,175,55,0.1)]">
                        <span className="text-3xl filter grayscale opacity-70">📈</span>
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight font-bebas tracking-widest mb-3">Select an Asset</h3>
                    <p className="text-sm text-parchment/60 leading-relaxed max-w-[250px] mx-auto">
                        Click on any holding in your active portfolio to view detailed metrics and transition history.
                    </p>
                </div>
            </div>
        );
    };

    const renderSellForm = () => {
        if (!sellData) return null;
        return (
            <div className="w-full h-full p-6 text-left relative flex flex-col z-10 overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h3 className="font-bebas text-xl tracking-widest text-rose-400 uppercase">Sell {sellData.asset}</h3>
                    <Button variant="ghost" size="sm" onClick={() => { setRightPaneMode('default'); setSellData(null); }} className="rounded-full ml-auto"><X size={16} /></Button>
                </div>
                <p className="mb-6 text-white/60 text-sm">
                    {sellData.broker} · {sellData.sharesHeld.toLocaleString(undefined, { maximumFractionDigits: 4 })} shares held · Avg cost: <span className="font-mono tabular-nums text-white/80">{formatCurrency(sellData.avgCost, sellData.currency)}</span>
                </p>

                <div className="flex flex-col gap-5 flex-1 pb-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block text-white/60 text-xs mb-1">Date</label>
                            <input type="date" value={sellData.date} onChange={e => setSellData((prev: any) => ({ ...prev, date: e.target.value }))}
                                className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-rose-500/50 [color-scheme:dark]" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-white/60 text-xs mb-1">Currency</label>
                            <div className="w-full p-2.5 bg-white/[0.02] border border-white/5 rounded-xl text-white/50 text-sm font-mono tabular-nums">{sellData.currency}</div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block text-white/60 text-xs mb-1">Quantity to Sell</label>
                            <input type="number" value={sellData.qtyToSell} onChange={e => updateSellCalc('qtyToSell', e.target.value)}
                                max={sellData.sharesHeld} step="any"
                                className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-rose-500/50 font-mono tabular-nums" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-white/60 text-xs mb-1">Sell Price / Share</label>
                            <input type="number" value={sellData.sellPricePerShare} onChange={e => updateSellCalc('sellPricePerShare', e.target.value)}
                                step="any"
                                className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-rose-500/50 font-mono tabular-nums" />
                        </div>
                    </div>

                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 mt-2 flex flex-col gap-4">
                        <div>
                            <label className="block mb-1 text-white/70 text-xs font-medium uppercase tracking-wider">Total Sale Value (Proceeds)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 font-mono tabular-nums">
                                    {sellData.currency === 'BRL' ? 'R$' : (sellData.currency === 'USD' ? '$' : '£')}
                                </span>
                                <input type="number" value={sellData.totalProceeds} onChange={e => updateSellCalc('totalProceeds', e.target.value)}
                                    step="any" className="w-full py-2.5 pl-8 pr-3 bg-white/5 border border-rose-500/30 rounded-lg text-white text-base font-bold outline-none focus:border-rose-500 transition-all font-mono tabular-nums" />
                            </div>
                        </div>
                        <div className="flex justify-between items-center bg-white/5 rounded-lg p-3">
                            <span className="text-white/60 text-sm">Cost Basis</span>
                            <span className="text-white/80 font-mono tabular-nums text-sm">{formatCurrency(sellData.avgCost * (parseFloat(sellData.qtyToSell) || 0), sellData.currency)}</span>
                        </div>
                        <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-lg p-3">
                            <span className="text-white text-sm font-bold">P&L</span>
                            <span className={`text-sm font-bold font-mono tabular-nums ${sellData.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {sellData.pnl >= 0 ? '+' : ''}{formatCurrency(sellData.pnl, sellData.currency)} ({sellData.roi >= 0 ? '+' : ''}{sellData.roi.toFixed(1)}%)
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 mt-4 shrink-0 pt-2 border-t border-white/5">
                        <Button variant="secondary" className="flex-1" type="button" onClick={() => { setRightPaneMode('default'); setSellData(null); }}>Cancel</Button>
                        <Button variant="danger" className="flex-1" type="button" onClick={handleSellConfirm}>Confirm Sale</Button>
                    </div>
                </div>
            </div>
        );
    };

    return { renderEmptyState };
}
