'use client';
import React from 'react';
import { Button } from '@/components/ui';
import _AssetSearch from '../AssetSearch';
import _ConfirmationModal from '../ConfirmationModal';
import _TransactionTimeline from '../TransactionTimeline';
import _FloatingActionButton from '../FloatingActionButton';
import _PullToRefresh from '../PullToRefresh';
import _ContextPane from '../ContextPane';
import _PersonalizedEmptyState from '../ftue/PersonalizedEmptyState';
import _BrokerForm from '../BrokerForm';
import _CurrencySelector from '../CurrencySelector';
import _NumberInput from '../NumberInput';
import _PageTutorialOverlay from '../ftue/PageTutorialOverlay';
const AssetSearch = _AssetSearch as any;
const ConfirmationModal = _ConfirmationModal as any;
const TransactionTimeline = _TransactionTimeline as any;
const FloatingActionButton = _FloatingActionButton as any;
const PullToRefresh = _PullToRefresh as any;
const ContextPane = _ContextPane as any;
const PersonalizedEmptyState = _PersonalizedEmptyState as any;
const BrokerForm = _BrokerForm as any;
const CurrencySelector = _CurrencySelector as any;
const NumberInput = _NumberInput as any;
const PageTutorialOverlay = _PageTutorialOverlay as any;
import { formatCurrency } from '@/lib/currency';
import { X } from 'lucide-react';
import useRealEstate from './useRealEstate';
import REHero from './REHero';
import REPropertiesAccordion from './REPropertiesAccordion';
import REFundAccordion from './REFundAccordion';
import REPropertyDetails from './REPropertyDetails';
import REFundDetails from './REFundDetails';
import type { RealEstateTabProps } from './types';
import { Card } from '@/components/ui/card';

const REALESTATE_TUTORIAL_STEPS = [
    { type: 'spotlight', targetId: 'ftue-re-header', title: 'Property Empire 🏠', message: "Total real estate value, invested capital, and appreciation. Link rental income and mortgages per property.", position: 'bottom' },
    { type: 'spotlight', targetId: 'ftue-re-property-section', title: 'Property Details 🏘️', message: "Valuations, rental history, linked mortgages, and transactions — everything for each property.", position: 'bottom' },
    { type: 'spotlight', targetId: 'ftue-re-fab', title: 'Add Property ➕', message: "Add a property, log a purchase, or record a sale. Mortgages auto-link to your Debt page.", position: 'top' },
];

