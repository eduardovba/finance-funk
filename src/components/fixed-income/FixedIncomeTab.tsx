'use client';
import React from 'react';
import _ConfirmationModal from '../ConfirmationModal';
import _TransactionTimeline from '../TransactionTimeline';
import _FloatingActionButton from '../FloatingActionButton';
import _EmptyState from '../EmptyState';
import _PullToRefresh from '../PullToRefresh';
import _ContextPane from '../ContextPane';
import _BrokerForm from '../BrokerForm';
import _PageTutorialOverlay from '../ftue/PageTutorialOverlay';
const ConfirmationModal = _ConfirmationModal as any;
const TransactionTimeline = _TransactionTimeline as any;
const FloatingActionButton = _FloatingActionButton as any;
const EmptyState = _EmptyState as any;
const PullToRefresh = _PullToRefresh as any;
const ContextPane = _ContextPane as any;
const BrokerForm = _BrokerForm as any;
const PageTutorialOverlay = _PageTutorialOverlay as any;
import { formatCurrency } from '@/lib/currency';
import useFixedIncome, { BASE_BROKER_CURRENCY } from './useFixedIncome';
import FIHeader from './FIHeader';
import FIBrokerSection from './FIBrokerSection';
import FIForm from './FIForm';
import type { FixedIncomeTabProps } from './types';

const FIXEDINCOME_TUTORIAL_STEPS = [
    { type: 'spotlight', targetId: 'ftue-fi-header', title: 'Performance & Yield', message: "Your total fixed income valuation, total deposits, and cumulative interest earned, broken down by individual account. Switch your display currency easily.", position: 'bottom' },
    { type: 'spotlight', targetId: 'ftue-fi-account-section', title: 'Detailed Account View', message: "Expand any account to see precise holdings, maturity dates, and exact interest figures. Every transaction and interest payment is tracked.", position: 'bottom' },
    { type: 'spotlight', targetId: 'ftue-fi-ledger', title: 'Fixed Income Stream', message: "Your detailed transaction log, recording all deposits, withdrawals, and automatic interest payments. We handle the interest calculations seamlessly.", position: 'top' },
    { type: 'spotlight', targetId: 'ftue-fi-empty', title: 'Ready to Grow?', message: "No fixed income accounts in the mix just yet. Add your first savings account, bond, or treasury product using the \u2018+\u2019 button.", position: 'top' },
    { type: 'spotlight', targetId: 'global-fab', title: 'Add an Account', message: "Create a new account and start automatically tracking deposits, withdrawals, and interest. This is your foundation for safe growth.", position: 'top', shape: 'circle', padding: 8 },
];

