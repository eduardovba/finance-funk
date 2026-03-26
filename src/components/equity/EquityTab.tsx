import React from 'react';
import { Button } from '@/components/ui';
import _ConfirmationModal from '../ConfirmationModal';
import _TransactionTimeline from '../TransactionTimeline';
import _FloatingActionButton from '../FloatingActionButton';
import _PersonalizedEmptyState from '../ftue/PersonalizedEmptyState';
import _AssetCardSkeleton from '../AssetCardSkeleton';
import _ContextPane from '../ContextPane';
import _AssetLogo from '../AssetLogo';
import _PageTutorialOverlay from '../ftue/PageTutorialOverlay';
import _PullToRefresh from '../PullToRefresh';
const ConfirmationModal = _ConfirmationModal as any;
const TransactionTimeline = _TransactionTimeline as any;
const FloatingActionButton = _FloatingActionButton as any;
const PersonalizedEmptyState = _PersonalizedEmptyState as any;
const AssetCardSkeleton = _AssetCardSkeleton as any;
const ContextPane = _ContextPane as any;
const AssetLogo = _AssetLogo as any;
const PageTutorialOverlay = _PageTutorialOverlay as any;
const PullToRefresh = _PullToRefresh as any;

import { formatCurrency } from '@/lib/currency';
import useEquity, { BROKER_CURRENCY } from './useEquity';
import EquityHeader from './EquityHeader';
import EquityBrokerSection from './EquityBrokerSection';
import EquityForm from './EquityForm';
import type { EquityTabProps } from './types';

const EQUITY_TUTORIAL_STEPS = [
    { type: 'spotlight', targetId: 'ftue-equity-header', title: 'Portfolio Pulse 📈', message: "Your total equity value, what you put in, and what you've made — all in one view. Switch currencies to see it your way.", position: 'bottom' },
    { type: 'spotlight', targetId: 'ftue-equity-broker-section', title: 'Broker Breakdown 🏦', message: "Each broker opens up to show individual holdings, P&L, and actions. Toggle 'Show Empty' if you want to see everything.", position: 'bottom' },
    { type: 'spotlight', targetId: 'ftue-equity-ledger', title: 'Activity Feed 📋', message: "Every buy, sell, and dividend — all logged here. You can edit or delete any entry.", position: 'top' },
    { type: 'spotlight', targetId: 'ftue-equity-empty', title: 'Ready to Roll? 🎸', message: "Your equity page is a blank canvas. Hit '+' to add your first stock or ETF!", position: 'top' },
    { type: 'spotlight', targetId: 'ftue-equity-fab', title: 'Add Something! ➕', message: "Tap '+' to add a broker, buy your first stock, or record a sale. Let's build this portfolio!", position: 'top' },
];

