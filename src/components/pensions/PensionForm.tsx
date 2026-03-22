import React from 'react';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/lib/currency';
import _AssetSearch from '../AssetSearch';
import _BrokerForm from '../BrokerForm';
const AssetSearch = _AssetSearch as any;
const BrokerForm = _BrokerForm as any;
import type { BuyData, SellData, PensionTransaction } from './types';

interface PensionFormProps {
    rightPaneMode: string;
    buyData: BuyData | null;
    sellData: SellData | null;
    editingTr: PensionTransaction | null;
    isFetchingPrice: boolean;
    searchTerm: string;
    setSearchTerm: (s: string) => void;
    setRightPaneMode: (m: string) => void;
    setBuyData: (fn: any) => void;
    setSellData: (fn: any) => void;
    setEditingTr: (tr: any) => void;
    handleBuyConfirm: () => void;
    handleSellConfirm: () => void;
    handleEditSave: () => void;
    handleEditChange: (field: string, value: any) => void;
    handleAssetSelect: (a: any) => void;
    handleVerifyScrape: () => void;
    updateBuyCalc: (field: string, value: string) => void;
    updateSellCalc: (field: string, value: string) => void;
    fetchBrokers: () => void;
}

export default function PensionForm({
    rightPaneMode, buyData, sellData, editingTr, isFetchingPrice,
    searchTerm, setSearchTerm, setRightPaneMode, setBuyData, setSellData, setEditingTr,
    handleBuyConfirm, handleSellConfirm, handleEditSave, handleEditChange,
    handleAssetSelect, handleVerifyScrape, updateBuyCalc, updateSellCalc, fetchBrokers
}: PensionFormProps) {

    if (rightPaneMode === 'buy-transaction' && buyData) {
        return (
            <div className="w-full h-full p-8 text-left relative flex flex-col z-10">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white">Add Pension Asset</h3>
                    <Button variant="ghost" size="sm" onClick={() => { setRightPaneMode('default'); setBuyData(null); }} className="rounded-full"><span className="text-sm font-bold">✕</span></Button>
                </div>

                <div className="flex bg-white/5 rounded-2xl p-1 mb-6">
                    {(['search', 'manual'] as const).map(p => (
                        <button
                            key={p}
                            onClick={() => setBuyData((prev: any) => ({ ...prev, buyPath: p }))}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all ${buyData.buyPath === p ? 'bg-[#D4AF37] text-[#1A0F2E] shadow-sm' : 'text-white/50 hover:text-white/80'}`}
                        >
                            {p === 'search' ? 'Search Asset' : 'URL Scraper'}
                        </button>
                    ))}
                </div>

                <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 pb-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">Broker</label>
                            <div className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/70 text-sm font-mono tabular-nums">{buyData.broker}</div>
                        </div>
                        <div>
                            <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">Currency</label>
                            <div className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/70 text-sm font-mono tabular-nums">{buyData.currency}</div>
                        </div>
                    </div>

                    {buyData.buyPath === 'search' ? (
                        <div>
                            <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">Search Asset (Ticker)</label>
                            {buyData.ticker ? (
                                <div className="w-full px-3 py-2.5 bg-white/5 border border-[#D4AF37]/50 rounded-xl flex justify-between items-center">
                                    <div>
                                        <span className="font-bold text-white mr-2">{buyData.ticker}</span>
                                        <span className="text-white/50 text-sm">{buyData.asset}</span>
                                    </div>
                                    <button onClick={() => setBuyData((prev: any) => ({ ...prev, ticker: '', asset: '' }))} className="text-rose-400 hover:text-rose-300">✕</button>
                                </div>
                            ) : (
                                <AssetSearch onSelect={handleAssetSelect} />
                            )}
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">Asset Name</label>
                                <input type="text" value={buyData.asset} onChange={e => setBuyData((prev: any) => ({ ...prev, asset: e.target.value }))}
                                    placeholder="e.g. Fidelity World Index"
                                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all" />
                            </div>
                            <div>
                                <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">Scraper URL</label>
                                <div className="flex gap-2">
                                    <input type="text" value={buyData.scraperUrl} onChange={e => setBuyData((prev: any) => ({ ...prev, scraperUrl: e.target.value, isVerified: false }))}
                                        placeholder="https://www.fidelity.co.uk/..."
                                        className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all" />
                                    <button
                                        onClick={handleVerifyScrape}
                                        disabled={!buyData.scraperUrl || isFetchingPrice}
                                        className={`px-4 rounded-xl text-xs font-semibold transition-all ${buyData.isVerified ? 'bg-[#D4AF37] text-[#1A0F2E]' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                        style={{ opacity: isFetchingPrice ? 0.7 : 1, cursor: buyData.scraperUrl ? 'pointer' : 'not-allowed' }}
                                    >
                                        {isFetchingPrice ? '...' : (buyData.isVerified ? 'Verified ✓' : 'Verify')}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">Date</label>
                            <input type="date" value={buyData.date} onChange={e => setBuyData((prev: any) => ({ ...prev, date: e.target.value }))}
                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all [color-scheme:dark]" />
                        </div>
                        <div>
                            <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">Ticker (Meta)</label>
                            <input type="text" value={buyData.ticker} readOnly={buyData.buyPath === 'search'}
                                onChange={e => setBuyData((prev: any) => ({ ...prev, ticker: e.target.value }))}
                                className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all ${buyData.buyPath === 'search' ? 'bg-white/[0.02] border-white/5 text-white/50' : 'bg-white/5 border-white/10 text-white'}`} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">Quantity</label>
                            <input type="number" value={buyData.qtyToBuy} onChange={e => updateBuyCalc('qtyToBuy', e.target.value)}
                                step="any" placeholder="0.00"
                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all font-mono tabular-nums" />
                        </div>
                        <div className="relative">
                            <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">Price / Share</label>
                            <input type="number" value={buyData.buyPricePerShare} onChange={e => updateBuyCalc('buyPricePerShare', e.target.value)}
                                step="any" placeholder="0.00"
                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all font-mono tabular-nums" />
                            {isFetchingPrice && <span className="absolute right-3 top-[34px] text-[0.75rem] text-[#D4AF37] uppercase tracking-wider font-semibold animate-pulse">Fetching...</span>}
                        </div>
                    </div>

                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 mt-2">
                        <label className="block mb-1 text-emerald-400/70 text-xs font-medium uppercase tracking-wider">Total Investment</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 font-mono tabular-nums">
                                {buyData.currency === 'BRL' ? 'R$' : (buyData.currency === 'USD' ? '$' : '£')}
                            </span>
                            <input type="number" value={buyData.totalInvestment} onChange={e => updateBuyCalc('totalInvestment', e.target.value)} step="any"
                                className="w-full py-2.5 pl-8 pr-3 bg-white/5 border border-emerald-500/30 rounded-xl text-white text-lg font-bold focus:outline-none focus:border-emerald-500 transition-all font-mono tabular-nums" />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                        <input type="checkbox" checked={buyData.isSalaryContribution || false} onChange={e => setBuyData((prev: any) => ({ ...prev, isSalaryContribution: e.target.checked }))}
                            id="buy-salary-contribution-pane" className="w-4 h-4 accent-[#D4AF37]" />
                        <label htmlFor="buy-salary-contribution-pane" className="text-white text-sm cursor-pointer">Funded by Salary Contribution</label>
                    </div>
                </div>

                <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-white/10 shrink-0">
                    <Button variant="secondary" onClick={() => { setRightPaneMode('default'); setBuyData(null); }}>Cancel</Button>
                    <Button variant="primary" onClick={handleBuyConfirm} disabled={!buyData.asset || !buyData.qtyToBuy || !buyData.buyPricePerShare}
                        className={(!buyData.asset || !buyData.qtyToBuy || !buyData.buyPricePerShare) ? 'opacity-50' : ''}>
                        Confirm Buy
                    </Button>
                </div>
            </div>
        );
    }

    if (rightPaneMode === 'sell-transaction' && sellData) {
        return (
            <div className="w-full h-full p-8 text-left relative flex flex-col z-10">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-rose-400">Sell {sellData.asset}</h3>
                    <Button variant="ghost" size="sm" onClick={() => { setRightPaneMode('default'); setSellData(null); }} className="rounded-full"><span className="text-sm font-bold">✕</span></Button>
                </div>
                <p className="mb-6 text-white/60 text-sm">
                    {sellData.broker} · {sellData.sharesHeld.toLocaleString(undefined, { maximumFractionDigits: 4 })} units held · Avg cost: <span className="font-mono tabular-nums text-white/80">{formatCurrency(sellData.avgCost, sellData.currency)}</span>
                </p>

                <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 pb-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">Date</label>
                            <input type="date" value={sellData.date} onChange={e => setSellData((prev: any) => ({ ...prev, date: e.target.value }))}
                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500/50 transition-all [color-scheme:dark]" />
                        </div>
                        <div>
                            <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">Currency</label>
                            <div className="w-full px-3 py-2.5 bg-white/[0.02] border border-white/5 rounded-xl text-white/50 text-sm font-mono tabular-nums">{sellData.currency}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">Quantity to Sell</label>
                            <input type="number" value={sellData.qtyToSell} onChange={e => updateSellCalc('qtyToSell', e.target.value)} step="any"
                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500/50 transition-all font-mono tabular-nums" />
                        </div>
                        <div>
                            <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">Sell Price / Share</label>
                            <input type="number" value={sellData.sellPricePerShare} onChange={e => updateSellCalc('sellPricePerShare', e.target.value)} step="any"
                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500/50 transition-all font-mono tabular-nums" />
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-5 mt-4 flex flex-col gap-4">
                        <div>
                            <label className="block mb-1 text-white/70 text-xs font-medium uppercase tracking-wider">Total Sale Value (Proceeds)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 font-mono tabular-nums">
                                    {sellData.currency === 'BRL' ? 'R$' : (sellData.currency === 'USD' ? '$' : '£')}
                                </span>
                                <input type="number" value={sellData.totalProceeds} onChange={e => updateSellCalc('totalProceeds', e.target.value)} step="any"
                                    className="w-full py-2.5 pl-8 pr-3 bg-white/5 border border-white/10 rounded-xl text-white text-lg font-bold focus:outline-none focus:border-rose-500/50 transition-all font-mono tabular-nums" />
                            </div>
                        </div>
                        <div className="flex justify-between items-center bg-white/5 rounded-lg p-3">
                            <span className="text-white/60 text-sm">Cost Basis</span>
                            <span className="text-white/80 font-mono tabular-nums text-sm">{formatCurrency((sellData.avgCost || 0) * (parseFloat(String(sellData.qtyToSell)) || 0), sellData.currency)}</span>
                        </div>
                        <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-lg p-3">
                            <span className="text-white text-sm font-bold">P&L</span>
                            <span className={`text-sm font-bold font-mono tabular-nums ${(sellData.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {(sellData.pnl || 0) >= 0 ? '+' : ''}{formatCurrency(sellData.pnl || 0, sellData.currency)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-white/10 shrink-0">
                    <Button variant="secondary" onClick={() => { setRightPaneMode('default'); setSellData(null); }}>Cancel</Button>
                    <Button variant="danger" onClick={handleSellConfirm}>Confirm Sell</Button>
                </div>
            </div>
        );
    }

    if (rightPaneMode === 'add-broker') {
        return (
            <div className="w-full h-full text-left relative flex flex-col z-10">
                <div className="flex justify-between items-center mb-6 p-8 pb-0">
                    <h3 className="text-lg font-bold text-white">Add Pension Provider</h3>
                    <Button variant="ghost" size="sm" onClick={() => setRightPaneMode('default')} className="rounded-full"><span className="text-sm font-bold">✕</span></Button>
                </div>
                <div className="flex-1 overflow-y-auto px-8 pb-8">
                    <BrokerForm assetClass="Pension" onSave={() => { setRightPaneMode('default'); fetchBrokers(); }} onCancel={() => setRightPaneMode('default')} />
                </div>
            </div>
        );
    }

    if (rightPaneMode === 'edit-transaction' && editingTr) {
        return (
            <div className="w-full h-full p-8 text-left relative flex flex-col z-10">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white">Edit Transaction</h3>
                    <Button variant="ghost" size="sm" onClick={() => { setRightPaneMode('default'); setEditingTr(null); }} className="rounded-full"><span className="text-sm font-bold">✕</span></Button>
                </div>
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 pb-4">
                    {([['date', 'Date'], ['asset', 'Asset'], ['broker', 'Broker'], ['value', 'Value (Cost/Proceeds)'], ['quantity', 'Quantity'], ['price', 'Price'], ['type', 'Type (Buy/Sell)']] as const).map(([field, label]) => (
                        <div key={field}>
                            <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">{label}</label>
                            <input type="text" value={(editingTr as any)[field] ?? ''} onChange={e => handleEditChange(field, e.target.value)}
                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all font-mono tabular-nums" />
                        </div>
                    ))}
                    <div className="flex items-center gap-2 mt-2">
                        <input type="checkbox" checked={editingTr.isSalaryContribution || false} onChange={e => handleEditChange('isSalaryContribution', e.target.checked)}
                            id="edit-salary-contribution-pane" className="w-4 h-4 accent-[#D4AF37]" />
                        <label htmlFor="edit-salary-contribution-pane" className="text-white text-sm cursor-pointer">Funded by Salary Contribution</label>
                    </div>
                </div>
                <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-white/10 shrink-0">
                    <Button variant="secondary" onClick={() => { setRightPaneMode('default'); setEditingTr(null); }}>Cancel</Button>
                    <Button variant="primary" onClick={handleEditSave}>Save</Button>
                </div>
            </div>
        );
    }

    // Default state — desktop search + select prompt
    return (
        <div className="p-8 pb-4 h-full flex flex-col items-center justify-center text-center relative z-10 space-y-8">
            <div className="w-full max-w-md relative">
                <input type="text" placeholder="Search holdings..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-12 text-white border-none focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all placeholder:text-white/30 backdrop-blur-md shadow-2xl" />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center -mt-16 w-full max-w-[280px] mx-auto opacity-60">
                <div className="w-20 h-20 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mb-6 ring-1 ring-[#D4AF37]/20 shadow-[0_0_30px_rgba(212,175,55,0.1)]">
                    <span className="text-3xl filter grayscale opacity-70">🛡️</span>
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight font-bebas tracking-widest mb-3">Select an Asset</h3>
                <p className="text-sm text-parchment/60 leading-relaxed max-w-[250px] mx-auto">
                    Click on any holding in your pension portfolio to view detailed metrics and transaction history.
                </p>
            </div>
        </div>
    );
}
