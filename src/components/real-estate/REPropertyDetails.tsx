import React from 'react';
import _TransactionTimeline from '../TransactionTimeline';
import _NumberInput from '../NumberInput';
const TransactionTimeline = _TransactionTimeline as any;
const NumberInput = _NumberInput as any;
import { formatCurrency } from '@/lib/currency';
import { X } from 'lucide-react';
import type { PropertyDisplayData } from './types';

interface REPropertyDetailsProps {
    asset: any;
    contextTab: string;
    setContextTab: (tab: string) => void;
    rightPaneMode: string;
    setRightPaneMode: (mode: string) => void;
    enabledTabs: Record<string, boolean>;
    toggleEnabledTab: (id: string, tab: string) => void;
    editingValues: any;
    setEditingValues: (v: any) => void;
    sellPropertyData: any;
    setSellPropertyData: (v: any) => void;
    mortgageFormData: any;
    setMortgageFormData: (fn: any) => void;
    mortgageSetupData: any;
    setMortgageSetupData: (fn: any) => void;
    rentalFormData: any;
    setRentalFormData: (fn: any) => void;
    airbnbSortConfig: { key: string; direction: string };
    getPropertyDisplayData: (prop: any) => PropertyDisplayData;
    handleSavePropertyValues: () => void;
    handleAddMortgagePayment: () => void;
    handleSetupMortgage: () => void;
    handleAddRentalEntry: () => void;
    handleAirbnbSort: (key: string) => void;
    handleDeleteEntry: (id: any) => void;
    handleEditTransaction: (tr: any) => void;
    setDeleteTarget: (t: any) => void;
    setIsDeleteModalOpen: (v: boolean) => void;
    setSelectedAsset: (v: any) => void;
    onRefresh?: () => void;
}

