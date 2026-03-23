'use client';
import React from 'react';
import { Button } from '@/components/ui';
import _ConfirmationModal from '../ConfirmationModal';
import _TransactionTimeline from '../TransactionTimeline';
import _FloatingActionButton from '../FloatingActionButton';
import _PersonalizedEmptyState from '../ftue/PersonalizedEmptyState';
import _PullToRefresh from '../PullToRefresh';
import _ContextPane from '../ContextPane';
import _BrokerForm from '../BrokerForm';
import _PageTutorialOverlay from '../ftue/PageTutorialOverlay';
const ConfirmationModal = _ConfirmationModal as any;
const TransactionTimeline = _TransactionTimeline as any;
const FloatingActionButton = _FloatingActionButton as any;
const PersonalizedEmptyState = _PersonalizedEmptyState as any;
const PullToRefresh = _PullToRefresh as any;
const ContextPane = _ContextPane as any;
const BrokerForm = _BrokerForm as any;
const PageTutorialOverlay = _PageTutorialOverlay as any;
import { formatCurrency, convertCurrency } from '@/lib/currency';
import useDebt from './useDebt';
import DebtHeader from './DebtHeader';
import DebtLenderSection from './DebtLenderSection';
import DebtForm from './DebtForm';
import type { DebtTabProps } from './types';

const DEBT_TUTORIAL_STEPS = [
    { type: 'spotlight', targetId: 'ftue-debt-header', title: 'Consolidated Debt Picture', message: "View your total outstanding debt across all lenders, including a complete breakdown. Monitor mortgages, personal loans, and credit lines.", position: 'bottom' },
    { type: 'spotlight', targetId: 'ftue-debt-lender-section', title: 'Detailed Lender View', message: "Access specific details for each lender: individual debt lines, current balances, and repayment schedules.", position: 'bottom' },
    { type: 'spotlight', targetId: 'ftue-debt-ledger', title: 'Repayment Stream', message: "Every payment is precisely logged here. Witness and track the consistent reduction of your debt over time.", position: 'top' },
    { type: 'spotlight', targetId: 'ftue-debt-empty', title: 'Debt-Free Journey', message: "It appears you have no debts currently tracked. Use \u2018+\u2019 to add a lender for any mortgages, personal loans, or credit lines.", position: 'top' },
    { type: 'spotlight', targetId: 'global-fab', title: 'Action Required', message: "Add a lender to start meticulously logging your debts and repayments. This is step one on your path to financial freedom.", position: 'top', shape: 'circle', padding: 8 },
];

