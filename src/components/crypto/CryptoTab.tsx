import React from 'react';
import { Button } from '@/components/ui';
import _ConfirmationModal from '../ConfirmationModal';
import _TransactionTimeline from '../TransactionTimeline';
import _FloatingActionButton from '../FloatingActionButton';
import _EmptyState from '../EmptyState';
import _AssetCardSkeleton from '../AssetCardSkeleton';
import _ContextPane from '../ContextPane';
import _AssetLogo from '../AssetLogo';
import _PageTutorialOverlay from '../ftue/PageTutorialOverlay';
import _PullToRefresh from '../PullToRefresh';
const ConfirmationModal = _ConfirmationModal as any;
const TransactionTimeline = _TransactionTimeline as any;
const FloatingActionButton = _FloatingActionButton as any;
const EmptyState = _EmptyState as any;
const AssetCardSkeleton = _AssetCardSkeleton as any;
const ContextPane = _ContextPane as any;
const AssetLogo = _AssetLogo as any;
const PageTutorialOverlay = _PageTutorialOverlay as any;
const PullToRefresh = _PullToRefresh as any;

import { formatCurrency } from '@/lib/currency';
import useCrypto, { BROKER_CURRENCY } from './useCrypto';
import CryptoHeader from './CryptoHeader';
import CryptoBrokerSection from './CryptoBrokerSection';
import CryptoForm from './CryptoForm';
import type { CryptoTabProps } from './types';

const CRYPTO_TUTORIAL_STEPS = [
    { type: 'spotlight', targetId: 'ftue-crypto-header', title: 'Digital Wealth Snap', message: "Your total crypto value, cost basis, and detailed P&L \u2013 including a clear breakdown by exchange. Pick your display currency.", position: 'bottom' },
    { type: 'spotlight', targetId: 'ftue-crypto-exchange-section', title: 'Exchange-Specific Views', message: "Drill down into any exchange to review holdings, P&L, and specific wallet/cold storage entries. Your assets, tracked individually.", position: 'bottom' },
    { type: 'spotlight', targetId: 'ftue-crypto-ledger', title: 'Crypto Activity Ledger', message: "A complete transaction history with automated cost basis tracking. We record every buy and sell for absolute transparency.", position: 'top' },
    { type: 'spotlight', targetId: 'ftue-crypto-empty', title: 'Entering the Market?', message: "Your crypto portfolio is currently a clean slate. Tap the \u2018+\u2019 button to integrate your first exchange, such as Binance or Coinbase.", position: 'top' },
    { type: 'spotlight', targetId: 'global-fab', title: 'Add Exchange or Buy', message: "Link your crypto world with \u2018+\u2019. Add an exchange, record your first crypto buy, or log a sale. Start building your digital position.", position: 'top', shape: 'circle', padding: 8 },
];