export default function RealEstateTab({ data, rates, onRefresh, marketData = {} }: RealEstateTabProps) {
    const h = useRealEstate({ data, rates, onRefresh, marketData });

    if (!data) return <div style={{ color: 'var(--fg-secondary)', padding: '20px' }}>Loading real estate data...</div>;

    const summaryCards = h.buildSummaryCards();

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <div className="max-w-[1800px] mx-auto w-full pt-4 lg:pt-8">
                {/* Mobile Search */}
                <div className="mb-8 w-full block lg:hidden relative px-4">
                    <input type="text" placeholder="Search properties & funds..." value={h.searchTerm} onChange={(e) => h.setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-12 text-white/90 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all placeholder:text-white/30 backdrop-blur-md shadow-lg" />
                    <span className="absolute left-8 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
                </div>

                <div className="lg:flex lg:gap-8 lg:items-start">
                    {/* Left Pane */}
                    <div className="flex-1 min-w-0">
                        {h.properties.length > 0 || h.fundBrokers.length > 0 ? (
                            <>
                                <REHero totalValue={h.totalValue} totalInvestment={h.totalInvestment} totalPnL={h.totalPnL} totalROI={h.totalROI}
                                    realisedPnL={h.realisedPnL} topCurrency={h.topCurrency} effectiveCurrency={h.effectiveCurrency} summaryCards={summaryCards} />
                                <div id="ftue-re-property-section">
                                    <REPropertiesAccordion activeProperties={h.activeProperties} soldProperties={h.soldProperties}
                                        newlyAddedProperties={h.newlyAddedProperties} expandedAccordions={h.expandedAccordions}
                                        selectedAsset={h.selectedAsset} BRL={h.BRL} getPropertyDisplayData={h.getPropertyDisplayData}
                                        toggleAccordion={h.toggleAccordion} setSelectedAsset={h.setSelectedAsset}
                                        setContextTab={h.setContextTab} setRightPaneMode={h.setRightPaneMode} />
                                    {h.fundBrokers.map((b: string) => (
                                        <REFundAccordion key={b} brokerName={b} fundHoldings={h.fundHoldings}
                                            expandedAccordions={h.expandedAccordions} selectedAsset={h.selectedAsset}
                                            newlyAddedBrokers={h.newlyAddedBrokers} toggleAccordion={h.toggleAccordion}
                                            setSelectedAsset={h.setSelectedAsset} setRightPaneMode={h.setRightPaneMode}
                                            handleFundBuyClick={h.handleFundBuyClick} handleFundSellClick={h.handleFundSellClick}
                                            handleNewFundBuyClick={h.handleNewFundBuyClick} handleDeleteBrokerClick={h.handleDeleteBrokerClick} />
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div id="ftue-re-empty">
                                <PersonalizedEmptyState copyKey="emptyRealEstate"
                                    actionLabel="Add Property" onAction={() => h.setRightPaneMode('add-property')}
                                    secondaryLabel="Add Fund Broker" onSecondaryAction={() => h.setRightPaneMode('add-broker')} />
                            </div>
                        )}

                        <ActivityHistory h={h} data={data} />
                    </div>

                    {/* Right Pane */}
                    <div className={`${(h.selectedAsset || h.rightPaneMode !== 'default') ? 'block fixed inset-0 z-50 bg-[#0A0612] lg:bg-transparent lg:static lg:block' : 'hidden lg:block'} lg:sticky top-8 h-[100dvh] lg:h-fit overflow-hidden`}>
                        <ContextPane
                            selectedAsset={h.selectedAsset}
                            rightPaneMode={h.rightPaneMode}
                            onClose={() => { h.setSelectedAsset(null); h.setRightPaneMode('default'); }}
                            onRename={h.handleRenameAsset}
                            maxHeight={h.contextPaneMaxHeight}
                            renderEmptyState={() => renderContextPaneEmpty(h)}
                            renderHeader={(asset: any, nameHandledByContextPane: boolean) => (
                                <div className="flex flex-col">
                                    {!nameHandledByContextPane && <h3 className="text-xl font-bold text-white/90 tracking-tight">
                                        {asset.type === 'fund' ? asset.fund : asset.name}
                                    </h3>}
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="px-2 py-0.5 rounded bg-white/10 text-white/60 text-data-xs font-space  tracking-wider">
                                            {asset.type === 'fund' ? asset.ticker : asset.currency}
                                        </span>
                                        {asset.type === 'property' && (
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${asset.status === 'Sold' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                {asset.status}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                            renderDetails={(asset: any) => {
                                if (asset.type === 'fund') {
                                    return <REFundDetails asset={asset}
                                        handleFundBuyClick={h.handleFundBuyClick} handleFundSellClick={h.handleFundSellClick}
                                        handleEditTransaction={h.handleEditTransaction} handleDeleteEntry={h.handleDeleteEntry} />;
                                }
                                return <REPropertyDetails asset={asset} contextTab={h.contextTab} setContextTab={h.setContextTab}
                                    rightPaneMode={h.rightPaneMode} setRightPaneMode={h.setRightPaneMode}
                                    enabledTabs={h.enabledTabs} toggleEnabledTab={h.toggleEnabledTab}
                                    editingValues={h.editingValues} setEditingValues={h.setEditingValues}
                                    sellPropertyData={h.sellPropertyData} setSellPropertyData={h.setSellPropertyData}
                                    mortgageFormData={h.mortgageFormData} setMortgageFormData={h.setMortgageFormData}
                                    mortgageSetupData={h.mortgageSetupData} setMortgageSetupData={h.setMortgageSetupData}
                                    rentalFormData={h.rentalFormData} setRentalFormData={h.setRentalFormData}
                                    airbnbSortConfig={h.airbnbSortConfig} getPropertyDisplayData={h.getPropertyDisplayData}
                                    handleSavePropertyValues={h.handleSavePropertyValues}
                                    handleAddMortgagePayment={h.handleAddMortgagePayment}
                                    handleSetupMortgage={h.handleSetupMortgage}
                                    handleAddRentalEntry={h.handleAddRentalEntry}
                                    handleAirbnbSort={h.handleAirbnbSort}
                                    handleDeleteEntry={h.handleDeleteEntry}
                                    handleEditTransaction={h.handleEditTransaction}
                                    setDeleteTarget={h.setDeleteTarget}
                                    setIsDeleteModalOpen={h.setIsDeleteModalOpen}
                                    setSelectedAsset={h.setSelectedAsset}
                                    onRefresh={onRefresh} />;
                            }}
                        />
                    </div>
                </div>




                {/* FAB */}
                <FloatingActionButton
                    onAddBroker={() => { h.setSelectedAsset(null); h.setRightPaneMode('add-broker'); }}
                    onAddProperty={() => { h.setSelectedAsset(null); h.setRightPaneMode('add-property'); }}
                    onAddTransaction={() => { h.setSelectedAsset(null); h.setFundBuyData({ date: new Date().toISOString().split('T')[0], qtyToBuy: '', buyPricePerShare: '', totalInvestment: 0 } as any); h.setRightPaneMode('buy-transaction'); }}
                />

                {/* Delete Modals */}
                <ConfirmationModal isOpen={h.isDeleteModalOpen} title="Delete Entry" message="Are you sure you want to delete this entry?"
                    onConfirm={h.confirmDelete} onCancel={() => { h.setIsDeleteModalOpen(false); h.setDeleteTarget(null); }} />
                <ConfirmationModal isOpen={h.isDeleteBrokerModalOpen} title="Delete Broker"
                    message={`Are you sure you want to delete the broker "${h.brokerToDelete}"? This cannot be undone.`}
                    onConfirm={h.handleConfirmDeleteBroker} onCancel={() => { h.setIsDeleteBrokerModalOpen(false); h.setBrokerToDelete(null); }} />
            </div>
            <PageTutorialOverlay pageId="real-estate" steps={REALESTATE_TUTORIAL_STEPS} />
        </PullToRefresh>
    );
}

// --- Context Pane Empty State (forms for add-broker, add-property, add-transaction, edit-transaction, default) ---
function renderContextPaneEmpty(h: any) {
    if (h.rightPaneMode === 'add-broker') {
        return (
            <div className="w-full h-full p-8 text-left relative flex flex-col z-10">
                <div className="flex justify-between items-center mb-6">
                    <Button variant="ghost" size="sm" onClick={() => h.setRightPaneMode('default')} className="rounded-full ml-auto"><X size={16} /></Button>
                </div>
                <div className="flex-1">
                    <BrokerForm assetClass="Real Estate" onSave={(savedBroker: any) => {
                        const brokerName = savedBroker?.name || '';
                        if (brokerName) {
                            h.setNewlyAddedBrokers((prev: string[]) => [...prev, brokerName]);
                            h.setExpandedAccordions((prev: any) => ({ ...prev, [brokerName]: true }));
                            setTimeout(() => h.setNewlyAddedBrokers((prev: string[]) => prev.filter((n: string) => n !== brokerName)), 5000);
                        }
                        h.fetchREBrokers();
                        h.setRightPaneMode('default');
                        if (h.onRefresh) h.onRefresh();
                    }} onCancel={() => h.setRightPaneMode('default')} />
                </div>
            </div>
        );
    }
    if (h.rightPaneMode === 'add-property') {
        return <AddPropertyForm h={h} />;
    }
    if (h.rightPaneMode === 'buy-transaction') {
        return <AddTransactionForm h={h} />;
    }
    if (h.rightPaneMode === 'sell-fund-transaction' && h.fundSellData) {
        return <SellFundTransactionForm h={h} />;
    }
    if (h.rightPaneMode === 'edit-transaction' && h.editingTransaction) {
        return <EditTransactionForm h={h} />;
    }
    // Default empty
    return (
        <div className="p-8 pb-4 h-full flex flex-col items-center justify-center text-center relative z-10 space-y-8">
            <div className="w-full max-w-md relative">
                <input type="text" placeholder="Search properties & funds..." value={h.searchTerm} onChange={(e: any) => h.setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-12 text-white border-none focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all placeholder:text-white/30 backdrop-blur-md shadow-2xl" />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center -mt-16 w-full max-w-[280px] mx-auto opacity-60">
                <div className="w-20 h-20 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mb-6 ring-1 ring-[#D4AF37]/20">
                    <span className="text-3xl filter grayscale opacity-70">🏢</span>
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight font-bebas tracking-widest mb-3">Select an Asset</h3>
                <p className="text-sm text-parchment/60 leading-relaxed max-w-[250px] mx-auto">Click on any property or fund to view detailed metrics, mortgage info, and rental income.</p>
            </div>
        </div>
    );
}

// --- Add Property Form ---
function AddPropertyForm({ h }: { h: any }) {
    return (
        <div className="w-full h-full p-6 text-left relative flex flex-col z-10 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <h3 className="text-lg font-bold text-white">Add New Property</h3>
                <Button variant="ghost" size="sm" onClick={() => h.setRightPaneMode('default')} className="rounded-full"><X size={16} /></Button>
            </div>
            <div className="flex-1 flex flex-col gap-5">
                <div>
                    <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Property Name</label>
                    <input type="text" value={h.newPropertyData.name} onChange={(e: any) => h.setNewPropertyData((p: any) => ({ ...p, name: e.target.value }))}
                        className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50 focus:bg-white/10 transition-all font-space" placeholder="e.g. Beach House" autoFocus />
                </div>
                <div>
                    <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Currency</label>
                    <CurrencySelector value={h.newPropertyData.currency} onChange={(val: any) => h.setNewPropertyData((p: any) => ({ ...p, currency: val }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Investment</label>
                        <NumberInput value={h.newPropertyData.investment} onChange={(val: any) => h.setNewPropertyData((p: any) => ({ ...p, investment: val }))}
                            className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50 transition-all font-space" placeholder="0" />
                    </div>
                    <div>
                        <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Current Value</label>
                        <NumberInput value={h.newPropertyData.currentValue} onChange={(val: any) => h.setNewPropertyData((p: any) => ({ ...p, currentValue: val }))}
                            className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50 transition-all font-space" placeholder="0" />
                    </div>
                </div>
                <PropertyOptionsSection h={h} />
                <div className="mt-auto pt-6 flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={() => h.setRightPaneMode('default')}>Cancel</Button>
                    <Button variant="primary" onClick={async () => {
                        if (!h.newPropertyData.name) return;
                        try {
                            await fetch('/api/real-estate', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'property', ...h.newPropertyData, investment: parseFloat(h.newPropertyData.investment) || 0, currentValue: parseFloat(h.newPropertyData.currentValue) || 0 }) });
                            if (h.newPropertyData.hasMortgage && (h.newPropertyData.mortgageAmount || h.newPropertyData.mortgageDeposit || h.newPropertyData.mortgageDuration || h.newPropertyData.mortgageRate)) {
                                await fetch('/api/real-estate', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ section: 'mortgage-setup', propertyName: h.newPropertyData.name, originalAmount: parseFloat(h.newPropertyData.mortgageAmount) || 0, deposit: parseFloat(h.newPropertyData.mortgageDeposit) || 0, durationMonths: parseInt(h.newPropertyData.mortgageDuration) || 0, interestRate: parseFloat(h.newPropertyData.mortgageRate) || 0 }) });
                            }
                            const savedName = h.newPropertyData.name;
                            h.setRightPaneMode('default');
                            h.setNewPropertyData({ name: '', currency: 'BRL', investment: '', currentValue: '', hasMortgage: false, hasRental: false, mortgageAmount: '', mortgageDeposit: '', mortgageDuration: '', mortgageRate: '' });
                            if (savedName) { h.setNewlyAddedProperties((prev: string[]) => [...prev, savedName]); h.setExpandedAccordions((prev: any) => ({ ...prev, Properties: true })); setTimeout(() => h.setNewlyAddedProperties((prev: string[]) => prev.filter((n: string) => n !== savedName)), 5000); }
                            if (h.onRefresh) h.onRefresh();
                        } catch (e) { console.error('Failed to add property', e); }
                    }} className="flex-1">Save Property</Button>
                </div>
            </div>
        </div>
    );
}

function PropertyOptionsSection({ h }: { h: any }) {
    return (
        <div className="pt-2 border-t border-white/5">
            <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-3">Property Options</label>
            <div className="flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={h.newPropertyData.hasMortgage} onChange={(e: any) => h.setNewPropertyData((p: any) => ({ ...p, hasMortgage: e.target.checked }))}
                        className="w-4 h-4 rounded bg-white/5 border-white/20 text-[#D4AF37] focus:ring-[#D4AF37]/50" />
                    <div><span className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">Mortgage</span><p className="text-xs text-white/40">Track mortgage payments, principal, and interest</p></div>
                </label>
                {h.newPropertyData.hasMortgage && (
                    <div className="ml-7 flex flex-col gap-3 p-3 bg-white/[0.03] border border-white/5 rounded-xl">
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="block text-xs text-white/50 uppercase tracking-wider mb-1">Original Amount</label><NumberInput value={h.newPropertyData.mortgageAmount || ''} onChange={(val: any) => h.setNewPropertyData((p: any) => ({ ...p, mortgageAmount: val }))} className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#D4AF37]/50 transition-all font-space" placeholder="0" /></div>
                            <div><label className="block text-xs text-white/50 uppercase tracking-wider mb-1">Deposit</label><NumberInput value={h.newPropertyData.mortgageDeposit || ''} onChange={(val: any) => h.setNewPropertyData((p: any) => ({ ...p, mortgageDeposit: val }))} className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#D4AF37]/50 transition-all font-space" placeholder="0" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="block text-xs text-white/50 uppercase tracking-wider mb-1">Duration (months)</label><NumberInput value={h.newPropertyData.mortgageDuration || ''} onChange={(val: any) => h.setNewPropertyData((p: any) => ({ ...p, mortgageDuration: val }))} className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#D4AF37]/50 transition-all font-space" placeholder="e.g. 360" /></div>
                            <div><label className="block text-xs text-white/50 uppercase tracking-wider mb-1">Interest Rate (%)</label><NumberInput value={h.newPropertyData.mortgageRate || ''} onChange={(val: any) => h.setNewPropertyData((p: any) => ({ ...p, mortgageRate: val }))} className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#D4AF37]/50 transition-all font-space" placeholder="e.g. 5.5" /></div>
                        </div>
                    </div>
                )}
                <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={h.newPropertyData.hasRental} onChange={(e: any) => h.setNewPropertyData((p: any) => ({ ...p, hasRental: e.target.checked }))}
                        className="w-4 h-4 rounded bg-white/5 border-white/20 text-[#D4AF37] focus:ring-[#D4AF37]/50" />
                    <div><span className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">Rental Income</span><p className="text-xs text-white/40">Track monthly revenue, costs, and ROI</p></div>
                </label>
            </div>
        </div>
    );
}

// --- Add Transaction Form ---
function AddTransactionForm({ h }: { h: any }) {
    return (
        <div className="w-full h-full p-6 text-left relative flex flex-col z-10 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <h3 className="text-lg font-bold text-white">Buy Fund Shares</h3>
                <Button variant="ghost" size="sm" onClick={() => h.setRightPaneMode('default')} className="rounded-full"><X size={16} /></Button>
            </div>
            <div className="flex-1 flex flex-col gap-5">
                <div>
                    <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Search Fund</label>
                    <AssetSearch onSelect={(sel: any) => {
                        const lp = h.marketData?.[sel.symbol]?.price || '';
                        h.setFundBuyData((prev: any) => ({ ...prev, fund: (prev?.broker ? prev.broker + ' - ' : 'XP - ') + sel.symbol.replace('.SA', ''), ticker: sel.symbol.replace('.SA', ''), buyPricePerShare: lp, totalInvestment: lp ? (parseFloat(prev?.qtyToBuy) || 0) * lp : 0 }));
                    }} />
                </div>
                <div>
                    <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Broker</label>
                    <select value={h.fundBuyData?.broker || h.fundBrokers[0] || 'XP'}
                        onChange={(e) => { const newBroker = e.target.value; h.setFundBuyData((prev: any) => { const newFundName = prev?.ticker ? `${newBroker} - ${prev.ticker}` : ''; return { ...prev, broker: newBroker, fund: newFundName }; }); }}
                        className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50 transition-all font-space appearance-none">
                        {(h.fundBrokers.length > 0 ? h.fundBrokers : ['XP']).map((b: string) => <option key={b} value={b} className="bg-[#1A0F2E]">{b}</option>)}
                    </select>
                </div>
                {h.fundBuyData?.ticker && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <span className="text-sm font-semibold text-emerald-400">{h.fundBuyData.fund} ({h.fundBuyData.ticker})</span>
                    </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Date</label>
                        <input type="date" value={h.fundBuyData?.date || new Date().toISOString().split('T')[0]} onChange={(e: any) => h.setFundBuyData((p: any) => ({ ...p, date: e.target.value }))}
                            className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50 transition-all font-space" />
                    </div>
                    <div>
                        <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Quantity</label>
                        <NumberInput value={h.fundBuyData?.qtyToBuy || ''} onChange={(val: any) => h.updateFundBuyCalc('qtyToBuy', val)}
                            className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50 transition-all font-space" placeholder="0" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Price per Share (R$)</label>
                    <NumberInput value={h.fundBuyData?.buyPricePerShare || ''} onChange={(val: any) => h.updateFundBuyCalc('buyPricePerShare', val)}
                        className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50 transition-all font-space" placeholder="0" />
                </div>
                <Card className="p-4 text-center">
                    <div className="text-xs text-white/50 uppercase tracking-wider mb-1">Total Investment</div>
                    <div className="text-xl font-bold text-[#D4AF37]">{formatCurrency(h.fundBuyData?.totalInvestment || 0, 'BRL')}</div>
                </Card>
                <div className="mt-auto pt-6 flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={() => h.setRightPaneMode('default')}>Cancel</Button>
                    <Button variant="primary" className="flex-1" onClick={() => { h.handleFundBuyConfirm(); h.setRightPaneMode('default'); }}>Confirm Purchase</Button>
                </div>
            </div>
        </div>
    );
}

// --- Edit Transaction Form ---
function EditTransactionForm({ h }: { h: any }) {
    const isFund = h.editingTransaction.category === 'fund' || h.editingTransaction.ticker;
    return (
        <div className="w-full h-full p-6 text-left relative flex flex-col z-10 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <h3 className="text-lg font-bold text-white">Edit Transaction</h3>
                <Button variant="ghost" size="sm" onClick={() => { h.setEditingTransaction(null); h.setRightPaneMode('default'); }} className="rounded-full"><X size={16} /></Button>
            </div>
            <div className="flex-1 flex flex-col gap-5">
                {isFund && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <span className="text-sm font-semibold text-emerald-400">{h.editingTransaction.fund || h.editingTransaction.asset}</span>
                    </div>
                )}
                <div>
                    <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Date</label>
                    <input type="date" value={h.editingTransaction.date || ''} onChange={(e: any) => h.setEditingTransaction((p: any) => ({ ...p, date: e.target.value }))}
                        className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50 transition-all font-space" />
                </div>
                {isFund && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Quantity</label><NumberInput value={h.editingTransaction.quantity || ''} onChange={(val: any) => h.setEditingTransaction((p: any) => ({ ...p, quantity: val }))} className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50 transition-all font-space" placeholder="0" /></div>
                            <div><label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Price/Share</label><NumberInput value={h.editingTransaction.costPerShare || h.editingTransaction.price || ''} onChange={(val: any) => h.setEditingTransaction((p: any) => ({ ...p, costPerShare: val }))} className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50 transition-all font-space" placeholder="0" /></div>
                        </div>
                        <Card className="p-4 text-center">
                            <div className="text-xs text-white/50 uppercase tracking-wider mb-1">Total</div>
                            <div className="text-xl font-bold text-[#D4AF37]">{formatCurrency(Math.abs((parseFloat(h.editingTransaction.quantity) || 0) * (parseFloat(h.editingTransaction.costPerShare || h.editingTransaction.price) || 0)), 'BRL')}</div>
                        </Card>
                    </>
                )}
                {!isFund && (
                    <div className="flex flex-col gap-4">
                        <div><label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Amount</label><NumberInput value={h.editingTransaction.amount || ''} onChange={(val: any) => h.setEditingTransaction((p: any) => ({ ...p, amount: val }))} className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50 transition-all font-space" placeholder="0" /></div>
                        <div><label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Type / Notes</label><input type="text" value={h.editingTransaction.type || ''} onChange={(e: any) => h.setEditingTransaction((p: any) => ({ ...p, type: e.target.value }))} className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50 transition-all font-space" placeholder="e.g. Valuation Update, Renovation..." /></div>
                    </div>
                )}
                <div className="mt-auto pt-6 flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={() => { h.setEditingTransaction(null); h.setRightPaneMode('default'); }}>Cancel</Button>
                    <Button variant="primary" className="flex-1" onClick={h.handleSaveEditTransaction}>Save Changes</Button>
                </div>
            </div>
        </div>
    );
}

// --- Sell Fund Transaction Form (context pane) ---
function SellFundTransactionForm({ h }: { h: any }) {
    return (
        <div className="w-full h-full p-6 text-left relative flex flex-col z-10 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <h3 className="font-bebas text-xl tracking-widest text-rose-400 uppercase">Sell {h.fundSellData.fund}</h3>
                <Button variant="ghost" size="sm" onClick={() => { h.setRightPaneMode('default'); h.setFundSellData(null); }} className="rounded-full ml-auto"><X size={16} /></Button>
            </div>
            <p className="mb-6 text-white/60 text-sm">
                {h.fundSellData.ticker} · BRL · {h.fundSellData.sharesHeld} shares held
            </p>
            <div className="flex-1 flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Date</label>
                        <input type="date" value={h.fundSellData.date} onChange={(e: any) => h.setFundSellData((p: any) => ({ ...p, date: e.target.value }))}
                            className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-rose-500/50 transition-all font-space [color-scheme:dark]" />
                    </div>
                    <div>
                        <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Quantity</label>
                        <NumberInput value={h.fundSellData.qtyToSell} onChange={(val: any) => h.updateFundSellCalc('qtyToSell', val)}
                            className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-rose-500/50 transition-all font-space" placeholder="0" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Sell Price / Share (R$)</label>
                    <NumberInput value={h.fundSellData.sellPricePerShare} onChange={(val: any) => h.updateFundSellCalc('sellPricePerShare', val)}
                        className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-rose-500/50 transition-all font-space" placeholder="0" />
                </div>
                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-white/50 uppercase tracking-wider">Proceeds</span>
                        <span className="text-data-base font-bold text-[#D4AF37] font-space ">{formatCurrency(h.fundSellData.totalProceeds || 0, 'BRL')}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 rounded-lg p-3">
                        <span className="text-white/60 text-sm">Cost Basis</span>
                        <span className="text-white/80 font-space  text-data-sm">{formatCurrency(h.fundSellData.avgCost * (parseFloat(h.fundSellData.qtyToSell) || 0), 'BRL')}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-lg p-3">
                        <span className="text-white text-sm font-bold">P&L</span>
                        <span className={`text-data-sm font-bold font-space  ${h.fundSellData.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatCurrency(h.fundSellData.pnl || 0, 'BRL')} ({(h.fundSellData.roi || 0).toFixed(1)}%)
                        </span>
                    </div>
                </div>
                <div className="mt-auto pt-6 flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={() => { h.setRightPaneMode('default'); h.setFundSellData(null); }}>Cancel</Button>
                    <Button variant="danger" className="flex-1" onClick={h.handleFundSellConfirm}>Confirm Sale</Button>
                </div>
            </div>
        </div>
    );
}

// --- Activity History ---
function ActivityHistory({ h, data }: { h: any; data: any }) {
    const totalTransactions = (data?.funds?.transactions?.length || 0) + h.properties.reduce((a: number, p: any) => a + (p.ledger?.length || 0), 0);

    return (
        <div id="ftue-re-ledger" className="mt-12 mb-10 rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
            <button
                onClick={() => h.setLedgerOpen(!h.ledgerOpen)}
                className="w-full flex items-center justify-between border-none cursor-pointer" style={{ padding: '16px 20px', background: 'transparent', borderBottom: h.ledgerOpen ? '1px solid rgba(255,255,255,0.06)' : 'none', transition: 'all 0.2s ease', }}
            >
                <div className="flex items-center gap-2.5">
                    <span className="text-sm">📋</span>
                    <span className="text-[13px] font-semibold tracking-[0.3px]" style={{ color: 'rgba(245,245,220,0.7)' }}>Activity History</span>
                    <span className="text-[11px] font-normal" style={{ color: 'rgba(245,245,220,0.3)' }}>({totalTransactions} transactions)</span>
                </div>
                <span className="text-xs inline-block" style={{ color: 'rgba(245,245,220,0.35)', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', transform: h.ledgerOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
            </button>

            <div style={{ maxHeight: h.ledgerOpen ? 'calc(100vh - 12rem)' : '0', overflow: h.ledgerOpen ? 'auto' : 'hidden', transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                <div className="p-4 sm:p-6 bg-transparent">
                    <TransactionTimeline
                        transactions={[
                            ...h.properties.flatMap((p: any) => (p.ledger || []).map((l: any) => ({ ...l, asset: p.name, broker: 'Manual', category: 'property', investment: l.amount, date: l.date, currency: p.currency }))),
                            ...(data?.funds?.transactions || []).map((t: any) => ({ ...t, asset: t.fund, broker: 'XP', category: 'fund', date: t.date, currency: 'BRL' }))
                        ].sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''))}
                        onEdit={h.handleEditTransaction}
                        onDelete={h.handleDeleteEntry}
                        renderItem={(tr: any) => {
                            const isSell = (tr.investment || tr.amount) < 0;
                            const cur = tr.currency || 'BRL';
                            return (
                                <>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className={`w-2 h-2 rounded-full ${!isSell ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                        <span className="font-semibold text-sm text-white/90">
                                            {tr.category === 'fund' ? (tr.quantity >= 0 ? 'Bought' : 'Sold') : (tr.type || 'Transaction')} <span className="text-white/60">{tr.asset}</span>
                                        </span>
                                        <span className="text-xs text-white/40 ml-auto">{tr.broker}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-white tracking-tight">{formatCurrency(Math.abs(tr.investment || tr.amount || 0), cur)}</span>
                                        <span className="text-xs text-white/40">• {tr.date}</span>
                                    </div>
                                </>
                            );
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
