import React from 'react';
import { Button } from '@/components/ui';
import _ConfirmationModal from '../ConfirmationModal';
import { formatCurrency } from '@/lib/currency';
import _TransactionTimeline from '../TransactionTimeline';
import _FloatingActionButton from '../FloatingActionButton';
import _PersonalizedEmptyState from '../ftue/PersonalizedEmptyState';
import _ContextPane from '../ContextPane';
import _AssetLogo from '../AssetLogo';
import _PageTutorialOverlay from '../ftue/PageTutorialOverlay';
import _PullToRefresh from '../PullToRefresh';
const ConfirmationModal = _ConfirmationModal as any;
const TransactionTimeline = _TransactionTimeline as any;
const FloatingActionButton = _FloatingActionButton as any;
const PersonalizedEmptyState = _PersonalizedEmptyState as any;
const ContextPane = _ContextPane as any;
const AssetLogo = _AssetLogo as any;
const PageTutorialOverlay = _PageTutorialOverlay as any;
const PullToRefresh = _PullToRefresh as any;
import usePensions, { BASE_BROKER_CURRENCY } from './usePensions';
import PensionsHeader from './PensionsHeader';
import PensionBrokerSection from './PensionBrokerSection';
import PensionForm from './PensionForm';

const PENSIONS_TUTORIAL_STEPS = [
    { type: 'spotlight', targetId: 'ftue-pensions-header', title: 'Pension Overview 🏖️', message: "Total pension value, contributions, and growth — by provider. Pick your display currency up top.", position: 'bottom' },
    { type: 'spotlight', targetId: 'ftue-pensions-provider-section', title: 'Provider Details 📋', message: "Expand a provider to see fund holdings, P&L, and contribution history. Buy or sell directly.", position: 'bottom' },
    { type: 'spotlight', targetId: 'ftue-pensions-empty', title: 'Plan Ahead 🎯', message: "No pension accounts yet. Add a provider to start tracking your retirement funds!", position: 'top' },
    { type: 'spotlight', targetId: 'global-fab', title: 'Add Provider ➕', message: "Add a pension provider, buy into funds, or sell. Contributions vs growth are tracked automatically.", position: 'top', shape: 'circle', padding: 8 },
];

