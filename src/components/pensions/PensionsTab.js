import React from 'react';
import ConfirmationModal from '../ConfirmationModal';
import AssetSearch from '../AssetSearch';
import { formatCurrency, convertCurrency } from '@/lib/currency';
import pensionMap from '../../data/pension_fund_map.json';
import AssetCard from '../AssetCard';
import TransactionTimeline from '../TransactionTimeline';
import FloatingActionButton from '../FloatingActionButton';
import EmptyState from '../EmptyState';
import PullToRefresh from '../PullToRefresh';
import DesktopAssetTable from '../DesktopAssetTable';
import ContextPane from '../ContextPane';
import BrokerForm from '../BrokerForm';
import AssetLogo from '../AssetLogo';
import NumberInput from '../NumberInput';
import DisplayCurrencyPicker from '../DisplayCurrencyPicker';
import PageTutorialOverlay from '../ftue/PageTutorialOverlay';
import HeroDetailDrawer from '../HeroDetailDrawer';
import usePensions, { BASE_BROKER_CURRENCY } from './usePensions';

const PENSIONS_TUTORIAL_STEPS = [
    { type: 'spotlight', targetId: 'ftue-pensions-header', title: 'Your Retirement Overview', message: "Visualize your total pension value, all contributions, precise growth figures, and a breakdown by provider. Select your preferred display currency.", position: 'bottom' },
    { type: 'spotlight', targetId: 'ftue-pensions-provider-section', title: 'Provider-Level Insights', message: "Expand a provider to review specific fund holdings, detailed P&L, and a complete history of contributions. Make buy/sell decisions directly.", position: 'bottom' },
    { type: 'spotlight', targetId: 'ftue-pensions-empty', title: 'Retirement Planning Start', message: "It looks like you haven\u2019t added any pension accounts. Secure your future by adding a provider to start tracking your retirement funds.", position: 'top' },
    { type: 'spotlight', targetId: 'global-fab', title: 'Build Your Legacy', message: "Use \u2018+\u2019 to add a pension provider, buy into funds, or sell positions. We automatically track contributions versus growth for clear insight.", position: 'top', shape: 'circle', padding: 8 },
];