export default function DebtTab({ transactions = [], rates, onRefresh }: DebtTabProps) {
    const h = useDebt({ transactions, rates, onRefresh });

    return (
        <PullToRefresh onRefresh={onRefresh} disabledOnDesktop={true}>
            <div className="max-w-[1800px] mx-auto w-full pt-4 lg:pt-8">
                {/* Mobile Search Bar */}
                <div className="mb-8 w-full block lg:hidden relative px-4">
                    <input type="text" placeholder="Search lenders..." value={h.searchTerm}
                        onChange={(e) => h.setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-12 text-white/90 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all placeholder:text-white/30 backdrop-blur-md shadow-lg" />
                    <span className="absolute left-8 lg:left-4 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
                </div>

                <div className="lg:flex lg:gap-8 lg:items-start">
                    <div className="flex-1 min-w-0">
                    {h.combinedLenders.length > 0 ? (
                        <>
                            <DebtHeader
                                combinedLenders={h.combinedLenders}
                                lenderSummary={h.lenderSummary}
                                lenderDict={h.lenderDict}
                                effectiveCurrency={h.effectiveCurrency}
                                topCurrency={h.topCurrency}
                                grandTotal={h.grandTotal}
                                rates={rates}
                                setExpandedLenders={(fn) => {
                                    // Safely pass the updater since DebtHeader calls setExpandedLenders with a function
                                    h.toggleLender('__noop__'); // trigger re-render
                                }}
                            />

                            <div id="ftue-debt-lender-section">
                            <div className="flex justify-between items-center mb-4 px-2">
                                <h2 className="text-xl font-bold font-bebas tracking-widest text-white/90">Lenders</h2>
                                <Button variant="ghost" size="sm" onClick={() => h.setShowEmptyLenders(!h.showEmptyLenders)}
                                    className="rounded-full border border-white/5">
                                    {h.showEmptyLenders ? 'Hide Empty' : 'Show Empty'}
                                </Button>
                            </div>

                            {h.displayLenders.map(l => {
                                const data = h.lenderSummary[l] || { lender: l, total: 0, transactions: [] };
                                const lenderCur = h.lenderDict[l] || 'BRL';
                                const isNewlyAdded = h.newlyAddedLenders.includes(l);
                                return (
                                    <DebtLenderSection
                                        key={l}
                                        lenderName={l}
                                        data={data}
                                        lenderCur={lenderCur}
                                        effectiveCurrency={h.effectiveCurrency}
                                        rates={rates}
                                        isOpen={h.expandedLenders[l] || isNewlyAdded}
                                        isNewlyAdded={isNewlyAdded}
                                        showEmptyLenders={h.showEmptyLenders}
                                        explicitDbLenders={h.explicitDbLenders}
                                        onToggle={() => h.toggleLender(l)}
                                        onAddClick={h.handleNewDebtClick}
                                        onDeleteLenderClick={h.handleDeleteLenderClick}
                                        onEditClick={h.handleEditClick}
                                        onDeleteClick={h.handleDeleteClick}
                                        onSelectAsset={(tr, lenderName) => { h.setSelectedAsset({ ...tr, lenderName }); h.setRightPaneMode('default'); }}
                                    />
                                );
                            })}
                            </div>
                        </>
                    ) : (
                        <div id="ftue-debt-empty">
                        <PersonalizedEmptyState
                            copyKey="emptyDebt"
                            actionLabel="Add Lender"
                            onAction={() => h.setRightPaneMode('add-lender')}
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
                                        {!nameHandledByContextPane && <h3 className="text-xl font-bold text-white/90 tracking-tight">{asset.lenderName || asset.lender}</h3>}
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[0.75rem] uppercase font-mono tabular-nums tracking-wider">Debt</span>
                                            <span className="text-white/40 text-[0.75rem] font-mono tabular-nums">{asset.date}</span>
                                        </div>
                                    </div>
                                )}
                                renderDetails={(asset: any) => {
                                    const detailCur = h.lenderDict[asset.lenderName || asset.lender] || 'BRL';
                                    return (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3">
                                                <span className="block text-[0.75rem] text-rose-400/60 uppercase tracking-widest mb-1.5">Amount ({detailCur})</span>
                                                <span className="text-sm font-bold text-rose-400 font-mono tabular-nums drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]">{formatCurrency(convertCurrency(asset.value_brl || 0, 'BRL', detailCur, rates as any), detailCur)}</span>
                                            </div>
                                            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                                <span className="block text-[0.75rem] text-white/40 uppercase tracking-widest mb-1.5">Original (BRL)</span>
                                                <span className="text-sm font-medium text-white/90 font-mono tabular-nums">{formatCurrency(asset.value_brl, 'BRL')}</span>
                                            </div>
                                            {asset.obs && (
                                                <div className="col-span-2 bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                                    <span className="block text-[0.75rem] text-white/40 uppercase tracking-widest mb-1.5">Notes</span>
                                                    <span className="text-sm text-white/70">{asset.obs}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }}
                                renderActions={(asset: any) => (
                                    <div className="flex gap-3">
                                        <button onClick={() => h.handleEditClick(asset)}
                                            className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors">
                                            Edit
                                        </button>
                                        <button onClick={() => h.handleDeleteClick(asset.id)}
                                            className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors border border-rose-500/20">
                                            Delete
                                        </button>
                                    </div>
                                )}
                                renderEmptyState={() => {
                                    if (h.rightPaneMode === 'add-lender') {
                                        return (
                                            <div className="w-full h-full text-left relative flex flex-col z-10">
                                                <div className="flex justify-between items-center mb-6 p-8 pb-0">
                                                    <h3 className="text-lg font-bold text-white">Add Lender</h3>
                                                    <Button variant="ghost" size="sm" onClick={() => h.setRightPaneMode('default')} className="rounded-full"><span className="text-sm font-bold">✕</span></Button>
                                                </div>
                                                <div className="flex-1 overflow-y-auto px-8 pb-8">
                                                    <BrokerForm assetClass="Debt" label="Lender" onSave={() => { h.setRightPaneMode('default'); h.fetchLenders(); }} onCancel={() => h.setRightPaneMode('default')} />
                                                </div>
                                            </div>
                                        );
                                    }

                                    if (h.rightPaneMode === 'add-transaction') {
                                        return <DebtForm addFormData={h.addFormData} setAddFormData={h.setAddFormData} combinedLenders={h.combinedLenders} onSave={h.handleSaveNewDebt} onClose={() => h.setRightPaneMode('default')} />;
                                    }

                                    if (h.rightPaneMode === 'edit-transaction' && h.editingTr) {
                                        return (
                                            <div className="w-full h-full p-8 text-left relative flex flex-col z-10">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h3 className="text-lg font-bold text-white">Edit Transaction</h3>
                                                    <Button variant="ghost" size="sm" onClick={() => { h.setRightPaneMode('default'); h.setEditingTr(null); }} className="rounded-full"><span className="text-sm font-bold">✕</span></Button>
                                                </div>
                                                <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 pb-4">
                                                    {[['date', 'Date'], ['lender', 'Lender'], ['value_brl', 'Amount (BRL)'], ['obs', 'Notes']].map(([field, label]) => (
                                                        <div key={field}>
                                                            <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">{label}</label>
                                                            <input type="text" value={h.editingTr[field] ?? ''}
                                                                onChange={e => h.handleEditChange(field, e.target.value)}
                                                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all font-mono tabular-nums" />
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-white/10 shrink-0">
                                                    <Button variant="secondary" onClick={() => { h.setRightPaneMode('default'); h.setEditingTr(null); }}>Cancel</Button>
                                                    <Button variant="primary" onClick={h.handleEditSave}>Save</Button>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="p-8 pb-4 h-full flex flex-col items-center justify-center text-center relative z-10 space-y-8">
                                            <div className="w-full max-w-md relative">
                                                <input type="text" placeholder="Search lenders..." value={h.searchTerm}
                                                    onChange={(e) => h.setSearchTerm(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-12 text-white border-none focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all placeholder:text-white/30 backdrop-blur-md shadow-2xl" />
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
                                            </div>
                                            <div className="flex-1 flex flex-col items-center justify-center -mt-16 w-full max-w-[280px] mx-auto opacity-60">
                                                <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center mb-6 ring-1 ring-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.1)]">
                                                    <span className="text-3xl filter grayscale opacity-70">💳</span>
                                                </div>
                                                <h3 className="text-xl font-bold text-white tracking-tight font-bebas tracking-widest mb-3">Select a Debt</h3>
                                                <p className="text-sm text-parchment/60 leading-relaxed max-w-[250px] mx-auto">
                                                    Click on any transaction from a lender to view details and edit or delete entries.
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }}
                            />
                        </div>
                    </div>

                {/* Transaction Ledger / Activity History */}
                <section id="ftue-debt-ledger" className="max-w-3xl mx-auto mb-10 mt-12">
                    <div className="flex justify-between items-center mb-6 px-1">
                        <h3 className="text-lg font-medium text-white/90 flex items-center gap-2">
                            Activity History
                        </h3>
                        <Button variant="ghost" size="sm"
                            onClick={() => h.setLedgerOpen(!h.ledgerOpen)}
                        >
                            {h.ledgerOpen ? 'Hide' : 'Show'} ({h.sortedTransactions.length})
                        </Button>
                    </div>

                    {h.ledgerOpen && (
                        <div className="bg-white/5 backdrop-blur-md border border-white/5 rounded-3xl p-4 sm:p-6 mb-24">
                            <TransactionTimeline
                                transactions={h.sortedTransactions}
                                onEdit={h.handleEditClick}
                                onDelete={h.handleDeleteClick}
                                renderItem={(tr: any) => (
                                    <>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-2 h-2 rounded-full bg-rose-500" />
                                            <span className="font-semibold text-sm text-white/90">
                                                Payment <span className="text-white/60">{tr.lender}</span>
                                            </span>
                                            <span className="text-xs text-white/40 ml-auto">{tr.date}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-white tracking-tight">
                                                {formatCurrency(tr.value_brl, 'BRL')}
                                            </span>
                                            <span className="text-xs text-white/40">• {tr.obs || 'No notes'}</span>
                                        </div>
                                    </>
                                )}
                            />
                        </div>
                    )}
                </section>

                <FloatingActionButton
                    onAddBroker={() => {
                        h.setRightPaneMode('add-lender');
                        h.setSelectedAsset(null);
                    }}
                    onAddTransaction={() => {
                        h.handleNewDebtClick('');
                    }}
                    brokerLabel="Add Lender"
                />

                <ConfirmationModal
                    isOpen={h.isDeleteModalOpen}
                    title="Delete Transaction"
                    message="Are you sure you want to delete this debt entry? This action cannot be undone."
                    onConfirm={h.handleConfirmDelete}
                    onCancel={() => h.setIsDeleteModalOpen(false)}
                />
                <ConfirmationModal
                    isOpen={h.isDeleteLenderModalOpen}
                    title="Delete Lender"
                    message={`Are you sure you want to delete ${h.lenderToDelete}? All transactions for this lender will also be deleted.`}
                    onCancel={() => h.setIsDeleteLenderModalOpen(false)}
                    onConfirm={h.handleConfirmDeleteLender}
                />
            </div>
            <PageTutorialOverlay pageId="debt" steps={DEBT_TUTORIAL_STEPS} />
        </PullToRefresh>
    );
}