export default function FixedIncomeTab({ transactions = [], rates, onRefresh }: FixedIncomeTabProps) {
    const h = useFixedIncome({ transactions, rates, onRefresh });
    const { summaries: brokerSummaries, grandTotal, grandInv } = h.computeBrokerSummaries();

    return (
        <PullToRefresh onRefresh={onRefresh} disabledOnDesktop={true}>
            <div className="max-w-[1800px] mx-auto w-full pt-4 lg:pt-8">
                {/* Mobile Search Bar */}
                <div className="mb-8 w-full block lg:hidden relative px-4">
                    <input type="text" placeholder="Search holdings..."
                        value={h.searchTerm} onChange={(e) => h.setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-12 text-white/90 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all placeholder:text-white/30 backdrop-blur-md shadow-lg" />
                    <span className="absolute left-8 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
                </div>

                <div className="lg:flex lg:gap-8 lg:items-start">
                    <div className="flex-1 min-w-0">
                    {(h.activeHoldings.length > 0 || transactions.length > 0) ? (
                        <>
                            <FIHeader
                                brokerSummaries={brokerSummaries}
                                grandTotal={grandTotal}
                                grandInv={grandInv}
                                effectiveCurrency={h.effectiveCurrency}
                                topCurrency={h.topCurrency}
                            />

                            <div id="ftue-fi-account-section">
                            <div className="flex justify-between items-center mb-4 px-2">
                                <h2 className="text-xl font-bold font-bebas tracking-widest text-white/90">Brokers</h2>
                                <button onClick={() => h.setShowEmptyBrokers(!h.showEmptyBrokers)}
                                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm font-medium transition-colors">
                                    {h.showEmptyBrokers ? 'Hide Empty' : 'Show Empty'}
                                </button>
                            </div>

                            {h.brokers_list.map(b => {
                                const items = h.activeHoldings
                                    .filter(item => item.broker === b)
                                    .filter(item => !h.searchTerm || item.name.toLowerCase().includes(h.searchTerm.toLowerCase()))
                                    .sort((a, bItem) => bItem.currentValue - a.currentValue);
                                const cur = h.brokerDict[b] || BASE_BROKER_CURRENCY[b] || 'BRL';
                                const isNewlyAdded = h.newlyAddedBrokers.includes(b);
                                return (
                                    <FIBrokerSection
                                        key={b}
                                        brokerName={b}
                                        items={items}
                                        cur={cur}
                                        isOpen={h.expandedBrokers[b] || isNewlyAdded}
                                        isNewlyAdded={isNewlyAdded}
                                        showEmptyBrokers={h.showEmptyBrokers}
                                        selectedAsset={h.selectedAsset}
                                        explicitDbBrokers={h.explicitDbBrokers}
                                        onToggle={() => h.toggleBroker(b)}
                                        onAddClick={h.handleAddClick}
                                        onDeleteBroker={h.handleDeleteBroker}
                                        onUpdateClick={h.handleUpdateClick}
                                        onSelectAsset={(item) => { h.setSelectedAsset(item); h.setRightPaneMode('default'); }}
                                    />
                                );
                            })}
                            </div>
                        </>
                    ) : (
                        <div id="ftue-fi-empty">
                        <EmptyState
                            icon="🏦"
                            title="No Fixed Income Assets"
                            message="You have no fixed income accounts yet. Add an account to start tracking deposits, bonds, and interest."
                            actionLabel="Add Account"
                            onAction={() => h.setRightPaneMode('add-broker')}
                        />
                        </div>
                    )}
                    </div>

                        <div className={`${(h.selectedAsset || h.rightPaneMode !== 'default') ? 'block fixed inset-0 z-50 bg-[#0A0612] lg:bg-transparent lg:static lg:block' : 'hidden lg:block'} lg:sticky top-8 h-[100dvh] lg:h-fit overflow-hidden`}>
                            <ContextPane
                                selectedAsset={h.selectedAsset}
                                rightPaneMode={h.rightPaneMode}
                                onClose={() => { h.setSelectedAsset(null); h.setRightPaneMode('default'); }}
                                onRename={h.handleRenameAsset}
                                maxHeight={h.contextPaneMaxHeight}
                                renderHeader={(asset: any, nameHandledByContextPane: boolean) => (
                                    <div className="flex flex-col">
                                        {!nameHandledByContextPane && <h3 className="text-xl font-bold text-white/90 tracking-tight">{asset.name}</h3>}
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="px-2 py-0.5 rounded bg-white/10 text-white/70 text-[10px] font-mono tracking-wider">{asset.broker}</span>
                                        </div>
                                    </div>
                                )}
                                renderDetails={(asset: any) => {
                                    if (h.rightPaneMode === 'add-transaction' && h.addData) return <FIForm mode="add" addData={h.addData} setAddData={h.setAddData} onSaveAdd={h.handleSaveAdd} brokersList={h.brokers_list} onClose={() => h.setRightPaneMode('default')} />;
                                    if (h.rightPaneMode === 'edit-transaction' && h.editingTr) return <FIForm mode="edit" editingTr={h.editingTr} setEditingTr={h.setEditingTr} onSaveEdit={h.handleSaveEdit} onClose={() => h.setRightPaneMode('default')} />;
                                    if (h.rightPaneMode === 'update-value' && h.updateTarget) return <FIForm mode="update" updateTarget={h.updateTarget} updateNewValue={h.updateNewValue} setUpdateNewValue={h.setUpdateNewValue} updateSaving={h.updateSaving} onSaveUpdate={h.handleSaveUpdate} onClose={() => h.setRightPaneMode('default')} />;
                                    return (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                                <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5">Principal</span>
                                                <span className="text-sm font-medium text-white/90 font-mono">{formatCurrency(asset.investment, asset.currency || 'BRL')}</span>
                                            </div>
                                            <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl p-3">
                                                <span className="block text-[10px] text-[#D4AF37]/60 uppercase tracking-widest mb-1.5">Current Value</span>
                                                <span className="text-sm font-bold text-[#D4AF37] font-mono drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">{formatCurrency(asset.currentValue, asset.currency || 'BRL')}</span>
                                            </div>
                                            <div className="col-span-2 bg-white/[0.02] border border-white/5 rounded-xl p-3 flex justify-between items-center">
                                                <span className="text-[10px] text-white/40 uppercase tracking-widest">Accrued Interest</span>
                                                <span className={`text-sm font-bold tracking-wider rounded-md font-mono ${asset.interest >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {asset.interest >= 0 ? '+' : ''}{formatCurrency(asset.interest, asset.currency || 'BRL')} ({asset.roi >= 0 ? '+' : ''}{asset.roi.toFixed(1)}%)
                                                </span>
                                            </div>
                                        </div>
                                    );
                                }}
                                renderActions={(asset: any) => {
                                    if (h.rightPaneMode !== 'default') return null;
                                    return (
                                    <div className="flex gap-3">
                                        <button onClick={() => h.handleUpdateClick(asset)}
                                            className="flex-1 py-3 bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/20 rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors">
                                            Update Value
                                        </button>
                                        <button onClick={() => h.handleAddClick(asset.broker, asset.name)}
                                            className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors">
                                            Add Transaction
                                        </button>
                                    </div>
                                    );
                                }}
                                renderTimeline={(asset: any) => {
                                    if (h.rightPaneMode !== 'default') return null;
                                    const assetHistory = transactions.filter(t => t.asset === asset.name && t.broker === asset.broker).sort((a, b) => b.date.localeCompare(a.date));
                                    return (
                                        <TransactionTimeline
                                            transactions={assetHistory}
                                            onEdit={h.handleEditClick}
                                            onDelete={h.handleDeleteClick}
                                            renderItem={(tr: any) => {
                                                const isInterest = tr.type === 'Interest';
                                                const isWithdrawal = tr.type === 'Withdrawal';
                                                const amount = tr.investment + (tr.interest || 0);
                                                return (
                                                    <>
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${isInterest ? 'bg-emerald-500' : isWithdrawal ? 'bg-rose-500' : 'bg-blue-400'}`} />
                                                            <span className="font-medium text-[10px] text-white/90 uppercase tracking-wider font-space">{tr.type}</span>
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-sm font-bold text-white tracking-tight font-mono">{formatCurrency(amount, asset.currency || 'BRL')}</span>
                                                            <span className="text-[10px] text-white/40 font-mono tracking-tight leading-relaxed">{tr.date}</span>
                                                        </div>
                                                    </>
                                                )
                                            }}
                                        />
                                    );
                                }}
                                renderEmptyState={() => {
                                    if (h.rightPaneMode === 'add-broker') {
                                        return (
                                            <div className="w-full h-full text-left relative flex flex-col z-10">
                                                <div className="flex justify-between items-center mb-6 p-8 pb-0">
                                                    <h3 className="text-lg font-bold text-white">Add Broker</h3>
                                                    <button onClick={() => h.setRightPaneMode('default')} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors"><span className="text-sm font-bold">✕</span></button>
                                                </div>
                                                <div className="flex-1 overflow-y-auto px-8 pb-8">
                                                    <BrokerForm assetClass="FixedIncome" onSave={() => { h.setRightPaneMode('default'); h.fetchBrokers(); }} onCancel={() => h.setRightPaneMode('default')} />
                                                </div>
                                            </div>
                                        );
                                    }
                                    if (h.rightPaneMode === 'add-transaction' && h.addData) return <FIForm mode="add" addData={h.addData} setAddData={h.setAddData} onSaveAdd={h.handleSaveAdd} brokersList={h.brokers_list} onClose={() => h.setRightPaneMode('default')} />;
                                    if (h.rightPaneMode === 'edit-transaction' && h.editingTr) return <FIForm mode="edit" editingTr={h.editingTr} setEditingTr={h.setEditingTr} onSaveEdit={h.handleSaveEdit} onClose={() => h.setRightPaneMode('default')} />;
                                    if (h.rightPaneMode === 'update-value' && h.updateTarget) return <FIForm mode="update" updateTarget={h.updateTarget} updateNewValue={h.updateNewValue} setUpdateNewValue={h.setUpdateNewValue} updateSaving={h.updateSaving} onSaveUpdate={h.handleSaveUpdate} onClose={() => h.setRightPaneMode('default')} />;

                                    return (
                                        <div className="p-8 pb-4 h-full flex flex-col items-center justify-center text-center relative z-10 space-y-8">
                                            {/* Desktop Search */}
                                            <div className="w-full max-w-md relative">
                                                <input type="text" placeholder="Search holdings..."
                                                    value={h.searchTerm} onChange={(e) => h.setSearchTerm(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-12 text-white border-none focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all placeholder:text-white/30 backdrop-blur-md shadow-2xl" />
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
                                            </div>
                                            <div className="flex-1 flex flex-col items-center justify-center -mt-16 w-full max-w-[280px] mx-auto opacity-60">
                                                <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 ring-1 ring-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                                                    <span className="text-3xl filter grayscale opacity-70">📊</span>
                                                </div>
                                                <h3 className="text-xl font-bold text-white tracking-tight font-bebas tracking-widest mb-3">Select an Asset</h3>
                                                <p className="text-sm text-parchment/60 leading-relaxed max-w-[250px] mx-auto">
                                                    Click on any holding to view detailed metrics and transaction history.
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }}
                            />
                        </div>
                    </div>

                {/* Transaction Ledger */}
                <section id="ftue-fi-ledger" className="max-w-3xl mx-auto mb-10 mt-12">
                    <div className="flex justify-between items-center mb-6 px-1">
                        <h3 className="text-lg font-medium text-white/90 flex items-center gap-2">
                            Activity History
                        </h3>
                        <button
                            onClick={() => h.setLedgerOpen(!h.ledgerOpen)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm font-medium transition-colors"
                        >
                            {h.ledgerOpen ? 'Hide' : 'Show'} ({transactions.length})
                        </button>
                    </div>

                    {h.ledgerOpen && (
                        <div className="bg-white/5 backdrop-blur-md border border-white/5 rounded-3xl p-4 sm:p-6 mb-24">
                            <TransactionTimeline
                                transactions={[...transactions].sort((a, b) => b.date.localeCompare(a.date))}
                                onEdit={h.handleEditClick}
                                onDelete={h.handleDeleteClick}
                                renderItem={(tr: any) => {
                                    const isInterest = tr.type === 'Interest';
                                    const isWithdrawal = tr.type === 'Withdrawal';
                                    const cur = tr.currency || 'BRL';
                                    const amount = tr.investment + (tr.interest || 0);
                                    return (
                                        <>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className={`w-2 h-2 rounded-full ${isInterest ? 'bg-emerald-500' : isWithdrawal ? 'bg-rose-500' : 'bg-blue-400'}`} />
                                                <span className="font-semibold text-sm text-white/90">
                                                    {tr.type} <span className="text-white/60">{tr.asset}</span>
                                                </span>
                                                <span className="text-xs text-white/40 ml-auto">{tr.broker}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-white tracking-tight">{formatCurrency(amount, cur)}</span>
                                                <span className="text-xs text-white/40">• {tr.date}</span>
                                            </div>
                                        </>
                                    )
                                }}
                            />
                        </div>
                    )}
                </section>

                <FloatingActionButton
                    onAddBroker={() => { h.setRightPaneMode('add-broker'); h.setSelectedAsset(null); }}
                    onAddTransaction={() => { h.handleAddClick(h.brokers_list[0] || ''); }}
                />

                <ConfirmationModal
                    isOpen={h.isDeleteModalOpen}
                    title="Delete Fixed Income Record"
                    message="Are you sure? This will remove the transaction from your ledger."
                    onConfirm={h.handleConfirmDelete}
                    onCancel={() => h.setIsDeleteModalOpen(false)}
                />
            </div>
            <PageTutorialOverlay pageId="fixed-income" steps={FIXEDINCOME_TUTORIAL_STEPS} />
        </PullToRefresh>
    );
}