export default function CryptoTab({ transactions = [], marketData: globalMarketData, rates, onRefresh }: CryptoTabProps) {
    const h = useCrypto({ transactions, marketData: globalMarketData, rates, onRefresh });
    const _marketData = h.marketData || {};
    const {
        isLoading, setIsLoading,
        ledgerOpen, setLedgerOpen,
        isDeleteModalOpen, setIsDeleteModalOpen,
        isDeleteBrokerModalOpen, setIsDeleteBrokerModalOpen,
        brokerToDelete, setBrokerToDelete,
        expandedBrokers, toggleBroker,
        searchTerm, setSearchTerm,
        contextPaneMaxHeight,
        selectedAsset, setSelectedAsset,
        rightPaneMode, setRightPaneMode,
        showEmptyBrokers, setShowEmptyBrokers,
        brokerDict, explicitDbBrokers,
        newlyAddedBrokers, setNewlyAddedBrokers,
        trToDelete,
        editingTr, setEditingTr,
        isSellModalOpen, setIsSellModalOpen,
        sellData, setSellData,
        buyData, setBuyData,
        isFetchingPrice, setIsFetchingPrice,
        activeHoldings, lockedPnL,
        brokerGroups, brokers,
        topCurrency, effectiveCurrency,

        fetchBrokers,
        handleDeleteClick, handleConfirmDelete,
        handleDeleteBrokerClick, handleConfirmDeleteBroker,
        handleEditClick, handleEditChange, handleEditSave,
        handleSellClick, updateSellCalc, handleSellConfirm,
        handleBuyClick, handleNewBuyClick, updateBuyCalc, handleBuyConfirm,
        handleRenameAsset,
    } = h;

    const { renderEmptyState, renderSellModal } = CryptoForm({
        rightPaneMode, buyData, sellData, editingTr, isFetchingPrice, searchTerm, brokers, brokerDict, marketData: _marketData, rates: rates || null, isSellModalOpen,
        setSearchTerm, setRightPaneMode, setBuyData, setSellData, setEditingTr, setIsFetchingPrice, setIsSellModalOpen,
        handleBuyConfirm, handleSellConfirm, handleEditSave, handleEditChange, updateBuyCalc, updateSellCalc, fetchBrokers
    });

    const sortedTr = [...transactions].sort((a: any, b: any) => b.date.localeCompare(a.date));

    if (isLoading) {
        return (
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px', paddingTop: '32px' }}>
                <div className="mb-8 max-w-md mx-auto relative px-4 text-center">
                    <div className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
                    {[1, 2, 3, 4, 5, 6].map(i => <AssetCardSkeleton key={i} />)}
                </div>
            </div>
        );
    }

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <div className="max-w-[1800px] mx-auto w-full pt-4 lg:pt-8">
                {/* Mobile Search */}
                <div className="mb-8 w-full block lg:hidden relative px-4">
                    <input type="text" placeholder="Search holdings..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-12 text-white/90 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all placeholder:text-white/30 backdrop-blur-md shadow-lg" />
                    <span className="absolute left-8 lg:left-4 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
                </div>

                <div className="lg:flex lg:gap-8 lg:items-start">
                    <div className="flex-1 min-w-0">
                    {(activeHoldings.length > 0 || transactions.length > 0) ? (
                        <>
                            <CryptoHeader
                                brokers={brokers}
                                activeHoldings={activeHoldings}
                                lockedPnL={lockedPnL}
                                brokerDict={brokerDict}
                                brokerGroups={brokerGroups}
                                marketData={_marketData}
                                rates={rates || null}
                                topCurrency={topCurrency}
                                effectiveCurrency={effectiveCurrency}
                            />

                            <div id="ftue-crypto-exchange-section">
                            <div className="flex justify-between items-center mb-4 px-2">
                                <h3 className="font-bebas text-2xl tracking-widest text-parchment/60 mb-6 px-1">Crypto Exchanges & Wallets</h3>
                                <Button variant="ghost" size="sm" onClick={() => setShowEmptyBrokers(!showEmptyBrokers)}
                                    className="rounded-full border border-white/5">
                                    {showEmptyBrokers ? 'Hide Empty' : 'Show Empty'}
                                </Button>
                            </div>

                            {brokers.map(b => (
                                <CryptoBrokerSection
                                    key={b}
                                    brokerName={b}
                                    items={brokerGroups[b]}
                                    brokerDict={brokerDict}
                                    lockedPnL={lockedPnL}
                                    marketData={_marketData}
                                    activeHoldings={activeHoldings}
                                    rates={rates || null}
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
                        <>
                            <h2 className="text-xl font-bold font-bebas tracking-widest text-[#D4AF37]">CRYPTO PORTFOLIO</h2>
                            <div id="ftue-crypto-empty">
                            <EmptyState
                                icon="💎"
                                title="No Crypto Assets"
                                message="You have no crypto assets yet. Add an exchange to log your first transaction."
                                actionLabel="Add Exchange"
                                onAction={() => setRightPaneMode('add-broker')}
                            />
                            </div>
                        </>
                    )}
                    </div>
                        <div className={`${(selectedAsset || rightPaneMode !== 'default') ? 'block fixed inset-0 z-50 bg-[#0A0612] lg:bg-transparent lg:static lg:block' : 'hidden lg:block'} lg:sticky top-8 h-[100dvh] lg:h-fit overflow-hidden`}>
                            <ContextPane
                                selectedAsset={selectedAsset}
                                rightPaneMode={rightPaneMode}
                                onClose={() => { setSelectedAsset(null); setRightPaneMode('default'); }}
                                onRename={handleRenameAsset}
                                maxHeight={contextPaneMaxHeight}
                                renderEmptyState={renderEmptyState}
                                renderHeader={(asset: any, nameHandledByContextPane: boolean) => (
                                    <div className="flex flex-col">
                                        {!nameHandledByContextPane && <h3 className="text-xl font-bold text-white/90 tracking-tight">{asset.asset}</h3>}
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="px-2 py-0.5 rounded bg-white/10 text-white/60 text-[0.75rem] font-mono tabular-nums tracking-wider">{asset.broker}</span>
                                            {asset.ticker && <span className="px-2 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37] text-[0.75rem] font-mono tabular-nums tracking-wider">{asset.ticker}</span>}
                                        </div>
                                    </div>
                                )}
                                renderDetails={(asset: any) => {
                                    const isCash = asset.asset === 'Cash';
                                    return (
                                        <div className="grid grid-cols-2 gap-4">
                                            {!isCash && (
                                                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                                    <span className="block text-[0.75rem] text-white/40 uppercase tracking-widest mb-1.5">Holdings</span>
                                                    <span className="text-sm font-medium text-white/90 font-mono tabular-nums">{Math.abs(asset.qty).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                                                </div>
                                            )}
                                            {!isCash && (
                                                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                                    <span className="block text-[0.75rem] text-white/40 uppercase tracking-widest mb-1.5">Live Price</span>
                                                    <span className="text-sm font-medium text-white/90 font-mono tabular-nums">{asset.livePrice ? formatCurrency(asset.livePrice, asset.brokerCurrency) : 'N/A'}</span>
                                                </div>
                                            )}
                                            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                                <span className="block text-[0.75rem] text-white/40 uppercase tracking-widest mb-1.5">Net Investment</span>
                                                <span className="text-sm font-medium text-white/90 font-mono tabular-nums">{formatCurrency(asset.totalCost, asset.brokerCurrency)}</span>
                                            </div>
                                            <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl p-3">
                                                <span className="block text-[0.75rem] text-[#D4AF37]/60 uppercase tracking-widest mb-1.5">Current Value</span>
                                                <span className="text-sm font-bold text-[#D4AF37] font-mono tabular-nums drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">{formatCurrency(asset.currentValue, asset.brokerCurrency)}</span>
                                            </div>
                                            {!isCash && (
                                                <div className="col-span-2 bg-white/[0.02] border border-white/5 rounded-xl p-3 flex justify-between items-center">
                                                    <span className="text-[0.75rem] text-white/40 uppercase tracking-widest">Total P&L</span>
                                                    <span className={`text-sm font-bold tracking-wider rounded-md font-mono tabular-nums ${asset.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {asset.pnl >= 0 ? '+' : ''}{formatCurrency(asset.pnl, asset.brokerCurrency)} ({asset.roi >= 0 ? '+' : ''}{asset.roi.toFixed(1)}%)
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
                                            <button onClick={() => handleBuyClick(asset)}
                                                className="flex-1 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors">
                                                {isCash ? 'Deposit' : '+ Buy More'}
                                            </button>
                                            <button onClick={() => handleSellClick(asset)}
                                                className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors">
                                                {isCash ? 'Withdraw' : '- Sell'}
                                            </button>
                                        </div>
                                    );
                                }}
                                renderTimeline={(asset: any) => {
                                    const assetHistory = sortedTr.filter((t: any) => t.asset === asset.asset && t.broker === asset.broker);
                                    return (
                                        <TransactionTimeline
                                            transactions={assetHistory}
                                            onEdit={handleEditClick}
                                            onDelete={handleDeleteClick}
                                            renderItem={(tr: any) => {
                                                const isSell = tr.investment < 0;
                                                return (
                                                    <>
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${!isSell ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                            <span className="font-medium text-[0.75rem] text-white/90 uppercase tracking-wider font-space">
                                                                {!isSell ? 'Bought' : 'Sold'}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-sm font-bold text-white tracking-tight font-mono tabular-nums">
                                                                {formatCurrency(Math.abs(tr.investment), tr.currency || 'GBP')}
                                                            </span>
                                                            <span className="text-[0.75rem] text-white/40 font-mono tabular-nums tracking-tight leading-relaxed">
                                                                {tr.quantity?.toLocaleString(undefined, { maximumFractionDigits: 2 })} units <br /> {tr.date}
                                                            </span>
                                                        </div>
                                                    </>
                                                )
                                            }}
                                        />
                                    );
                                }}
                            />
                        </div>
                    </div>

                {/* Transaction Ledger */}
                <section id="ftue-crypto-ledger" className="max-w-3xl mx-auto mb-10 mt-12">
                    <div className="flex justify-between items-center mb-6 px-1">
                        <h3 className="text-lg font-medium text-white/90 flex items-center gap-2">Activity History</h3>
                        <Button variant="ghost" size="sm" onClick={() => setLedgerOpen(!ledgerOpen)}>
                            {ledgerOpen ? 'Hide' : 'Show'} ({transactions.length})
                        </Button>
                    </div>

                    {ledgerOpen && (
                        <div className="bg-white/5 backdrop-blur-md border border-white/5 rounded-3xl p-4 sm:p-6 mb-24">
                            <TransactionTimeline
                                transactions={sortedTr}
                                onEdit={handleEditClick}
                                onDelete={handleDeleteClick}
                                renderItem={(tr: any) => {
                                    const isSell = tr.investment < 0;
                                    const cur = tr.currency || 'GBP';
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
                                                <span className="text-sm font-bold text-white tracking-tight">
                                                    {formatCurrency(Math.abs(tr.investment), cur)}
                                                </span>
                                                <span className="text-xs text-white/40">• {tr.quantity?.toLocaleString(undefined, { maximumFractionDigits: 2 })} units • {tr.date}</span>
                                            </div>
                                            {isSell && tr.pnl !== null && tr.pnl !== undefined && (
                                                <div className="mt-1.5">
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${tr.pnl >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                        P&L: {tr.pnl >= 0 ? '+' : ''}{formatCurrency(tr.pnl, cur)}
                                                        {tr.roiPercent !== null && tr.roiPercent !== undefined ? ` (${tr.roiPercent >= 0 ? '+' : ''}${parseFloat(tr.roiPercent).toFixed(1)}%)` : ''}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    )
                                }}
                            />
                        </div>
                    )}
                </section>

                <FloatingActionButton
                    brokerLabel="Add Exchange"
                    onAddBroker={() => setRightPaneMode('add-broker')}
                    onAddTransaction={() => handleNewBuyClick('')}
                />

                <ConfirmationModal
                    isOpen={isDeleteModalOpen}
                    title="Delete Transaction"
                    message="Are you sure you want to delete this equity transaction?"
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setIsDeleteModalOpen(false)}
                />
                <ConfirmationModal
                    isOpen={isDeleteBrokerModalOpen}
                    title="Delete Broker"
                    message={`Are you sure you want to delete the broker "${brokerToDelete}"? This cannot be undone.`}
                    onConfirm={handleConfirmDeleteBroker}
                    onCancel={() => { setIsDeleteBrokerModalOpen(false); setBrokerToDelete(null); }}
                />

                {renderSellModal()}
            </div>
            <PageTutorialOverlay pageId="crypto" steps={CRYPTO_TUTORIAL_STEPS} />
        </PullToRefresh>
    );
}