export default function PensionsTab({ transactions = [], rates, onRefresh, marketData: globalMarketData, pensionPrices: globalPensionPrices }: any) {
    const h = usePensions({ transactions, rates, onRefresh, marketData: globalMarketData, pensionPrices: globalPensionPrices });
    const {
        ledgerOpen, setLedgerOpen,
        isDeleteModalOpen, setIsDeleteModalOpen,
        isDeleteBrokerModalOpen, setIsDeleteBrokerModalOpen,
        brokerToDelete,
        editingTr, setEditingTr,
        selectedAsset, setSelectedAsset,
        searchTerm, setSearchTerm,
        contextPaneMaxHeight,
        brokerDict, explicitDbBrokers,
        showEmptyBrokers, setShowEmptyBrokers,
        expandedBrokers, toggleBroker,
        newlyAddedBrokers,
        rightPaneMode, setRightPaneMode,
        sellData, setSellData,
        buyData, setBuyData,
        isFetchingPrice,
        ledgerSortKey, ledgerSortDir,
        marketData, livePrices,
        activeHoldings, lockedPnL,
        brokers_list,
        topCurrency, effectiveCurrency,
        handleLedgerSort,
        fetchBrokers,
        handleDeleteClick, handleConfirmDelete,
        handleDeleteBrokerClick, handleConfirmDeleteBroker,
        handleEditClick, handleEditChange, handleEditSave,
        handleSellClick, handleSellConfirm,
        handleBuyClick, handleNewBuyClick,
        handleAssetSelect, handleVerifyScrape,
        handleBuyConfirm,
        updateSellCalc, updateBuyCalc,
        handleRenameAsset,
        groupBroker,
    } = h;


    return (
        <PullToRefresh onRefresh={onRefresh} disabledOnDesktop={true}>
            <div className="max-w-[1800px] mx-auto w-full pt-4 lg:pt-8">
                {/* Mobile Search Bar */}
                <div className="mb-8 w-full block lg:hidden relative px-4">
                    <input type="text" placeholder="Search holdings..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-12 text-white/90 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all placeholder:text-white/30 backdrop-blur-md shadow-lg" />
                    <span className="absolute left-8 lg:left-4 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
                </div>

                <div className="lg:flex lg:gap-8 lg:items-start">
                    <div className="flex-1 min-w-0">
                    {(activeHoldings.length > 0 || transactions.length > 0) ? (
                        <>
                            <PensionsHeader
                                brokers={brokers_list}
                                activeHoldings={activeHoldings}
                                lockedPnL={lockedPnL}
                                brokerDict={brokerDict}
                                marketData={marketData}
                                livePrices={livePrices}
                                rates={rates}
                                topCurrency={topCurrency}
                                effectiveCurrency={effectiveCurrency}
                            />

                            <div id="ftue-pensions-provider-section">
                                <div className="flex justify-between items-center mb-4 px-2">
                                    <h2 className="text-xl font-bold font-bebas tracking-widest text-white/90">Brokers</h2>
                                    <Button variant="ghost" size="sm" onClick={() => setShowEmptyBrokers(!showEmptyBrokers)}
                                        className="rounded-full border border-white/5">
                                        {showEmptyBrokers ? 'Hide Empty' : 'Show Empty'}
                                    </Button>
                                </div>

                                {brokers_list.map((b: string) => (
                                    <PensionBrokerSection
                                        key={b}
                                        brokerName={b}
                                        items={groupBroker(b)}
                                        brokerDict={brokerDict}
                                        lockedPnL={lockedPnL}
                                        marketData={marketData}
                                        livePrices={livePrices}
                                        rates={rates}
                                        expandedBrokers={expandedBrokers}
                                        toggleBroker={toggleBroker}
                                        newlyAddedBrokers={newlyAddedBrokers}
                                        explicitDbBrokers={explicitDbBrokers}
                                        showEmptyBrokers={showEmptyBrokers}
                                        selectedAsset={selectedAsset}
                                        setSelectedAsset={setSelectedAsset}
                                        handleBuyClick={handleBuyClick}
                                        handleSellClick={handleSellClick}
                                        handleNewBuyClick={handleNewBuyClick}
                                        handleDeleteBrokerClick={handleDeleteBrokerClick}
                                    />
                                ))}
                            </div>
                        </>
                    ) : (
                        <div id="ftue-pensions-empty">
                            <PersonalizedEmptyState
                                copyKey="emptyPensions"
                                actionLabel="Add Pension Provider"
                                onAction={() => setRightPaneMode('add-broker')}
                            />
                        </div>
                    )}
                    </div>

                    <div className={`${(selectedAsset || rightPaneMode !== 'default') ? 'block fixed inset-0 z-50 bg-[#0A0612] lg:bg-transparent lg:static lg:block' : 'hidden lg:block'} lg:sticky top-8 h-[100dvh] lg:h-fit overflow-hidden`}>
                        <ContextPane
                            selectedAsset={selectedAsset}
                            rightPaneMode={rightPaneMode}
                            onClose={() => { setSelectedAsset(null); setRightPaneMode('default'); }}
                            onRename={handleRenameAsset}
                            maxHeight={contextPaneMaxHeight}
                            renderHeader={(asset: any, nameHandledByContextPane: boolean) => (
                                <div className="flex flex-col">
                                    {!nameHandledByContextPane && <h3 className="text-xl font-bold text-white/90 tracking-tight">{asset.asset}</h3>}
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[0.75rem] uppercase font-mono tabular-nums tracking-wider">{asset.broker}</span>
                                        {asset.ticker && <span className="px-2 py-0.5 rounded bg-white/10 text-white/70 text-[0.75rem] font-mono tabular-nums tracking-wider">{asset.ticker}</span>}
                                    </div>
                                </div>
                            )}
                            renderDetails={(asset: any) => {
                                const isCash = asset.asset === 'Cash';
                                const cur = brokerDict[asset.broker] || BASE_BROKER_CURRENCY[asset.broker] || 'GBP';
                                return (
                                    <div className="grid grid-cols-2 gap-4">
                                        {!isCash && (
                                            <>
                                                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                                    <span className="block text-[0.75rem] text-white/40 uppercase tracking-widest mb-1.5">Units</span>
                                                    <span className="text-sm font-medium text-white/90 font-mono tabular-nums">{Math.abs(asset.qty).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                                                </div>
                                                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                                    <span className="block text-[0.75rem] text-white/40 uppercase tracking-widest mb-1.5">Unit Price</span>
                                                    <span className="text-sm font-medium text-white/90 font-mono tabular-nums">{formatCurrency(asset.valuePerShare, cur)}</span>
                                                </div>
                                            </>
                                        )}
                                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                            <span className="block text-[0.75rem] text-white/40 uppercase tracking-widest mb-1.5">Cost Basis</span>
                                            <span className="text-sm font-medium text-white/90 font-mono tabular-nums">{formatCurrency(asset.totalCost, cur)}</span>
                                        </div>
                                        <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl p-3">
                                            <span className="block text-[0.75rem] text-[#D4AF37]/60 uppercase tracking-widest mb-1.5">Current Value</span>
                                            <span className="text-sm font-bold text-[#D4AF37] font-mono tabular-nums drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">{formatCurrency(asset.currentValue, cur)}</span>
                                        </div>
                                        {!isCash && (
                                            <div className="col-span-2 bg-white/[0.02] border border-white/5 rounded-xl p-3 flex justify-between items-center">
                                                <span className="text-[0.75rem] text-white/40 uppercase tracking-widest">P&L</span>
                                                <span className={`text-sm font-bold tracking-wider rounded-md font-mono tabular-nums ${asset.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {asset.pnl >= 0 ? '+' : ''}{formatCurrency(asset.pnl, cur)} ({asset.roi >= 0 ? '+' : ''}{asset.roi.toFixed(1)}%)
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            }}
                            renderActions={(asset: any) => {
                                const isCash = asset.asset === 'Cash';
                                return (
                                    <div className="flex gap-3">
                                        <button onClick={() => handleBuyClick(asset)} className="flex-1 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors">{isCash ? 'Deposit' : 'Buy'}</button>
                                        <button onClick={() => handleSellClick(asset)} className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors">{isCash ? 'Withdraw' : 'Sell'}</button>
                                    </div>
                                );
                            }}
                            renderTimeline={(asset: any) => {
                                const history = transactions.filter((t: any) => t.asset === asset.asset && t.broker === asset.broker).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                                const cur = brokerDict[asset.broker] || 'GBP';
                                return (
                                    <TransactionTimeline
                                        transactions={history}
                                        onEdit={handleEditClick}
                                        onDelete={handleDeleteClick}
                                        renderItem={(tr: any) => {
                                            const isSell = tr.type === 'Sell';
                                            return (
                                                <>
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${!isSell ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                        <span className="font-medium text-[0.75rem] text-white/90 uppercase tracking-wider font-space">{tr.type}</span>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-sm font-bold text-white tracking-tight font-mono tabular-nums">{formatCurrency(parseFloat(tr.value) || parseFloat(tr.amount) || 0, cur)}</span>
                                                        <span className="text-[0.75rem] text-white/40 font-mono tabular-nums tracking-tight leading-relaxed">{tr.date} {tr.quantity ? `• ${tr.quantity} units` : ''}</span>
                                                    </div>
                                                </>
                                            );
                                        }}
                                    />
                                );
                            }}
                            renderEmptyState={() => (
                                <PensionForm
                                    rightPaneMode={rightPaneMode}
                                    buyData={buyData}
                                    sellData={sellData}
                                    editingTr={editingTr}
                                    isFetchingPrice={isFetchingPrice}
                                    searchTerm={searchTerm}
                                    setSearchTerm={setSearchTerm}
                                    setRightPaneMode={setRightPaneMode}
                                    setBuyData={setBuyData}
                                    setSellData={setSellData}
                                    setEditingTr={setEditingTr}
                                    handleBuyConfirm={handleBuyConfirm}
                                    handleSellConfirm={handleSellConfirm}
                                    handleEditSave={handleEditSave}
                                    handleEditChange={handleEditChange}
                                    handleAssetSelect={handleAssetSelect}
                                    handleVerifyScrape={handleVerifyScrape}
                                    updateBuyCalc={updateBuyCalc}
                                    updateSellCalc={updateSellCalc}
                                    fetchBrokers={fetchBrokers}
                                />
                            )}
                        />
                    </div>
                </div>

                {/* Transaction Ledger */}
                <section className="max-w-3xl mx-auto mb-10 mt-12">
                    <div className="flex justify-between items-center mb-6 px-1">
                        <h3 className="text-lg font-medium text-white/90 flex items-center gap-2">
                            Activity History ({transactions.length})
                        </h3>
                        <Button variant="ghost" size="sm" onClick={() => setLedgerOpen(!ledgerOpen)}>
                            {ledgerOpen ? 'Hide' : 'Show'}
                        </Button>
                    </div>
                    {ledgerOpen && (
                        <div className="bg-white/5 backdrop-blur-md border border-white/5 rounded-3xl p-4 sm:p-6 mb-24">
                            <TransactionTimeline
                                transactions={(() => {
                                    const trs = [...transactions];
                                    trs.sort((a: any, b: any) => {
                                        let valA = a[ledgerSortKey];
                                        let valB = b[ledgerSortKey];
                                        if (ledgerSortKey === 'date') {
                                            valA = new Date(valA || 0); valB = new Date(valB || 0);
                                        } else if (['value', 'pnl', 'roiPercent'].includes(ledgerSortKey)) {
                                            valA = parseFloat(valA) || 0; valB = parseFloat(valB) || 0;
                                        } else {
                                            valA = String(valA || '').toLowerCase(); valB = String(valB || '').toLowerCase();
                                        }
                                        if (valA < valB) return ledgerSortDir === 'asc' ? -1 : 1;
                                        if (valA > valB) return ledgerSortDir === 'asc' ? 1 : -1;
                                        return 0;
                                    });
                                    return trs;
                                })()}
                                onEdit={handleEditClick}
                                onDelete={handleDeleteClick}
                                renderItem={(tr: any) => {
                                    const isSell = tr.type === 'Sell';
                                    const cur = 'GBP';
                                    return (
                                        <>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className={`w-2 h-2 rounded-full ${!isSell ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                <span className="font-semibold text-sm text-white/90">
                                                    {!isSell ? 'Bought' : 'Sold'} <span className="text-white/60">{tr.asset}</span>
                                                </span>
                                                <span className="text-xs text-white/40 ml-auto">{tr.broker}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-white tracking-tight">{formatCurrency(parseFloat(tr.value) || 0, cur)}</span>
                                                <span className="text-xs text-white/40">• {tr.date}</span>
                                            </div>
                                            {isSell && tr.pnl !== null && tr.pnl !== undefined && (
                                                <div className="mt-1.5">
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${parseFloat(tr.pnl) >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                        P&L: {parseFloat(tr.pnl) >= 0 ? '+' : ''}{formatCurrency(parseFloat(tr.pnl), cur)}
                                                        {tr.roiPercent !== null && tr.roiPercent !== undefined ? ` (${parseFloat(tr.roiPercent) >= 0 ? '+' : ''}${parseFloat(tr.roiPercent).toFixed(1)}%)` : ''}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    );
                                }}
                            />
                        </div>
                    )}
                </section>

                <FloatingActionButton onAddBroker={() => { setRightPaneMode('add-broker'); setSelectedAsset(null); }} brokerLabel="Add Broker" />

                <ConfirmationModal isOpen={isDeleteModalOpen} title="Delete Transaction" message="Are you sure you want to delete this pension transaction?"
                    onConfirm={handleConfirmDelete} onCancel={() => setIsDeleteModalOpen(false)} />
                <ConfirmationModal isOpen={isDeleteBrokerModalOpen} title="Delete Pension Provider"
                    message={`Are you sure you want to delete ${brokerToDelete}? All transactions inside this provider will also be deleted.`}
                    confirmLabel="Delete Provider" onConfirm={handleConfirmDeleteBroker} onCancel={() => setIsDeleteBrokerModalOpen(false)} />
            </div>
            <PageTutorialOverlay pageId="pensions" steps={PENSIONS_TUTORIAL_STEPS} />
        </PullToRefresh>
    );
}