export default function EquityTab({ transactions = [], marketData: globalMarketData, rates, onRefresh }: EquityTabProps) {
    const h = useEquity({ transactions, marketData: globalMarketData, rates, onRefresh });
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

    const { renderEmptyState } = EquityForm({
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
                            <EquityHeader
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

                            <div id="ftue-equity-broker-section">
                            <div className="flex justify-between items-center mb-4 px-2">
                                <h2 className="text-xl font-bold font-bebas tracking-widest text-white/90">Brokers</h2>
                                <Button variant="ghost" size="sm" onClick={() => setShowEmptyBrokers(!showEmptyBrokers)}
                                    className="rounded-full border border-white/5">
                                    {showEmptyBrokers ? 'Hide Empty' : 'Show Empty'}
                                </Button>
                            </div>

                            {brokers.map(b => (
                                <EquityBrokerSection
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
                        <div id="ftue-equity-empty">
                        <PersonalizedEmptyState
                            copyKey="emptyEquity"
                            actionLabel="Add Broker"
                            onAction={() => setRightPaneMode('add-broker')}
                        />
                        </div>
                    )}

                    {/* Transaction Ledger Accordion */}
                    <div id="ftue-equity-ledger" className="mt-12 mb-10 rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
                        <button
                            onClick={() => setLedgerOpen(!ledgerOpen)}
                            className="w-full flex items-center justify-between border-none cursor-pointer" style={{ padding: '16px 20px', background: 'transparent', borderBottom: ledgerOpen ? '1px solid rgba(255,255,255,0.06)' : 'none', transition: 'all 0.2s ease', }}
                        >
                            <div className="flex items-center gap-2.5">
                                <span className="text-sm">📋</span>
                                <span className="text-[13px] font-semibold tracking-[0.3px]" style={{ color: 'rgba(245,245,220,0.7)' }}>Activity History</span>
                                <span className="text-[11px] font-normal" style={{ color: 'rgba(245,245,220,0.3)' }}>({transactions.length} transactions)</span>
                            </div>
                            <span className="text-xs inline-block" style={{ color: 'rgba(245,245,220,0.35)', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', transform: ledgerOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                        </button>

                        <div style={{ maxHeight: ledgerOpen ? 'calc(100vh - 12rem)' : '0', overflow: ledgerOpen ? 'auto' : 'hidden', transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                            <div className="p-4 sm:p-6 bg-transparent">
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
                                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${tr.pnl >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
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
                        </div>
                    </div>

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
                                            <span className="px-2 py-0.5 rounded bg-white/10 text-white/60 text-data-xs font-space  tracking-wider">{asset.broker}</span>
                                            {asset.ticker && <span className="px-2 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37] text-data-xs font-space  tracking-wider">{asset.ticker}</span>}
                                        </div>
                                    </div>
                                )}
                                renderDetails={(asset: any) => {
                                    const isCash = asset.asset === 'Cash';
                                    return (
                                        <div className="grid grid-cols-2 gap-4">
                                            {!isCash && (
                                                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                                    <span className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">Shares Hosted</span>
                                                    <span className="text-data-sm font-medium text-white/90 font-space ">{Math.abs(asset.qty).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                                                </div>
                                            )}
                                            {!isCash && (
                                                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                                    <span className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">Live Price</span>
                                                    <span className="text-data-sm font-medium text-white/90 font-space ">{asset.livePrice ? formatCurrency(asset.livePrice, asset.brokerCurrency) : 'N/A'}</span>
                                                </div>
                                            )}
                                            {!isCash && (
                                                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                                    <span className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">Cost Basis</span>
                                                    <span className="text-data-sm font-medium text-white/90 font-space ">{formatCurrency(asset.totalCost, asset.brokerCurrency)}</span>
                                                </div>
                                            )}
                                            <div className={`${isCash ? 'col-span-2' : ''} bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl p-3`}>
                                                <span className="block text-xs text-[#D4AF37]/60 uppercase tracking-widest mb-1.5">Current Value</span>
                                                <span className="text-data-sm font-bold text-[#D4AF37] font-space  drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">{formatCurrency(asset.currentValue, asset.brokerCurrency)}</span>
                                            </div>
                                            {!isCash && (
                                                <div className="col-span-2 bg-white/[0.02] border border-white/5 rounded-xl p-3 flex justify-between items-center">
                                                    <span className="text-xs text-white/40 uppercase tracking-widest">Total P&L</span>
                                                    <span className={`text-data-sm font-bold tracking-wider rounded-lg font-space  ${asset.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
                                                            <span className="font-medium text-xs text-white/90 uppercase tracking-wider font-space">
                                                                {!isSell ? 'Bought' : 'Sold'}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-data-sm font-bold text-white tracking-tight font-space ">
                                                                {formatCurrency(Math.abs(tr.investment), tr.currency || 'GBP')}
                                                            </span>
                                                            <span className="text-data-xs text-white/40 font-space  tracking-tight leading-relaxed">
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



                <FloatingActionButton
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

            </div>
            <PageTutorialOverlay pageId="equity" steps={EQUITY_TUTORIAL_STEPS} />
        </PullToRefresh>
    );
}