export default function REPropertyDetails(props: REPropertyDetailsProps) {
    const {
        asset, contextTab, setContextTab, rightPaneMode, setRightPaneMode,
        enabledTabs, toggleEnabledTab, editingValues, setEditingValues,
        sellPropertyData, setSellPropertyData, mortgageFormData, setMortgageFormData,
        mortgageSetupData, setMortgageSetupData, rentalFormData, setRentalFormData,
        airbnbSortConfig, getPropertyDisplayData,
        handleSavePropertyValues, handleAddMortgagePayment, handleSetupMortgage,
        handleAddRentalEntry, handleAirbnbSort, handleDeleteEntry, handleEditTransaction,
        setDeleteTarget, setIsDeleteModalOpen, setSelectedAsset, onRefresh,
    } = props;

    const d = asset.displayData || getPropertyDisplayData(asset);

    // --- Tab Bar ---
    const renderTabBar = () => {
        const hasMortgageData = !!(asset.mortgage && (asset.mortgage.originalAmount > 0 || (asset.mortgage.ledger && asset.mortgage.ledger.length > 0)));
        const hasRentalData = !!(asset.rental && asset.rental.ledger && asset.rental.ledger.length > 0);
        const hasMortgage = hasMortgageData || enabledTabs[`${asset.id}-mortgage`];
        const hasRental = hasRentalData || enabledTabs[`${asset.id}-rental`];

        const allTabs = [
            { key: 'overview', label: 'Overview', icon: '📊', enabled: true, hasData: true },
            { key: 'mortgage', label: 'Mortgage', icon: '🏦', enabled: hasMortgage, hasData: hasMortgageData },
            { key: 'rental', label: 'Rental', icon: '🏠', enabled: hasRental, hasData: hasRentalData },
        ];

        const handleTabClick = (tab: any) => {
            if (!tab.enabled) { toggleEnabledTab(asset.id, tab.key); setContextTab(tab.key); }
            else { setContextTab(tab.key); }
        };

        return (
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '3px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                {allTabs.map(t => {
                    const isActive = contextTab === t.key;
                    return (
                        <button key={t.key} onClick={() => handleTabClick(t)} style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            padding: '8px 4px', borderRadius: '11px', border: 'none', cursor: 'pointer',
                            fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' as const,
                            transition: 'all 0.2s ease', position: 'relative' as const,
                            background: isActive ? (t.hasData ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08))' : 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.08))') : 'transparent',
                            color: isActive ? (t.hasData ? '#34d399' : '#D4AF37') : t.hasData ? 'rgba(255,255,255,0.55)' : t.enabled ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.2)',
                            boxShadow: isActive ? (t.hasData ? '0 1px 8px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.05)' : '0 1px 8px rgba(212,175,55,0.1), inset 0 1px 0 rgba(255,255,255,0.05)') : 'none',
                            opacity: !t.enabled ? 0.5 : 1,
                        }}>
                            <span style={{ fontSize: '0.85rem', lineHeight: 1, filter: !t.enabled ? 'grayscale(1)' : 'none' }}>{t.icon}</span>
                            <span>{t.label}</span>
                            {!t.enabled && <span style={{ fontSize: '0.65rem', opacity: 0.5, marginLeft: '-2px' }}>+</span>}
                            {t.hasData && !isActive && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: t.key === 'mortgage' ? '#D4AF37' : '#10b981', position: 'absolute' as const, top: '6px', right: '8px' }} />}
                        </button>
                    );
                })}
            </div>
        );
    };

    // --- Overview Tab ---
    const renderOverview = () => {
        const isSold = asset.status === 'Sold';
        return (
            <>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                        <span className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">{isSold ? 'Sale Price' : (asset.mortgage ? 'Property Value' : 'Current Value')}</span>
                        <span className="text-data-sm font-medium text-white/90 font-space ">{formatCurrency(isSold ? (asset.salePrice || 0) : d.currentValue, asset.currency)}</span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                        <span className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">Investment</span>
                        <span className="text-data-sm font-medium text-white/90 font-space ">{formatCurrency(d.investment, asset.currency)}</span>
                    </div>
                    {d.taxes > 0 && (
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                            <span className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">Taxes & Fees</span>
                            <span className="text-data-sm font-medium text-white/90 font-space ">{formatCurrency(d.taxes, asset.currency)}</span>
                        </div>
                    )}
                    {asset.mortgage && (
                        <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl p-3">
                            <span className="block text-xs text-[#D4AF37]/60 uppercase tracking-widest mb-1.5">Equity</span>
                            <span className="text-data-sm font-bold text-[#D4AF37] font-space ">{formatCurrency(d.equity, asset.currency)}</span>
                        </div>
                    )}
                    <div className="col-span-2 bg-white/[0.02] border border-white/5 rounded-xl p-3 flex justify-between items-center">
                        <span className="text-xs text-white/40 uppercase tracking-widest">{isSold ? 'Realised P&L' : 'Total P&L'}</span>
                        <span className={`text-data-sm font-bold font-space  ${d.profitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {d.profitLoss >= 0 ? '+' : ''}{formatCurrency(d.profitLoss, asset.currency)} ({d.roi >= 0 ? '+' : ''}{d.roi.toFixed(1)}%)
                        </span>
                    </div>
                </div>
                {/* Edit Values */}
                {!isSold && (
                    <div className="pt-4 border-t border-white/5 mt-4">
                        {editingValues && editingValues.id === asset.id ? (
                            <div className="flex flex-col gap-3 p-3 bg-black/20 rounded-xl border border-white/10">
                                <h4 className="text-xs uppercase tracking-wider text-white/40 mb-1">Edit Values</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">Investment</label>
                                        <NumberInput value={editingValues.investment} onChange={(val: any) => setEditingValues((p: any) => ({ ...p, investment: val }))}
                                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50" placeholder="Investment" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">Current Value</label>
                                        <NumberInput value={editingValues.currentValue} onChange={(val: any) => setEditingValues((p: any) => ({ ...p, currentValue: val }))}
                                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50" placeholder="Valuation" />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleSavePropertyValues} className="flex-1 px-3 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-semibold hover:bg-emerald-500/30">Save Settings</button>
                                    <button onClick={() => setEditingValues(null)} className="flex-1 px-3 py-2 bg-rose-500/20 text-rose-400 rounded-xl text-sm font-semibold hover:bg-rose-500/30">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => setEditingValues({ id: asset.id, name: asset.name, currentValue: d.currentValue, investment: d.investment, oldInvestment: d.investment })}
                                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-sm font-semibold transition-colors border border-transparent hover:border-white/10">Edit Property Values</button>
                        )}
                    </div>
                )}
                {/* Property Transactions */}
                {asset.ledger && asset.ledger.length > 0 && (
                    <div className="pt-4 border-t border-white/5 mt-4">
                        <h4 className="text-xs text-white/40 uppercase tracking-[2px] mb-3">Property Transactions</h4>
                        <div className="bg-black/20 rounded-xl p-4 border border-white/[0.03]">
                            <TransactionTimeline transactions={asset.ledger.slice(0, 10)} onDelete={handleDeleteEntry}
                                renderItem={(tx: any) => (
                                    <>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${tx.amount >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                            <span className="font-medium text-xs text-white/90 uppercase tracking-wider font-space">{tx.type || tx.notes || 'Transaction'}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-data-sm font-bold text-white tracking-tight font-space ">{formatCurrency(Math.abs(tx.amount), asset.currency)}</span>
                                            <span className="text-data-xs text-white/40 font-space  tracking-tight">{tx.date}</span>
                                        </div>
                                    </>
                                )} />
                        </div>
                    </div>
                )}
                {/* Sell / Delete Actions */}
                {!isSold && (
                    <div className="pt-4 border-t border-white/5 mt-4">
                        <h4 className="text-xs text-white/40 uppercase tracking-[2px] mb-3">Property Actions</h4>
                        {sellPropertyData && sellPropertyData.name === asset.name ? (
                            <SellPropertyForm asset={asset} d={d} sellPropertyData={sellPropertyData} setSellPropertyData={setSellPropertyData} setSelectedAsset={setSelectedAsset} onRefresh={onRefresh} />
                        ) : (
                            <button onClick={() => setSellPropertyData({ name: asset.name, salePrice: '', taxes: '', date: new Date().toISOString().split('T')[0] })}
                                className="w-full mt-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl text-sm font-semibold transition-colors border border-amber-500/20">
                                Sell Property
                            </button>
                        )}
                        <button onClick={() => { setDeleteTarget({ type: 'property', id: asset.id, name: asset.name }); setIsDeleteModalOpen(true); }}
                            className="w-full mt-3 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-sm font-semibold transition-colors border border-rose-500/20">
                            Delete Property
                        </button>
                    </div>
                )}
            </>
        );
    };

    // --- Mortgage Tab ---
    const renderMortgage = () => {
        const m = asset.mortgage;
        if (!m) {
            return (
                <MortgageSetupCard mortgageSetupData={mortgageSetupData} setMortgageSetupData={setMortgageSetupData} handleSetupMortgage={handleSetupMortgage} />
            );
        }
        const mortgagePayments = m.ledger.filter((l: any) => l.source === 'Mortgage');
        return (
            <>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                        <span className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">Original Amount</span>
                        <span className="text-data-sm font-medium text-white/90 font-space ">{formatCurrency(m.originalAmount, asset.currency)}</span>
                    </div>
                    <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3">
                        <span className="block text-xs text-rose-400/60 uppercase tracking-widest mb-1.5">Balance</span>
                        <span className="text-data-sm font-bold text-rose-400 font-space ">{formatCurrency(m.balance, asset.currency)}</span>
                    </div>
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                        <span className="block text-xs text-emerald-400/60 uppercase tracking-widest mb-1.5">Principal Paid</span>
                        <span className="text-data-sm font-bold text-emerald-400 font-space ">{formatCurrency(m.totalPrincipalPaid, asset.currency)}</span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                        <span className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">Interest Paid</span>
                        <span className="text-data-sm font-medium text-white/90 font-space ">{formatCurrency(m.totalInterestPaid, asset.currency)}</span>
                    </div>
                </div>
                {rightPaneMode !== 'add-mortgage-payment' ? (
                    <button onClick={() => setRightPaneMode('add-mortgage-payment')} className="w-full mt-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-sm font-semibold transition-colors">+ Add Payment</button>
                ) : (
                    <div className="mt-4 p-4 bg-black/20 rounded-xl border border-white/5">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-sm font-bold text-white">Add Mortgage Payment</h4>
                            <button onClick={() => setRightPaneMode('default')} className="p-1 hover:bg-white/10 rounded-full text-white/50"><X size={14} /></button>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div>
                                <label className="block mb-1 text-white/50 text-xs">Month</label>
                                <input type="date" value={mortgageFormData.month} onChange={(e: any) => setMortgageFormData((p: any) => ({ ...p, month: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 cursor-pointer" style={{ colorScheme: 'dark' }} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1 text-white/50 text-xs">Total Payment</label>
                                    <NumberInput value={mortgageFormData.costs} onChange={(val: any) => setMortgageFormData((p: any) => ({ ...p, costs: val }))}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50" placeholder="e.g. 1500" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-white/50 text-xs">Interest Paid</label>
                                    <NumberInput value={mortgageFormData.interest} onChange={(val: any) => setMortgageFormData((p: any) => ({ ...p, interest: val }))}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50" placeholder="e.g. 500" />
                                </div>
                            </div>
                            {mortgageFormData.costs && (
                                <div className="text-right text-xs text-white/60 -mt-1">
                                    Principal (auto): <span className="font-bold text-[#D4AF37]">
                                        {formatCurrency(parseFloat(mortgageFormData.costs) - (parseFloat(mortgageFormData.interest) || 0), asset.currency)}
                                    </span>
                                </div>
                            )}
                            <button onClick={handleAddMortgagePayment}
                                className="w-full py-2.5 rounded-xl text-sm font-semibold text-[#1A0F2E]" style={{ background: 'linear-gradient(135deg, #CC5500 0%, #D4AF37 100%)' }}>Confirm Payment</button>
                        </div>
                    </div>
                )}
                <div className="pt-4 border-t border-white/5 mt-4">
                    <h4 className="text-xs text-white/40 uppercase tracking-[2px] mb-3">Payment History</h4>
                    <div className="bg-black/20 rounded-xl p-4 border border-white/[0.03] max-h-[300px] overflow-y-auto custom-scrollbar">
                        <TransactionTimeline transactions={mortgagePayments.slice(0, 20)}
                            onEdit={(tx: any) => { const entryId = tx.id?.split(',')?.[0] || tx.id; handleEditTransaction({ id: entryId, date: tx.rawDate, amount: tx.costs, notes: tx.month, type: 'Mortgage', category: 'mortgage' }); }}
                            onDelete={(id: any) => { const entryId = id?.split(',')?.[0] || id; handleDeleteEntry(entryId); }}
                            renderItem={(tx: any) => (
                                <>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span className="font-medium text-xs text-white/90 uppercase tracking-wider font-space">
                                            {tx.rawDate ? new Date(tx.rawDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : tx.month}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-data-sm font-bold text-white tracking-tight font-space ">{formatCurrency(tx.costs, asset.currency)}</span>
                                        <span className="text-data-xs text-white/40 font-space  tracking-tight">Principal: {formatCurrency(tx.principal, asset.currency)}</span>
                                    </div>
                                </>
                            )} />
                    </div>
                </div>
            </>
        );
    };

    // --- Rental Tab ---
    const renderRental = () => {
        const r = asset.rental;
        if (!r) {
            return <RentalSetupCard rentalFormData={rentalFormData} setRentalFormData={setRentalFormData} handleAddRentalEntry={handleAddRentalEntry} />;
        }
        const roi = asset.investment > 0 ? (r.totalProfit / asset.investment) * 100 : 0;
        const sortedLedger = [...(r.ledger || [])].sort((a: any, b: any) => {
            let valA: any, valB: any;
            switch (airbnbSortConfig.key) {
                case 'costs': valA = a.costs; valB = b.costs; break;
                case 'revenue': valA = a.revenue; valB = b.revenue; break;
                case 'profit': valA = (a.revenue - a.costs); valB = (b.revenue - b.costs); break;
                default: valA = a.rawDate || a.month; valB = b.rawDate || b.month; break;
            }
            if (valA < valB) return airbnbSortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return airbnbSortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return (
            <>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                        <span className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">Total Revenue</span>
                        <span className="text-data-sm font-medium text-emerald-400 font-space ">{formatCurrency(r.totalRevenue, asset.currency)}</span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                        <span className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">Total Costs</span>
                        <span className="text-data-sm font-medium text-rose-400 font-space ">{formatCurrency(r.totalCosts, asset.currency)}</span>
                    </div>
                    <div className={`${r.totalProfit >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'} border rounded-xl p-3`}>
                        <span className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">Net Profit</span>
                        <span className={`text-data-sm font-bold font-space  ${r.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(r.totalProfit, asset.currency)}</span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                        <span className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">ROI</span>
                        <span className="text-data-sm font-medium text-white/90 font-space ">{roi.toFixed(1)}%</span>
                    </div>
                </div>
                {rightPaneMode !== 'add-rental-month' ? (
                    <button onClick={() => setRightPaneMode('add-rental-month')} className="w-full mt-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-sm font-semibold transition-colors">+ Add Entry</button>
                ) : (
                    <RentalEntryForm rentalFormData={rentalFormData} setRentalFormData={setRentalFormData} handleAddRentalEntry={handleAddRentalEntry} setRightPaneMode={setRightPaneMode} />
                )}
                {/* Sort buttons */}
                <div className="flex gap-1.5 flex-wrap mt-4">
                    {['month', 'costs', 'revenue', 'profit'].map(key => (
                        <button key={key} onClick={() => handleAirbnbSort(key)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase cursor-pointer transition-colors border ${airbnbSortConfig.key === key ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-white/40'}`}>
                            {key}{airbnbSortConfig.key === key ? (airbnbSortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                        </button>
                    ))}
                </div>
                {/* Ledger */}
                <div className="mt-4 flex flex-col gap-2 max-h-[350px] overflow-y-auto custom-scrollbar">
                    {sortedLedger.filter((l: any) => l.revenue > 0 || l.costs > 0).map((entry: any, idx: number) => {
                        const profit = entry.revenue - entry.costs;
                        return (
                            <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-xl p-3" style={{ borderLeft: `3px solid ${profit >= 0 ? 'var(--vu-green)' : 'var(--error)'}` }}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="text-sm font-bold text-white">{entry.month}</div>
                                        <div className={`text-xs font-semibold mt-0.5 ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {profit >= 0 ? '+' : ''}{formatCurrency(profit, asset.currency)}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-white/40">Rev: <span className="text-emerald-400 font-semibold">{formatCurrency(entry.revenue, asset.currency)}</span></div>
                                        <div className="text-xs text-white/40 mt-0.5">Cost: <span className="font-semibold">{formatCurrency(entry.costs, asset.currency)}</span></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {/* Individual Entries */}
                {r.entries && r.entries.length > 0 && (
                    <div className="pt-4 border-t border-white/5 mt-4">
                        <h4 className="text-xs text-white/40 uppercase tracking-[2px] mb-3">All Entries</h4>
                        <div className="bg-black/20 rounded-xl p-4 border border-white/[0.03] max-h-[300px] overflow-y-auto custom-scrollbar">
                            <TransactionTimeline transactions={[...r.entries].sort((a: any, b: any) => b.date.localeCompare(a.date))}
                                onEdit={(tx: any) => handleEditTransaction({ ...tx, category: 'rental' })}
                                onDelete={handleDeleteEntry}
                                renderItem={(tx: any) => (
                                    <>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${tx.type === 'Income' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                            <span className="font-medium text-xs text-white/90 uppercase tracking-wider font-space">{tx.type === 'Income' ? 'Revenue' : 'Cost'}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className={`text-data-sm font-bold tracking-tight font-space  ${tx.type === 'Income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {tx.type === 'Income' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount), asset.currency)}
                                            </span>
                                            <span className="text-data-xs text-white/40 font-space  tracking-tight">{tx.date}{tx.notes ? ` · ${tx.notes}` : ''}</span>
                                        </div>
                                    </>
                                )} />
                        </div>
                    </div>
                )}
            </>
        );
    };

    return (
        <div>
            {renderTabBar()}
            {contextTab === 'overview' && renderOverview()}
            {contextTab === 'mortgage' && renderMortgage()}
            {contextTab === 'rental' && renderRental()}
        </div>
    );
}

// --- Extracted helper sub-components ---
function SellPropertyForm({ asset, d, sellPropertyData, setSellPropertyData, setSelectedAsset, onRefresh }: any) {
    return (
        <div className="mt-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
            <h5 className="text-sm font-bold text-amber-400 mb-4 flex items-center gap-2"><span>💰</span> Sell {asset.name}</h5>
            <div className="flex flex-col gap-3">
                <div>
                    <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-1.5">Sale Date</label>
                    <input type="date" value={sellPropertyData.date} onChange={(e: any) => setSellPropertyData((p: any) => ({ ...p, date: e.target.value }))}
                        className="w-full p-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-amber-500/50 transition-all font-space text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-1.5">Sale Price</label>
                        <NumberInput value={sellPropertyData.salePrice} onChange={(val: any) => setSellPropertyData((p: any) => ({ ...p, salePrice: val }))}
                            className="w-full p-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-amber-500/50 transition-all font-space text-sm" placeholder="0" />
                    </div>
                    <div>
                        <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-1.5">Taxes & Fees</label>
                        <NumberInput value={sellPropertyData.taxes} onChange={(val: any) => setSellPropertyData((p: any) => ({ ...p, taxes: val }))}
                            className="w-full p-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-amber-500/50 transition-all font-space text-sm" placeholder="0" />
                    </div>
                </div>
                {(() => {
                    const sp = parseFloat(sellPropertyData.salePrice) || 0;
                    const tx = parseFloat(sellPropertyData.taxes) || 0;
                    const inv = d.investment;
                    const profit = sp - inv - tx;
                    const totalCost = inv + tx;
                    const roiCalc = totalCost > 0 ? (profit / totalCost) * 100 : 0;
                    if (sp <= 0) return null;
                    return (
                        <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-white/40 uppercase tracking-widest">Est. Profit</span>
                                <span className={`text-data-sm font-bold font-space  ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{profit >= 0 ? '+' : ''}{formatCurrency(profit, asset.currency)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-white/40 uppercase tracking-widest">ROI</span>
                                <span className={`text-data-sm font-bold font-space  ${roiCalc >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{roiCalc >= 0 ? '+' : ''}{roiCalc.toFixed(1)}%</span>
                            </div>
                        </div>
                    );
                })()}
                <div className="flex gap-2 mt-1">
                    <button onClick={() => setSellPropertyData(null)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 font-semibold text-sm hover:bg-white/5 transition-colors">Cancel</button>
                    <button onClick={async () => {
                        const sp = parseFloat(sellPropertyData.salePrice) || 0;
                        if (sp <= 0) return;
                        try {
                            await fetch('/api/real-estate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ section: 'sell-property', name: asset.name, salePrice: sp, taxes: parseFloat(sellPropertyData.taxes) || 0, date: sellPropertyData.date }) });
                            setSellPropertyData(null); setSelectedAsset(null); if (onRefresh) onRefresh();
                        } catch (e) { console.error('Failed to sell property:', e); }
                    }} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold text-sm hover:brightness-110 transition-all">Confirm Sale</button>
                </div>
            </div>
        </div>
    );
}

function MortgageSetupCard({ mortgageSetupData, setMortgageSetupData, handleSetupMortgage }: any) {
    return (
        <div className="flex flex-col items-center text-center py-6">
            <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mb-4 ring-1 ring-[#D4AF37]/20"><span className="text-2xl">🏦</span></div>
            <h4 className="text-base font-bold text-white mb-1">Set Up Mortgage</h4>
            <p className="text-xs text-white/40 mb-5 max-w-[220px]">Configure your mortgage details to start tracking payments, principal, and interest.</p>
            <div className="w-full p-4 bg-black/20 rounded-xl border border-white/5">
                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="block mb-1 text-white/50 text-xs">Mortgage Amount</label><NumberInput value={mortgageSetupData.originalAmount} onChange={(val: any) => setMortgageSetupData((p: any) => ({ ...p, originalAmount: val }))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50" placeholder="e.g. 300000" /></div>
                        <div><label className="block mb-1 text-white/50 text-xs">Deposit Paid</label><NumberInput value={mortgageSetupData.deposit} onChange={(val: any) => setMortgageSetupData((p: any) => ({ ...p, deposit: val }))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50" placeholder="e.g. 50000" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="block mb-1 text-white/50 text-xs">Duration (months)</label><NumberInput value={mortgageSetupData.durationMonths} onChange={(val: any) => setMortgageSetupData((p: any) => ({ ...p, durationMonths: val }))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50" placeholder="e.g. 360" /></div>
                        <div><label className="block mb-1 text-white/50 text-xs">Interest Rate (%)</label><NumberInput value={mortgageSetupData.interestRate} onChange={(val: any) => setMortgageSetupData((p: any) => ({ ...p, interestRate: val }))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50" placeholder="e.g. 4.5" /></div>
                    </div>
                    <button onClick={handleSetupMortgage} className="w-full py-2.5 rounded-xl text-sm font-semibold text-[#1A0F2E] mt-1" style={{ background: 'linear-gradient(135deg, #CC5500 0%, #D4AF37 100%)' }}>Set Up Mortgage</button>
                </div>
            </div>
        </div>
    );
}

function RentalSetupCard({ rentalFormData, setRentalFormData, handleAddRentalEntry }: any) {
    return (
        <div className="flex flex-col items-center text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 ring-1 ring-emerald-500/20"><span className="text-2xl">🏠</span></div>
            <h4 className="text-base font-bold text-white mb-1">Track Rental Income</h4>
            <p className="text-xs text-white/40 mb-5 max-w-[220px]">Add revenue and cost entries on specific dates. They'll aggregate by month automatically.</p>
            <RentalEntryForm rentalFormData={rentalFormData} setRentalFormData={setRentalFormData} handleAddRentalEntry={handleAddRentalEntry} isSetup />
        </div>
    );
}

function RentalEntryForm({ rentalFormData, setRentalFormData, handleAddRentalEntry, setRightPaneMode, isSetup }: any) {
    return (
        <div className={isSetup ? "w-full p-4 bg-black/20 rounded-xl border border-white/5" : "mt-4 p-4 bg-black/20 rounded-xl border border-white/5"}>
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-white">Add {isSetup ? 'Entry' : 'Rental Entry'}</h4>
                {!isSetup && setRightPaneMode && <button onClick={() => setRightPaneMode('default')} className="p-1 hover:bg-white/10 rounded-full text-white/50"><X size={14} /></button>}
            </div>
            <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                    {['Revenue', 'Cost'].map(t => (
                        <button key={t} onClick={() => setRentalFormData((p: any) => ({ ...p, entryType: t }))}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${rentalFormData.entryType === t
                                ? t === 'Revenue' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                : 'bg-white/5 border-white/10 text-white/40'}`}>{t === 'Revenue' ? '▲ Revenue' : '▼ Cost'}</button>
                    ))}
                </div>
                <div><label className="block mb-1 text-white/50 text-xs">Date</label><input type="date" value={rentalFormData.date} onChange={(e: any) => setRentalFormData((p: any) => ({ ...p, date: e.target.value }))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 cursor-pointer" style={{ colorScheme: 'dark' }} /></div>
                <div><label className="block mb-1 text-white/50 text-xs">Amount</label><NumberInput value={rentalFormData.amount} onChange={(val: any) => setRentalFormData((p: any) => ({ ...p, amount: val }))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50" placeholder="0" /></div>
                <div><label className="block mb-1 text-white/50 text-xs">Notes (optional)</label><input type="text" value={rentalFormData.notes} onChange={(e: any) => setRentalFormData((p: any) => ({ ...p, notes: e.target.value }))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50" placeholder="e.g. Cleaning fee" /></div>
                <button onClick={handleAddRentalEntry} className="w-full py-2.5 rounded-xl text-sm font-semibold text-[#1A0F2E]" style={{ background: 'linear-gradient(135deg, #CC5500 0%, #D4AF37 100%)' }}>+ Add Entry</button>
            </div>
        </div>
    );
}