export default function PensionsTab({ transactions = [], rates, onRefresh, marketData: globalMarketData, pensionPrices: globalPensionPrices }) {
    const h = usePensions({ transactions, rates, onRefresh, marketData: globalMarketData, pensionPrices: globalPensionPrices });
    const {
        ledgerOpen, setLedgerOpen,
        isDeleteModalOpen, setIsDeleteModalOpen,
        isDeleteBrokerModalOpen, setIsDeleteBrokerModalOpen,
        brokerToDelete, setBrokerToDelete,
        editingTr, setEditingTr,
        selectedAsset, setSelectedAsset,
        searchTerm, setSearchTerm,
        contextPaneMaxHeight,
        brokerDict,
        explicitDbBrokers,
        showEmptyBrokers,
        expandedBrokers,
        toggleBroker,
        newlyAddedBrokers, setNewlyAddedBrokers,
        rightPaneMode, setRightPaneMode,
        sellData, setSellData,
        buyData, setBuyData,
        isFetchingPrice,
        ledgerSortKey, ledgerSortDir,
        marketData, livePrices,
        activeHoldings, lockedPnL,
        brokers_list,
        topCurrency, effectiveCurrency,
        handleLedgerSort, sortArrow,
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

    const thStyle = { padding: '12px 16px', color: 'var(--fg-secondary)', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' };
    const thSortable = { ...thStyle, cursor: 'pointer', userSelect: 'none' };

    const renderBrokerTable = (brokerName, items) => {
        // Ensure Cash row exists
        let rows = [...items];
        const isNewlyAdded = newlyAddedBrokers.includes(brokerName);
        if (!showEmptyBrokers && !isNewlyAdded && (items.length === 0 && (!lockedPnL[brokerName] || lockedPnL[brokerName] === 0))) return null;
        if (!rows.find(r => r.asset === 'Cash')) {
            rows.push({ asset: 'Cash', qty: 0, totalCost: 0, broker: brokerName, currentValue: 0, pnl: 0, roi: 0 });
        }

        const cur = brokerDict[brokerName] || BASE_BROKER_CURRENCY[brokerName] || 'GBP';

        let totalCurrentValue = 0;
        let totalPurchasePrice = 0;

        // Calculate rows
        rows = rows.map(h => {
            // Check for Ticker mapping first (for MSTR etc)
            const mapItem = pensionMap.find(m => m.asset === h.asset);
            let livePrice = null;
            let priceCurrency = 'GBP';

            if (mapItem && mapItem.ticker && marketData[mapItem.ticker]) {
                livePrice = marketData[mapItem.ticker].price;
                priceCurrency = marketData[mapItem.ticker].currency || 'GBP';
            } else {
                const priceData = livePrices[h.asset];
                livePrice = priceData ? priceData.price : null;
                priceCurrency = priceData ? priceData.currency : 'GBP';
            }

            // FX Conversion if needed
            // Broker currency is usually GBP.
            // If asset is USD, convert.
            const brokerCur = brokerDict[brokerName] || BASE_BROKER_CURRENCY[brokerName] || 'GBP';

            if (livePrice && priceCurrency !== brokerCur) {
                if (priceCurrency === 'USD' && brokerCur === 'GBP') {
                    const rate = rates['GBP-USD'] || 1.25;
                    livePrice = livePrice / rate;
                }
                // Add other pairs if needed
            }

            // If live price exists, use it. Else default to totalCost fallback
            const currentValue = livePrice ? livePrice * h.qty : h.totalCost;

            const pnl = currentValue - h.totalCost;
            const roi = h.totalCost !== 0 ? (pnl / h.totalCost * 100) : 0;
            const valuePerShare = h.qty !== 0 ? currentValue / h.qty : 0;

            totalCurrentValue += currentValue;
            totalPurchasePrice += h.totalCost;
            return { ...h, currentValue, pnl, roi, valuePerShare, livePrice };
        });

        // Sort: Cash top, then value desc
        rows.sort((a, b) => {
            if (a.asset === 'Cash') return -1;
            if (b.asset === 'Cash') return 1;
            return (b.currentValue || 0) - (a.currentValue || 0);
        });

        const totalPnL = totalCurrentValue - totalPurchasePrice + (lockedPnL[brokerName] || 0);

        const isOpen = expandedBrokers[brokerName] || isNewlyAdded;
        const glowClass = isNewlyAdded ? 'shadow-[0_0_25px_rgba(212,175,55,0.4)] border-[#D4AF37] ring-1 ring-[#D4AF37]/50' : '';

        return (
            <div key={brokerName} id={encodeURIComponent(brokerName)} className={`mb-8 rounded-2xl transition-all duration-1000 ${glowClass}`}>
                <div
                    onClick={() => toggleBroker(brokerName)}
                    className="flex justify-between items-center mb-4 px-4 py-3 cursor-pointer bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] hover:bg-[#121418]/70 rounded-2xl transition-colors shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
                >
                    <div className="flex items-center gap-3">
                        <span className="text-white/40 transform transition-transform duration-300 text-xs" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                        <div className="flex flex-col">
                            <h3 className="text-lg font-semibold text-white/90 m-0">{brokerName}</h3>
                            <span className={`text-xs font-semibold mt-0.5 ${totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL, cur)} ({totalPurchasePrice !== 0 ? ((totalPnL / totalPurchasePrice * 100) >= 0 ? '+' : '') + (totalPnL / totalPurchasePrice * 100).toFixed(1) : '0.0'}%)
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                            <span className="text-xl font-bold text-white tracking-tight">{formatCurrency(totalCurrentValue, cur)}</span>
                            <span className="text-xs text-white/40 mt-0.5">Cost: {formatCurrency(totalPurchasePrice, cur)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            {(explicitDbBrokers.includes(brokerName) || items.length === 0) && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteBrokerClick(brokerName); }}
                                    className="w-8 h-8 rounded-full bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center transition-colors shrink-0 text-sm"
                                    title="Delete Broker"
                                >
                                    🗑️
                                </button>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); handleNewBuyClick(brokerName); }}
                                className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex items-center justify-center text-lg font-bold transition-colors shrink-0"
                                title="Add Transaction"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>

                {isOpen && (
                    <>
                        <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {rows.map(r => {
                                const isCash = r.asset === 'Cash';
                                return (
                                    <AssetCard
                                        key={r.asset}
                                        title={r.asset}
                                        subtitle={r.ticker || (isCash ? 'Liquid' : '-')}
                                        value={formatCurrency(r.currentValue, cur)}
                                        performance={isCash ? null : `${r.pnl >= 0 ? '+' : ''}${formatCurrency(r.pnl, cur)} (${(r.roi || 0).toFixed(1)}%)`}
                                        isPositive={r.pnl >= 0}
                                        icon={isCash ? '💵' : <AssetLogo ticker={r.ticker} name={r.asset} size={40} />}
                                        expandedContent={
                                            <div className="flex flex-col gap-3 py-2">
                                                <div className="grid grid-cols-2 gap-4">
                                                    {!isCash && (
                                                        <div>
                                                            <span className="block text-xs text-white/40 mb-1">Shares Hosted</span>
                                                            <span className="text-sm font-medium text-white/90">{Math.abs(r.qty).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                                                        </div>
                                                    )}
                                                    {!isCash && (
                                                        <div>
                                                            <span className="block text-xs text-white/40 mb-1">Live Price</span>
                                                            <span className="text-sm font-medium text-white/90">{r.livePrice ? formatCurrency(r.livePrice, cur) : 'N/A'}</span>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <span className="block text-xs text-white/40 mb-1">{isCash ? 'Deposits' : 'Purchase Price'}</span>
                                                        <span className="text-sm font-medium text-white/90">{formatCurrency(r.totalCost, cur)}</span>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleBuyClick(r); }}
                                                        className="flex-1 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-semibold transition-colors"
                                                    >
                                                        {isCash ? 'Deposit' : 'Buy'}
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleSellClick(r); }}
                                                        className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-sm font-semibold transition-colors"
                                                    >
                                                        {isCash ? 'Withdraw' : 'Sell'}
                                                    </button>
                                                </div>
                                            </div>
                                        }
                                    />
                                );
                            })}

                            {lockedPnL[brokerName] && lockedPnL[brokerName] !== 0 && (
                                <div className="bg-white/5 rounded-3xl p-4 border border-white/10 flex flex-col justify-center">
                                    <span className="text-xs text-white/40 mb-1 font-medium tracking-wide uppercase">Realised P&L</span>
                                    <span className={`text-lg font-bold ${lockedPnL[brokerName] >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {lockedPnL[brokerName] >= 0 ? '+' : ''}{formatCurrency(lockedPnL[brokerName], cur)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Desktop List View — Trading 212 Style */}
                        <div className="hidden lg:block">
                            <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#121418]/50 backdrop-blur-lg shadow-[0_4px_16px_rgba(0,0,0,0.3)] divide-y divide-white/[0.04]">
                                {rows.map(r => {
                                    const isCash = r.asset === 'Cash';
                                    const isSelected = selectedAsset && selectedAsset.asset === r.asset;
                                    const displayName = r.asset.length > 25 ? r.asset.substring(0, 24) + '…' : r.asset;

                                    return (
                                        <div
                                            key={r.asset}
                                            onClick={() => setSelectedAsset({ ...r, brokerCurrency: cur })}
                                            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 group ${isSelected
                                                ? 'bg-white/[0.08] border-l-2 border-l-[#D4AF37]'
                                                : 'hover:bg-white/[0.04] border-l-2 border-l-transparent'
                                                }`}
                                        >
                                            {/* Logo */}
                                            {isCash ? (
                                                <div className="w-9 h-9 min-w-[36px] rounded-full bg-emerald-500/20 flex items-center justify-center text-lg shrink-0">💵</div>
                                            ) : (
                                                <AssetLogo ticker={r.ticker} name={r.asset} size={36} />
                                            )}

                                            {/* Name & Shares */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-white/90 truncate leading-tight">{displayName}</p>
                                                <p className="text-[11px] text-white/40 mt-0.5 font-mono">
                                                    {isCash
                                                        ? 'Liquid'
                                                        : `${Math.abs(r.qty).toLocaleString(undefined, { maximumFractionDigits: 4 })} shares${r.ticker ? ` · ${r.ticker}` : ''}`
                                                    }
                                                </p>
                                            </div>

                                            {/* Value & P&L */}
                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-bold text-white tracking-tight leading-tight">{formatCurrency(r.currentValue, cur)}</p>
                                                {!isCash && (
                                                    <p className={`text-[11px] mt-0.5 font-semibold ${r.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                                        }`}>
                                                        {r.pnl >= 0 ? '+' : ''}{formatCurrency(r.pnl, cur)} ({r.roi >= 0 ? '+' : ''}{(r.roi || 0).toFixed(1)}%)
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {lockedPnL[brokerName] && lockedPnL[brokerName] !== 0 && (
                                <div className="mt-4 bg-white/5 rounded-2xl p-4 border border-white/10 flex justify-between items-center w-72">
                                    <span className="text-xs text-white/40 font-medium tracking-wide uppercase">Realised P&L</span>
                                    <span className={`text-sm font-bold ${lockedPnL[brokerName] >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {lockedPnL[brokerName] >= 0 ? '+' : ''}{formatCurrency(lockedPnL[brokerName], cur)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {isOpen && items.length === 0 && !lockedPnL[brokerName] && (
                    <div className="px-4 pb-4">
                        <div className="bg-white/[0.02] rounded-xl border border-white/5 p-6 text-center">
                            <p className="text-white/40 text-sm">No holdings in this broker yet.</p>
                            <button onClick={() => handleNewBuyClick(brokerName)}
                                className="mt-3 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm font-medium transition-colors text-white/70">
                                Add a Holding
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderConsolidated = () => {
        let totalGBP = 0;
        let totalCostGBP = 0;
        let totalLockedGBP = 0;

        const brokerSummaries = brokers_list.map(b => {
            // For Pensions, items are filtered from activeHoldings
            const items = activeHoldings.filter(h => h.broker === b);
            const cur = brokerDict[b] || BASE_BROKER_CURRENCY[b] || 'GBP';
            let cv = 0, pp = 0;

            items.forEach(h => {
                // Determine price & currency
                let rawPrice = 0;
                let assetCurrency = cur;

                // Logic mirrors renderBrokerTable
                // Check map first
                const mapEntry = pensionMap.find(m => m.asset === h.asset);

                if (h.asset === 'Cash') {
                    rawPrice = 1.0;
                } else if (mapEntry && mapEntry.ticker && marketData[mapEntry.ticker]) {
                    // Market Data (MSTR)
                    rawPrice = marketData[mapEntry.ticker].price;
                    assetCurrency = marketData[mapEntry.ticker].currency || 'USD';
                } else if (livePrices[h.asset]) {
                    // Scraped Data
                    rawPrice = livePrices[h.asset].price;
                    assetCurrency = livePrices[h.asset].currency; // Usually GBP
                } else {
                    // Fallback to cost
                    rawPrice = h.qty > 0 ? (h.totalCost / h.qty) : 0;
                }

                // FX Logic to convert assetCurrency -> Broker Currency (cur)
                let lp = rawPrice;
                if (assetCurrency !== cur && rawPrice > 0 && rates) {
                    if (cur === 'GBP') {
                        if (assetCurrency === 'USD') lp = rawPrice / rates.USD;
                        else if (assetCurrency === 'BRL') lp = rawPrice / rates.BRL;
                    } else if (cur === 'USD') {
                        if (assetCurrency === 'GBP') lp = rawPrice * rates.USD;
                        else if (assetCurrency === 'BRL') lp = (rawPrice / rates.BRL) * rates.USD;
                    }
                }

                cv += lp ? lp * Math.abs(h.qty) : h.totalCost;
                pp += h.totalCost;
            });

            const locked = lockedPnL[b] || 0;

            // Convert Broker Summary to GBP first, then to effectiveCurrency
            const toBase = (amount, currency) => {
                if (!rates) return amount;
                return convertCurrency(amount, currency, effectiveCurrency, rates);
            };

            const cvBase = toBase(cv, cur);
            const ppBase = toBase(pp, cur);
            const lockedBase = toBase(locked, cur);

            totalGBP += cvBase;
            totalCostGBP += ppBase;
            totalLockedGBP += lockedBase;

            const pnl = cvBase - ppBase + lockedBase;
            const roi = ppBase !== 0 ? (pnl / ppBase * 100) : 0;

            return { broker: b, currentValue: cvBase, purchasePrice: ppBase, pnl, roi };
        });

        const totalPnL = totalGBP - totalCostGBP + totalLockedGBP;
        const totalROI = totalCostGBP !== 0 ? totalPnL / totalCostGBP * 100 : 0;

        return (
            <div id="ftue-pensions-header" className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden mb-12">
                {/* Hero Total */}
                <div id="ftue-pensions-hero" style={{
                    padding: '24px',
                    background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(255,255,255,0) 100%)',
                    borderBottom: '1px solid var(--glass-border)',
                    textAlign: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--fg-secondary)', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        🛡️ Pension Portfolio
                        <DisplayCurrencyPicker topCurrency={topCurrency} category="pensions" />
                    </div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>{formatCurrency(totalGBP, effectiveCurrency)}</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--fg-secondary)' }}>Invested: {formatCurrency(totalCostGBP, effectiveCurrency)}</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: totalPnL >= 0 ? 'var(--vu-green)' : 'var(--error)' }}>
                            {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL, effectiveCurrency)} ({totalROI >= 0 ? '+' : ''}{totalROI.toFixed(1)}%)
                        </span>
                    </div>
                </div>

                {/* Broker Summary Cards */}
                <div id="ftue-pensions-providers" style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    {brokerSummaries.filter(s => s.currentValue > 0.01 || s.purchasePrice > 0.01).map(s => (
                        <div
                            key={s.broker}
                            onClick={() => {
                                const el = document.getElementById(encodeURIComponent(s.broker));
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className="cursor-pointer hover:bg-white/5 transition-colors"
                            style={{
                                padding: '16px',
                                borderRadius: '16px',
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{
                                position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px',
                                background: s.pnl >= 0 ? '#10b981' : '#ef4444',
                                borderRadius: '3px 0 0 3px'
                            }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff', marginBottom: '4px' }}>{s.broker}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--fg-secondary)' }}>Cost: {formatCurrency(s.purchasePrice, effectiveCurrency)}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>{formatCurrency(s.currentValue, effectiveCurrency)}</div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: s.pnl >= 0 ? 'var(--vu-green)' : 'var(--error)', marginTop: '2px' }}>
                                        {s.pnl >= 0 ? '+' : ''}{formatCurrency(s.pnl, effectiveCurrency)} ({s.roi >= 0 ? '+' : ''}{s.roi.toFixed(1)}%)
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <HeroDetailDrawer categoryId="pensions" effectiveCurrency={effectiveCurrency} totalCurrentValue={totalGBP} />
            </div>
        );
    };

    return (
        <PullToRefresh onRefresh={onRefresh} disabledOnDesktop={true}>
            <div className="max-w-[1800px] mx-auto w-full pt-4 lg:pt-8">
                {/* Mobile Search Bar */}
                <div className="mb-8 w-full block lg:hidden relative px-4">
                    <input
                        type="text"
                        placeholder="Search holdings..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-12 text-white/90 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all placeholder:text-white/30 backdrop-blur-md shadow-lg"
                    />
                    <span className="absolute left-8 lg:left-4 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
                </div>

                <div className="lg:flex lg:gap-8 lg:items-start">
                    <div className="flex-1 min-w-0">
                    {(activeHoldings.length > 0 || transactions.length > 0) ? (
                        <>
                            {renderConsolidated()}

                            <div id="ftue-pensions-provider-section">
                            {/* Brokers Header & Toggle */}
                            <div className="flex justify-between items-center mb-4 px-2">
                                <h2 className="text-xl font-bold font-bebas tracking-widest text-white/90">Brokers</h2>
                                <button
                                    onClick={() => setShowEmptyBrokers(!showEmptyBrokers)}
                                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 transition-colors border border-white/5"
                                >
                                    {showEmptyBrokers ? 'Hide Empty' : 'Show Empty'}
                                </button>
                            </div>

                            {combined_brokers.map(b => renderBrokerTable(b, groupBroker(b)))}
                            </div>
                        </>
                    ) : (
                        <div id="ftue-pensions-empty">
                        <EmptyState
                            icon="🛡️"
                            title="No Pension Accounts"
                            message="You have no pension accounts yet. Add a provider to start tracking your retirement funds."
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
                                renderHeader={(asset, nameHandledByContextPane) => (
                                    <div className="flex flex-col">
                                        {!nameHandledByContextPane && <h3 className="text-xl font-bold text-white/90 tracking-tight">{asset.asset}</h3>}
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] uppercase font-mono tracking-wider">{asset.broker}</span>
                                            {asset.ticker && <span className="px-2 py-0.5 rounded bg-white/10 text-white/70 text-[10px] font-mono tracking-wider">{asset.ticker}</span>}
                                        </div>
                                    </div>
                                )}
                                renderDetails={(asset) => {
                                    const isCash = asset.asset === 'Cash';
                                    const cur = brokerDict[asset.broker] || BASE_BROKER_CURRENCY[asset.broker] || 'GBP';
                                    return (
                                        <div className="grid grid-cols-2 gap-4">
                                            {!isCash && (
                                                <>
                                                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                                        <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5">Units</span>
                                                        <span className="text-sm font-medium text-white/90 font-mono">{Math.abs(asset.qty).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                                                    </div>
                                                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                                        <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5">Unit Price</span>
                                                        <span className="text-sm font-medium text-white/90 font-mono">{formatCurrency(asset.valuePerShare, cur)}</span>
                                                    </div>
                                                </>
                                            )}
                                            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                                <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5">Cost Basis</span>
                                                <span className="text-sm font-medium text-white/90 font-mono">{formatCurrency(asset.totalCost, cur)}</span>
                                            </div>
                                            <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl p-3">
                                                <span className="block text-[10px] text-[#D4AF37]/60 uppercase tracking-widest mb-1.5">Current Value</span>
                                                <span className="text-sm font-bold text-[#D4AF37] font-mono drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">{formatCurrency(asset.currentValue, cur)}</span>
                                            </div>
                                            {!isCash && (
                                                <div className="col-span-2 bg-white/[0.02] border border-white/5 rounded-xl p-3 flex justify-between items-center">
                                                    <span className="text-[10px] text-white/40 uppercase tracking-widest">P&L</span>
                                                    <span className={`text-sm font-bold tracking-wider rounded-md font-mono ${asset.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {asset.pnl >= 0 ? '+' : ''}{formatCurrency(asset.pnl, cur)} ({asset.roi >= 0 ? '+' : ''}{asset.roi.toFixed(1)}%)
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }}
                                renderActions={(asset) => {
                                    const isCash = asset.asset === 'Cash';
                                    return (
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleBuyClick(asset)}
                                                className="flex-1 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors"
                                            >
                                                {isCash ? 'Deposit' : 'Buy'}
                                            </button>
                                            <button
                                                onClick={() => handleSellClick(asset)}
                                                className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors"
                                            >
                                                {isCash ? 'Withdraw' : 'Sell'}
                                            </button>
                                        </div>
                                    );
                                }}
                                renderTimeline={(asset) => {
                                    const history = transactions.filter(t => t.asset === asset.asset && t.broker === asset.broker).sort((a, b) => new Date(b.date) - new Date(a.date));
                                    const cur = brokerDict[asset.broker] || 'GBP';
                                    return (
                                        <TransactionTimeline
                                            transactions={history}
                                            onEdit={handleEditClick}
                                            onDelete={handleDeleteClick}
                                            renderItem={(tr) => {
                                                const isSell = tr.type === 'Sell';
                                                return (
                                                    <>
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${!isSell ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                            <span className="font-medium text-[10px] text-white/90 uppercase tracking-wider font-space">
                                                                {tr.type}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-sm font-bold text-white tracking-tight font-mono">
                                                                {formatCurrency(parseFloat(tr.value) || parseFloat(tr.amount) || 0, cur)}
                                                            </span>
                                                            <span className="text-[10px] text-white/40 font-mono tracking-tight leading-relaxed">
                                                                {tr.date} {tr.quantity ? `• ${tr.quantity} units` : ''}
                                                            </span>
                                                        </div>
                                                    </>
                                                );
                                            }}
                                        />
                                    );
                                }}
                                renderEmptyState={() => {
                                    if (rightPaneMode === 'add-transaction' && buyData) {
                                        return (
                                            <div className="w-full h-full p-8 text-left relative flex flex-col z-10">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h3 className="text-lg font-bold text-white">Add Pension Asset</h3>
                                                    <button onClick={() => { setRightPaneMode('default'); setBuyData(null); }} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors"><span className="text-sm font-bold">✕</span></button>
                                                </div>

                                                <div className="flex bg-white/5 rounded-2xl p-1 mb-6">
                                                    {['search', 'manual'].map(p => (
                                                        <button
                                                            key={p}
                                                            onClick={() => setBuyData(prev => ({ ...prev, buyPath: p }))}
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
                                                            <div className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/70 text-sm font-mono">{buyData.broker}</div>
                                                        </div>
                                                        <div>
                                                            <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">Currency</label>
                                                            <div className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/70 text-sm font-mono">{buyData.currency}</div>
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
                                                                    <button onClick={() => setBuyData(prev => ({ ...prev, ticker: '', asset: '' }))} className="text-rose-400 hover:text-rose-300">✕</button>
                                                                </div>
                                                            ) : (
                                                                <AssetSearch onSelect={handleAssetSelect} />
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div>
                                                                <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">Asset Name</label>
                                                                <input type="text" value={buyData.asset} onChange={e => setBuyData(prev => ({ ...prev, asset: e.target.value }))}
                                                                    placeholder="e.g. Fidelity World Index"
                                                                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all" />
                                                            </div>
                                                            <div>
                                                                <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">Scraper URL</label>
                                                                <div className="flex gap-2">
                                                                    <input type="text" value={buyData.scraperUrl} onChange={e => setBuyData(prev => ({ ...prev, scraperUrl: e.target.value, isVerified: false }))}
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
                                                            <input type="date" value={buyData.date} onChange={e => setBuyData(prev => ({ ...prev, date: e.target.value }))}
                                                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all [color-scheme:dark]" />
                                                        </div>
                                                        <div>
                                                            <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">Ticker (Meta)</label>
                                                            <input type="text" value={buyData.ticker} readOnly={buyData.buyPath === 'search'}
                                                                onChange={e => setBuyData(prev => ({ ...prev, ticker: e.target.value }))}
                                                                className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all ${buyData.buyPath === 'search' ? 'bg-white/[0.02] border-white/5 text-white/50' : 'bg-white/5 border-white/10 text-white'}`} />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">Quantity</label>
                                                            <input type="number" value={buyData.qtyToBuy} onChange={e => updateBuyCalc('qtyToBuy', e.target.value)}
                                                                step="any" placeholder="0.00"
                                                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all font-mono" />
                                                        </div>
                                                        <div className="relative">
                                                            <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">Price / Share</label>
                                                            <input type="number" value={buyData.buyPricePerShare} onChange={e => updateBuyCalc('buyPricePerShare', e.target.value)}
                                                                step="any" placeholder="0.00"
                                                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all font-mono" />
                                                            {isFetchingPrice && <span className="absolute right-3 top-[34px] text-[10px] text-[#D4AF37] uppercase tracking-wider font-semibold animate-pulse">Fetching...</span>}
                                                        </div>
                                                    </div>

                                                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 mt-2">
                                                        <label className="block mb-1 text-emerald-400/70 text-xs font-medium uppercase tracking-wider">Total Investment</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 font-mono">
                                                                {buyData.currency === 'BRL' ? 'R$' : (buyData.currency === 'USD' ? '$' : '£')}
                                                            </span>
                                                            <input
                                                                type="number"
                                                                value={buyData.totalInvestment}
                                                                onChange={e => updateBuyCalc('totalInvestment', e.target.value)}
                                                                step="any"
                                                                className="w-full py-2.5 pl-8 pr-3 bg-white/5 border border-emerald-500/30 rounded-xl text-white text-lg font-bold focus:outline-none focus:border-emerald-500 transition-all font-mono"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 mt-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={buyData.isSalaryContribution || false}
                                                            onChange={e => setBuyData(prev => ({ ...prev, isSalaryContribution: e.target.checked }))}
                                                            id="buy-salary-contribution-pane"
                                                            className="w-4 h-4 accent-[#D4AF37]"
                                                        />
                                                        <label htmlFor="buy-salary-contribution-pane" className="text-white text-sm cursor-pointer">Funded by Salary Contribution</label>
                                                    </div>
                                                </div>

                                                <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-white/10 shrink-0">
                                                    <button onClick={() => { setRightPaneMode('default'); setBuyData(null); }} className="px-5 py-2.5 bg-transparent border border-white/10 rounded-xl text-white/50 text-sm hover:bg-white/5 transition-colors">Cancel</button>
                                                    <button
                                                        onClick={handleBuyConfirm}
                                                        disabled={!buyData.asset || !buyData.qtyToBuy || !buyData.buyPricePerShare}
                                                        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#1A0F2E] transition-all"
                                                        style={{ background: 'linear-gradient(135deg, #CC5500 0%, #D4AF37 100%)', opacity: (!buyData.asset || !buyData.qtyToBuy || !buyData.buyPricePerShare) ? 0.5 : 1 }}
                                                    >
                                                        Confirm Buy
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }

                                    if (rightPaneMode === 'sell-transaction' && sellData) {
                                        return (
                                            <div className="w-full h-full p-8 text-left relative flex flex-col z-10">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h3 className="text-lg font-bold text-rose-400">Sell {sellData.asset}</h3>
                                                    <button onClick={() => { setRightPaneMode('default'); setSellData(null); }} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors"><span className="text-sm font-bold">✕</span></button>
                                                </div>
                                                <p className="mb-6 text-white/60 text-sm">
                                                    {sellData.broker} · {sellData.sharesHeld.toLocaleString(undefined, { maximumFractionDigits: 4 })} units held · Avg cost: <span className="font-mono text-white/80">{formatCurrency(sellData.avgCost, sellData.currency)}</span>
                                                </p>

                                                <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 pb-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">Date</label>
                                                            <input type="date" value={sellData.date} onChange={e => setSellData(prev => ({ ...prev, date: e.target.value }))}
                                                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500/50 transition-all [color-scheme:dark]" />
                                                        </div>
                                                        <div>
                                                            <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">Currency</label>
                                                            <div className="w-full px-3 py-2.5 bg-white/[0.02] border border-white/5 rounded-xl text-white/50 text-sm font-mono">{sellData.currency}</div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">Quantity to Sell</label>
                                                            <input type="number" value={sellData.qtyToSell} onChange={e => updateSellCalc('qtyToSell', e.target.value)}
                                                                step="any"
                                                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500/50 transition-all font-mono" />
                                                        </div>
                                                        <div>
                                                            <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">Sell Price / Share</label>
                                                            <input type="number" value={sellData.sellPricePerShare} onChange={e => updateSellCalc('sellPricePerShare', e.target.value)}
                                                                step="any"
                                                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500/50 transition-all font-mono" />
                                                        </div>
                                                    </div>

                                                    <div className="bg-white/5 border border-white/10 rounded-xl p-5 mt-4 flex flex-col gap-4">
                                                        <div>
                                                            <label className="block mb-1 text-white/70 text-xs font-medium uppercase tracking-wider">Total Sale Value (Proceeds)</label>
                                                            <div className="relative">
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 font-mono">
                                                                    {sellData.currency === 'BRL' ? 'R$' : (sellData.currency === 'USD' ? '$' : '£')}
                                                                </span>
                                                                <input
                                                                    type="number"
                                                                    value={sellData.totalProceeds}
                                                                    onChange={e => updateSellCalc('totalProceeds', e.target.value)}
                                                                    step="any"
                                                                    className="w-full py-2.5 pl-8 pr-3 bg-white/5 border border-white/10 rounded-xl text-white text-lg font-bold focus:outline-none focus:border-rose-500/50 transition-all font-mono"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between items-center bg-white/5 rounded-lg p-3">
                                                            <span className="text-white/60 text-sm">Cost Basis</span>
                                                            <span className="text-white/80 font-mono text-sm">{formatCurrency((sellData.avgCost || 0) * (parseFloat(sellData.qtyToSell) || 0), sellData.currency)}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-lg p-3">
                                                            <span className="text-white text-sm font-bold">P&L</span>
                                                            <span className={`text-sm font-bold font-mono ${(sellData.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                {(sellData.pnl || 0) >= 0 ? '+' : ''}{formatCurrency(sellData.pnl || 0, sellData.currency)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-white/10 shrink-0">
                                                    <button onClick={() => { setRightPaneMode('default'); setSellData(null); }} className="px-5 py-2.5 bg-transparent border border-white/10 rounded-xl text-white/50 text-sm hover:bg-white/5 transition-colors">Cancel</button>
                                                    <button onClick={handleSellConfirm} className="px-5 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 rounded-xl text-rose-400 text-sm font-semibold transition-colors">Confirm Sell</button>
                                                </div>
                                            </div>
                                        );
                                    }

                                    if (rightPaneMode === 'add-broker') {
                                        return (
                                            <div className="w-full h-full text-left relative flex flex-col z-10">
                                                <div className="flex justify-between items-center mb-6 p-8 pb-0">
                                                    <h3 className="text-lg font-bold text-white">Add Pension Provider</h3>
                                                    <button onClick={() => setRightPaneMode('default')} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors"><span className="text-sm font-bold">✕</span></button>
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
                                                    <button onClick={() => { setRightPaneMode('default'); setEditingTr(null); }} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors"><span className="text-sm font-bold">✕</span></button>
                                                </div>
                                                <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 pb-4">
                                                    {[['date', 'Date'], ['asset', 'Asset'], ['broker', 'Broker'], ['value', 'Value (Cost/Proceeds)'], ['quantity', 'Quantity'], ['price', 'Price'], ['type', 'Type (Buy/Sell)']].map(([field, label]) => (
                                                        <div key={field}>
                                                            <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">{label}</label>
                                                            <input
                                                                type="text"
                                                                value={editingTr[field] ?? ''}
                                                                onChange={e => handleEditChange(field, e.target.value)}
                                                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all font-mono"
                                                            />
                                                        </div>
                                                    ))}
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={editingTr.isSalaryContribution || false}
                                                            onChange={e => handleEditChange('isSalaryContribution', e.target.checked)}
                                                            id="edit-salary-contribution-pane"
                                                            className="w-4 h-4 accent-[#D4AF37]"
                                                        />
                                                        <label htmlFor="edit-salary-contribution-pane" className="text-white text-sm cursor-pointer">Funded by Salary Contribution</label>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-white/10 shrink-0">
                                                    <button onClick={() => { setRightPaneMode('default'); setEditingTr(null); }} className="px-5 py-2.5 bg-transparent border border-white/10 rounded-xl text-white/50 text-sm hover:bg-white/5 transition-colors">Cancel</button>
                                                    <button onClick={handleEditSave} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#1A0F2E] transition-colors" style={{ background: 'linear-gradient(135deg, #CC5500 0%, #D4AF37 100%)' }}>Save</button>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="p-8 pb-4 h-full flex flex-col items-center justify-center text-center relative z-10 space-y-8">
                                            {/* Desktop Search */}
                                            <div className="w-full max-w-md relative">
                                                <input
                                                    type="text"
                                                    placeholder="Search holdings..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-12 text-white border-none focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all placeholder:text-white/30 backdrop-blur-md shadow-2xl"
                                                />
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
                                }}
                            />
                        </div>
                    </div>

                {/* Transaction Ledger */}
                <section className="max-w-3xl mx-auto mb-10 mt-12">
                    <div className="flex justify-between items-center mb-6 px-1">
                        <h3 className="text-lg font-medium text-white/90 flex items-center gap-2">
                            Activity History ({transactions.length})
                        </h3>
                        <button
                            onClick={() => setLedgerOpen(!ledgerOpen)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm font-medium transition-colors"
                        >
                            {ledgerOpen ? 'Hide' : 'Show'}
                        </button>
                    </div>
                    {ledgerOpen && (
                        <div className="bg-white/5 backdrop-blur-md border border-white/5 rounded-3xl p-4 sm:p-6 mb-24">
                            <TransactionTimeline
                                transactions={(() => {
                                    const trs = [...transactions];
                                    trs.sort((a, b) => {
                                        let valA = a[ledgerSortKey];
                                        let valB = b[ledgerSortKey];

                                        if (ledgerSortKey === 'date') {
                                            valA = new Date(valA || 0);
                                            valB = new Date(valB || 0);
                                        } else if (ledgerSortKey === 'value' || ledgerSortKey === 'pnl' || ledgerSortKey === 'roiPercent') {
                                            valA = parseFloat(valA) || 0;
                                            valB = parseFloat(valB) || 0;
                                        } else {
                                            valA = String(valA || '').toLowerCase();
                                            valB = String(valB || '').toLowerCase();
                                        }

                                        if (valA < valB) return ledgerSortDir === 'asc' ? -1 : 1;
                                        if (valA > valB) return ledgerSortDir === 'asc' ? 1 : -1;
                                        return 0;
                                    });
                                    return trs;
                                })()}
                                onEdit={handleEditClick}
                                onDelete={handleDeleteClick}
                                renderItem={(tr) => {
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
                                                <span className="text-sm font-bold text-white tracking-tight">
                                                    {formatCurrency(parseFloat(tr.value) || 0, cur)}
                                                </span>
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
                                    )
                                }}
                            />
                        </div>
                    )}
                </section>

                <FloatingActionButton
                    onAddBroker={() => {
                        setRightPaneMode('add-broker');
                        setSelectedAsset(null);
                    }}
                    brokerLabel="Add Broker"
                />

                {/* Edit and Delete Modals to be fully implemented or confirmation modal used */}
                <ConfirmationModal
                    isOpen={isDeleteModalOpen}
                    title="Delete Transaction"
                    message="Are you sure you want to delete this pension transaction?"
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setIsDeleteModalOpen(false)}
                />

                <ConfirmationModal
                    isOpen={isDeleteBrokerModalOpen}
                    title="Delete Pension Provider"
                    message={`Are you sure you want to delete ${brokerToDelete}? All transactions inside this provider will also be deleted.`}
                    confirmLabel="Delete Provider"
                    onConfirm={handleConfirmDeleteBroker}
                    onCancel={() => setIsDeleteBrokerModalOpen(false)}
                />
            </div >
            <PageTutorialOverlay pageId="pensions" steps={PENSIONS_TUTORIAL_STEPS} />
        </PullToRefresh>
    );
}
