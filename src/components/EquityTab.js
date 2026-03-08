import React, { useState, useEffect, useRef } from 'react';
import ConfirmationModal from './ConfirmationModal';
import AssetSearch from './AssetSearch';
import { formatCurrency, SUPPORTED_CURRENCIES } from '@/lib/currency';
import CurrencySelector from './CurrencySelector';
import AssetCard from './AssetCard';
import TransactionTimeline from './TransactionTimeline';
import FloatingActionButton from './FloatingActionButton';
import EmptyState from './EmptyState';
import PullToRefresh from './PullToRefresh';
import AssetCardSkeleton from './AssetCardSkeleton';
import EquityTabLegacy from './EquityTabLegacy';
import DesktopAssetTable from './DesktopAssetTable';
import ContextPane from './ContextPane';
import { usePortfolio } from '@/context/PortfolioContext';
import { X } from 'lucide-react';
import BrokerForm from './BrokerForm';
import TransactionForm from './TransactionForm';
import AssetLogo from './AssetLogo';

// No more ASSET_TICKER_MAP - tickers are stored directly on transactions

const BROKER_CURRENCY = {
    'Trading 212': 'GBP', 'XP': 'BRL', 'Amazon': 'USD', 'Green Gold Farms': 'USD', 'Monzo': 'GBP', 'Fidelity': 'GBP'
};

export default function EquityTab({ transactions = [], marketData, rates, onRefresh }) {
    const { layoutMode, setIsInspectorOpen, setInspectorMode, setEditingTransaction } = usePortfolio();
    if (layoutMode === 'legacy') return <EquityTabLegacy transactions={transactions} marketData={marketData} rates={rates} onRefresh={onRefresh} />;

    const [isLoading, setIsLoading] = useState(false);
    const [ledgerOpen, setLedgerOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleteBrokerModalOpen, setIsDeleteBrokerModalOpen] = useState(false);
    const [brokerToDelete, setBrokerToDelete] = useState(null);
    const [expandedBrokers, setExpandedBrokers] = useState({});
    const toggleBroker = (b) => setExpandedBrokers(prev => ({ ...prev, [b]: !prev[b] }));
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [rightPaneMode, setRightPaneMode] = useState('default');
    const [showEmptyBrokers, setShowEmptyBrokers] = useState(false);
    const [brokerDict, setBrokerDict] = useState({ ...BROKER_CURRENCY });
    const [explicitDbBrokers, setExplicitDbBrokers] = useState([]);
    const [deletedBrokerNames, setDeletedBrokerNames] = useState([]);
    const [newlyAddedBrokers, setNewlyAddedBrokers] = useState([]);

    const isInitialFetch = useRef(true);

    const fetchBrokers = async () => {
        try {
            const res = await fetch('/api/brokers');
            const data = await res.json();
            if (data.brokers) {
                const fetchedNames = data.brokers.map(b => b.name);

                // Track newly added brokers in this session
                if (!isInitialFetch.current) {
                    const newNames = fetchedNames.filter(name => !explicitDbBrokers.includes(name) && !deletedBrokerNames.includes(name));
                    if (newNames.length > 0) {
                        setNewlyAddedBrokers(prev => [...new Set([...prev, ...newNames])]);
                        // Auto-expand the newly added broker(s)
                        const expansions = {};
                        newNames.forEach(n => expansions[n] = true);
                        setExpandedBrokers(prev => ({ ...prev, ...expansions }));
                    }
                }

                const dict = { ...BROKER_CURRENCY };
                data.brokers.forEach(b => dict[b.name] = b.currency);
                // Remove any brokers the user has deleted this session
                deletedBrokerNames.forEach(name => delete dict[name]);
                setBrokerDict(dict);
                setExplicitDbBrokers(fetchedNames);
                isInitialFetch.current = false;
            }
        } catch (e) { console.error('Failed to fetch brokers', e); }
    };

    useEffect(() => {
        fetchBrokers();
    }, []);

    // Auto-expand brokers when searching
    useEffect(() => {
        if (searchTerm) {
            const { activeHoldings: rawActiveHoldings } = computeHoldings();
            const matching = {};
            rawActiveHoldings.forEach(h => {
                if (h.asset.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (h.ticker && h.ticker.toLowerCase().includes(searchTerm.toLowerCase()))) {
                    matching[h.broker] = true;
                }
            });
            setExpandedBrokers(matching);
        }
    }, [searchTerm, transactions]);

    // Scroll to hash on load
    useEffect(() => {
        if (!isLoading && typeof window !== 'undefined' && window.location.hash) {
            const id = window.location.hash.substring(1); // remove '#'
            const element = document.getElementById(id);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Highlight the row temporarily
                    element.style.transition = 'background-color 1.5s ease-out';
                    element.style.backgroundColor = 'rgba(212, 175, 55, 0.2)';
                    setTimeout(() => { element.style.backgroundColor = ''; }, 2000);
                }, 100);
            }
        }
    }, [isLoading, transactions.length]);
    const [trToDelete, setTrToDelete] = useState(null);
    const [editingTr, setEditingTr] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSellModalOpen, setIsSellModalOpen] = useState(false);
    const [sellData, setSellData] = useState(null);
    const [buyData, setBuyData] = useState(null);
    const [isFetchingPrice, setIsFetchingPrice] = useState(false);

    const handleDeleteClick = (id) => { setTrToDelete(id); setIsDeleteModalOpen(true); };
    const handleConfirmDelete = async () => {
        if (!trToDelete) return;
        try {
            await fetch(`/api/equity-transactions?id=${trToDelete}`, { method: 'DELETE' });
            if (onRefresh) onRefresh();
            setIsDeleteModalOpen(false); setTrToDelete(null);
        } catch (e) { console.error(e); }
    };

    const handleDeleteBrokerClick = (brokerName) => {
        setBrokerToDelete(brokerName);
        setIsDeleteBrokerModalOpen(true);
    };

    const handleConfirmDeleteBroker = async () => {
        if (!brokerToDelete) return;
        try {
            const res = await fetch(`/api/brokers?name=${encodeURIComponent(brokerToDelete)}`, { method: 'DELETE' });
            if (!res.ok) {
                console.error('Delete failed:', await res.text());
                return;
            }
            // Track this broker as deleted so it won't reappear from BROKER_CURRENCY
            setDeletedBrokerNames(prev => [...prev, brokerToDelete]);
            // Remove it from brokerDict immediately
            setBrokerDict(prev => {
                const next = { ...prev };
                delete next[brokerToDelete];
                return next;
            });
            // Remove from explicitDbBrokers
            setExplicitDbBrokers(prev => prev.filter(n => n !== brokerToDelete));
            setIsDeleteBrokerModalOpen(false);
            setBrokerToDelete(null);
        } catch (e) { console.error('Failed to delete broker', e); }
    };

    const handleEditClick = (tr) => { setEditingTr({ ...tr }); setRightPaneMode('edit-transaction'); };
    const handleEditChange = (field, value) => {
        setEditingTr(prev => ({ ...prev, [field]: value }));
    };
    const handleEditSave = async () => {
        if (!editingTr) return;
        try {
            const payload = {
                ...editingTr,
                investment: parseFloat(editingTr.investment) || 0,
                quantity: parseFloat(editingTr.quantity) || 0,
                costPerShare: parseFloat(editingTr.costPerShare) || 0,
                pnl: editingTr.pnl ? parseFloat(editingTr.pnl) : null,
                roiPercent: editingTr.roiPercent ? parseFloat(editingTr.roiPercent) : null,
            };
            await fetch('/api/equity-transactions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (onRefresh) onRefresh();
            setRightPaneMode('default'); setEditingTr(null);
        } catch (e) { console.error(e); }
    };

    // Sell flow
    const handleSellClick = (holding) => {
        const livePrice = getLivePrice(holding.ticker, holding.asset);
        const avgCost = holding.qty > 0 ? holding.totalCost / holding.qty : 0;
        const qty = Math.abs(holding.qty);
        const sellPrice = livePrice || avgCost;
        const proceeds = sellPrice * qty;
        const pnl = proceeds - holding.totalCost;
        const roi = holding.totalCost !== 0 ? (pnl / holding.totalCost * 100) : 0;
        setSellData({
            asset: holding.asset,
            broker: holding.broker,
            currency: holding.currency,
            ticker: holding.ticker,
            sharesHeld: qty,
            avgCost,
            qtyToSell: qty,
            sellPricePerShare: sellPrice,
            totalProceeds: proceeds,
            pnl,
            roi,
            date: new Date().toISOString().split('T')[0],
        });
        setIsSellModalOpen(true);
    };

    const updateSellCalc = (field, value) => {
        setSellData(prev => {
            const updated = { ...prev, [field]: value };
            let qty = parseFloat(updated.qtyToSell) || 0;
            let price = parseFloat(updated.sellPricePerShare) || 0;
            let proceeds = parseFloat(updated.totalProceeds) || 0;
            const avgCost = prev.avgCost;

            if (field === 'totalProceeds') {
                // If user inputs total value, calculate price per share
                if (qty > 0) {
                    price = proceeds / qty;
                    updated.sellPricePerShare = price;
                }
            } else if (field === 'qtyToSell' || field === 'sellPricePerShare') {
                // If user inputs qty or price, calculate total proceeds
                proceeds = price * qty;
                updated.totalProceeds = proceeds;
            }

            const costBasis = avgCost * qty;
            updated.pnl = updated.totalProceeds - costBasis;
            updated.roi = costBasis !== 0 ? (updated.pnl / costBasis * 100) : 0;
            return updated;
        });
    };

    const handleSellConfirm = async () => {
        if (!sellData) return;
        const qty = parseFloat(sellData.qtyToSell) || 0;
        const price = parseFloat(sellData.sellPricePerShare) || 0;
        const tr = {
            date: sellData.date,
            asset: sellData.asset,
            broker: sellData.broker,
            currency: sellData.currency,
            ticker: sellData.ticker,
            investment: -(price * qty),
            quantity: -qty,
            costPerShare: price,
            pnl: sellData.pnl,
            roiPercent: sellData.roi,
        };
        try {
            const res = await fetch('/api/equity-transactions', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tr)
            });
            if (res.ok) {
                if (onRefresh) onRefresh();
                setIsSellModalOpen(false); setSellData(null);
            }
        } catch (e) { console.error(e); }
    };

    // Buy flow
    const handleBuyClick = (holding) => {
        const livePrice = getLivePrice(holding.ticker, holding.asset);
        setBuyData({
            asset: holding.asset,
            broker: holding.broker,
            currency: holding.currency,
            ticker: holding.ticker,
            qtyToBuy: '',
            buyPricePerShare: livePrice || '',
            totalInvestment: 0,
            date: new Date().toISOString().split('T')[0],
        });
        setRightPaneMode('add-transaction');
    };

    const handleNewBuyClick = (brokerName) => {
        const cur = BROKER_CURRENCY[brokerName] || 'GBP';
        setBuyData({
            asset: '',
            broker: brokerName,
            currency: cur,
            ticker: '',
            qtyToBuy: '',
            buyPricePerShare: '',
            totalInvestment: 0,
            date: new Date().toISOString().split('T')[0],
        });
        setRightPaneMode('add-transaction');
    };

    const updateBuyCalc = (field, value) => {
        setBuyData(prev => {
            const updated = { ...prev, [field]: value };
            let qty = parseFloat(updated.qtyToBuy) || 0;
            let price = parseFloat(updated.buyPricePerShare) || 0;
            let investment = parseFloat(updated.totalInvestment) || 0;

            if (field === 'totalInvestment') {
                // If user inputs total investment, calculate price per share if quantity exists
                if (qty > 0) {
                    price = investment / qty;
                    updated.buyPricePerShare = price;
                }
            } else if (field === 'qtyToBuy' || field === 'buyPricePerShare') {
                // If user inputs qty or price, calculate total investment
                investment = qty * price;
                updated.totalInvestment = investment;
            }

            return updated;
        });
    };

    const handleBuyConfirm = async () => {
        if (!buyData || !buyData.asset) return;
        const qty = parseFloat(buyData.qtyToBuy) || 0;
        const price = parseFloat(buyData.buyPricePerShare) || 0;
        if (qty <= 0 || price <= 0) return;
        const tr = {
            date: buyData.date,
            asset: buyData.asset,
            broker: buyData.broker,
            currency: buyData.currency,
            ticker: buyData.ticker,
            investment: price * qty,
            quantity: qty,
            costPerShare: price,
            pnl: null,
            roiPercent: null,
            isSalaryContribution: buyData.isSalaryContribution || false,
            type: 'Buy',
        };
        try {
            const res = await fetch('/api/equity-transactions', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tr)
            });
            if (res.ok) {
                if (onRefresh) onRefresh();
                setRightPaneMode('default'); setBuyData(null);
            }
        } catch (e) { console.error(e); }
    };

    // Compute current holdings from transactions
    const computeHoldings = () => {
        const holdings = {}; // "asset|broker" -> { qty, totalCost, broker, currency, ticker }
        const lockedPnL = {}; // broker -> total realized P&L from explicit pnl fields

        // Sort transactions chronologically for correct position tracking
        const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

        sorted.forEach(tr => {
            const key = `${tr.asset}|${tr.broker}`;
            if (!holdings[key]) {
                holdings[key] = { asset: tr.asset, qty: 0, totalCost: 0, broker: tr.broker, currency: tr.currency, ticker: tr.ticker || null };
            }
            // Update ticker if this transaction has one and the holding doesn't yet
            if (tr.ticker && !holdings[key].ticker) holdings[key].ticker = tr.ticker;
            if (!lockedPnL[tr.broker]) lockedPnL[tr.broker] = 0;

            // Both buys and sells affect qty and totalCost
            holdings[key].qty += (tr.quantity || 0);
            holdings[key].totalCost += tr.investment;

            // Track explicit P&L from sell transactions
            if (tr.investment < 0 && tr.pnl !== null && tr.pnl !== undefined) {
                lockedPnL[tr.broker] += tr.pnl;
            }

            // When position is fully closed, lock the remaining cost as P&L and reset
            if (Math.abs(holdings[key].qty) < 0.01) {
                holdings[key].totalCost = 0;
                holdings[key].qty = 0;
            }
        });

        // Ensure "Cash" for "Trading 212" is always present in holdings
        const t212CashKey = 'Cash|Trading 212';
        if (!holdings[t212CashKey]) {
            holdings[t212CashKey] = { asset: 'Cash', qty: 0, totalCost: 0, broker: 'Trading 212', currency: 'GBP', ticker: null };
        }

        // Filter out fully sold positions (qty ≈ 0), but KEEP "Cash" for "Trading 212"
        const activeHoldings = Object.values(holdings).filter(h => {
            const isT212Cash = h.asset === 'Cash' && h.broker === 'Trading 212';
            return isT212Cash || Math.abs(h.qty) > 0.01;
        });
        return { activeHoldings, lockedPnL };
    };

    const { activeHoldings: rawActiveHoldings, lockedPnL } = computeHoldings();

    // Filter active holdings based on search term
    const activeHoldings = rawActiveHoldings.filter(h =>
        h.asset.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (h.ticker && h.ticker.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Group by broker dynamically
    const brokerGroups = {};
    activeHoldings.forEach(h => {
        if (!brokerGroups[h.broker]) brokerGroups[h.broker] = [];
        brokerGroups[h.broker].push(h);
    });

    // Calculate total cost for sorting & dynamic top currency
    const brokerTotals = {};
    const currencyTotals = {};

    Object.keys(brokerGroups).forEach(b => {
        const cur = brokerDict[b] || 'GBP';
        let totalCost = brokerGroups[b].reduce((acc, h) => acc + Math.abs(h.totalCost), 0);

        let totalCostBase = totalCost;
        if (cur !== 'GBP' && rates) {
            if (cur === 'USD') totalCostBase = totalCost / rates.USD;
            if (cur === 'BRL') totalCostBase = totalCost / rates.BRL;
        }
        brokerTotals[b] = totalCostBase;

        if (!currencyTotals[cur]) currencyTotals[cur] = 0;
        currencyTotals[cur] += totalCostBase;
    });

    const activeBrokers = Object.keys(brokerGroups);
    const dbBrokerNames = Object.keys(brokerDict).filter(b => !activeBrokers.includes(b));

    let topCurrency = 'GBP';
    let maxAmt = -1;
    Object.entries(currencyTotals).forEach(([cur, amt]) => {
        if (amt > maxAmt) {
            maxAmt = amt;
            topCurrency = cur;
        }
    });
    if (Object.keys(currencyTotals).length === 0) topCurrency = 'GBP';

    const brokers = [...activeBrokers, ...dbBrokerNames]
        .sort((a, b) => {
            const costA = brokerTotals[a] || 0;
            const costB = brokerTotals[b] || 0;
            if (costA !== costB) return costB - costA; // highest first
            return a.localeCompare(b);
        });

    const getLivePrice = (ticker, assetName) => {
        // Cash is always worth 1.00 in its currency
        if (assetName === 'Cash') return 1.0;
        // Monzo is private equity, updated manually
        if (assetName === 'Monzo - Equity') return 14.41;
        if (!ticker || !marketData[ticker]) return null;
        return marketData[ticker].price;
    };

    const renderBrokerTable = (brokerName, items) => {
        if (!items) items = [];
        const isNewlyAdded = newlyAddedBrokers.includes(brokerName);
        if (!showEmptyBrokers && !isNewlyAdded && (items.length === 0 && (!lockedPnL[brokerName] || lockedPnL[brokerName] === 0))) return null;

        const cur = brokerDict[brokerName] || 'GBP';

        let totalCurrentValue = 0;
        let totalPurchasePrice = 0;

        // Calculate all values first
        const calculatedRows = items.map(h => {
            // Determine asset price and currency
            let rawPrice = 0;
            let assetCurrency = cur; // Default to broker currency

            if (h.asset === 'Cash') {
                rawPrice = 1.0;
            } else if (h.asset === 'Monzo - Equity') {
                rawPrice = 14.41;
            } else if (h.ticker && marketData[h.ticker]) {
                rawPrice = marketData[h.ticker].price;
                assetCurrency = marketData[h.ticker].currency || 'USD'; // Fallback to USD if generic
            }

            // Convert rawPrice to broker currency (cur)
            let livePrice = rawPrice;
            if (activeHoldings.length > 0 && assetCurrency !== cur && rawPrice > 0 && rates) {
                // Base is GBP. rates = { BRL: 7.10, USD: 1.28 } implying 1 GBP = 1.28 USD
                if (cur === 'GBP') {
                    if (assetCurrency === 'USD') livePrice = rawPrice / rates.USD;
                    else if (assetCurrency === 'BRL') livePrice = rawPrice / rates.BRL;
                } else if (cur === 'USD') {
                    if (assetCurrency === 'GBP') livePrice = rawPrice * rates.USD;
                    else if (assetCurrency === 'BRL') livePrice = (rawPrice / rates.BRL) * rates.USD;
                } else if (cur === 'BRL') {
                    if (assetCurrency === 'GBP') livePrice = rawPrice * rates.BRL;
                    else if (assetCurrency === 'USD') livePrice = (rawPrice / rates.USD) * rates.BRL;
                }
            }

            const avgCost = h.qty > 0 ? h.totalCost / h.qty : 0;
            const currentValue = livePrice ? livePrice * Math.abs(h.qty) : h.totalCost;
            const pnl = currentValue - h.totalCost;
            const roi = h.totalCost !== 0 ? (pnl / h.totalCost * 100) : 0;

            totalCurrentValue += currentValue;
            totalPurchasePrice += h.totalCost;

            return { ...h, livePrice, avgCost, currentValue, pnl, roi };
        });

        // Sort by Current Value (descending), Cash pinned to top
        const rows = calculatedRows.sort((a, b) => {
            if (a.asset === 'Cash') return -1;
            if (b.asset === 'Cash') return 1;
            return (b.currentValue || 0) - (a.currentValue || 0);
        });

        const totalPnL = totalCurrentValue - totalPurchasePrice + (lockedPnL[brokerName] || 0);
        const totalROI = totalPurchasePrice !== 0 ? (totalPnL / totalPurchasePrice * 100) : 0;

        const isOpen = expandedBrokers[brokerName] || isNewlyAdded;
        const glowClass = isNewlyAdded ? 'shadow-[0_0_25px_rgba(212,175,55,0.4)] border-[#D4AF37] ring-1 ring-[#D4AF37]/50' : '';

        return (
            <div key={brokerName} id={encodeURIComponent(brokerName)} className={`mb-8 rounded-2xl transition-all duration-1000 ${glowClass}`}>
                <div
                    onClick={() => toggleBroker(brokerName)}
                    className="flex justify-between items-center mb-4 px-4 py-3 cursor-pointer bg-white/5 hover:bg-white/10 rounded-2xl transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <span className="text-white/40 transform transition-transform duration-300 text-xs" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                        <div className="flex flex-col">
                            <h3 className="text-lg font-semibold text-white/90 m-0">{brokerName}</h3>
                            <span className={`text-xs font-semibold mt-0.5 ${totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL, cur)} ({totalROI >= 0 ? '+' : ''}{totalROI.toFixed(1)}%)
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
                        {/* Mobile & Tablet Card Grid View */}
                        <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            <div className="overflow-hidden rounded-xl border border-white/5 bg-black/40 backdrop-blur-sm shadow-xl divide-y divide-white/[0.04]">
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
                                    <span className={`text-lg font-bold ${lockedPnL[brokerName] >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
                                Log a Trade
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Consolidated total across all brokers (dynamically picking currency with largest investment amount)
    const renderConsolidated = () => {
        let totalBase = 0;
        let totalCostBase = 0;
        let totalLockedBase = 0;

        const brokerSummaries = brokers.map(b => {
            const items = brokerGroups[b] || [];
            const cur = brokerDict[b] || 'GBP';
            let cv = 0, pp = 0;
            items.forEach(h => {
                // Determine price & currency
                let rawPrice = 0;
                let assetCurrency = cur;
                if (h.asset === 'Cash') {
                    rawPrice = 1.0;
                } else if (h.asset === 'Monzo - Equity') {
                    rawPrice = 14.41;
                } else if (h.ticker && marketData[h.ticker]) {
                    rawPrice = marketData[h.ticker].price;
                    assetCurrency = marketData[h.ticker].currency || 'USD';
                }

                // Convert to broker currency (cur)
                let lp = rawPrice;
                if (activeHoldings.length > 0 && assetCurrency !== cur && rawPrice > 0 && rates) {
                    if (cur === 'GBP') {
                        if (assetCurrency === 'USD') lp = rawPrice / rates.USD;
                        else if (assetCurrency === 'BRL') lp = rawPrice / rates.BRL;
                    } else if (cur === 'USD') {
                        if (assetCurrency === 'GBP') lp = rawPrice * rates.USD;
                        else if (assetCurrency === 'BRL') lp = (rawPrice / rates.BRL) * rates.USD;
                    } else if (cur === 'BRL') {
                        if (assetCurrency === 'GBP') lp = rawPrice * rates.BRL;
                        else if (assetCurrency === 'USD') lp = (rawPrice / rates.USD) * rates.BRL;
                    }
                }

                cv += lp ? lp * Math.abs(h.qty) : h.totalCost;
                pp += h.totalCost;
            });
            const locked = lockedPnL[b] || 0;

            // Convert to topCurrency
            const toBaseCurrency = (amount, currency) => {
                if (!rates) return amount;
                if (currency === topCurrency) return amount;

                // Convert to GBP first (since rates are GBP based)
                let gbpAmt = amount;
                if (currency === 'BRL') gbpAmt = amount / rates.BRL;
                if (currency === 'USD') gbpAmt = amount / rates.USD;

                // Then convert to topCurrency
                if (topCurrency === 'GBP') return gbpAmt;
                if (topCurrency === 'BRL') return gbpAmt * rates.BRL;
                if (topCurrency === 'USD') return gbpAmt * rates.USD;
                return gbpAmt;
            };

            const cvBase = toBaseCurrency(cv, cur);
            const ppBase = toBaseCurrency(pp, cur);
            const lockedBase = toBaseCurrency(locked, cur);

            totalBase += cvBase;
            totalCostBase += ppBase;
            totalLockedBase += lockedBase;

            const pnl = cvBase - ppBase + lockedBase;
            const roi = ppBase !== 0 ? (pnl / ppBase * 100) : 0;

            return { broker: b, currentValue: cvBase, purchasePrice: ppBase, pnl, roi };
        });

        const totalPnL = totalBase - totalCostBase + totalLockedBase;
        const totalROI = totalCostBase !== 0 ? totalPnL / totalCostBase * 100 : 0;

        return (
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '48px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                {/* Hero Total */}
                <div style={{
                    padding: '24px',
                    background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(255,255,255,0) 100%)',
                    borderBottom: '1px solid var(--glass-border)',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--fg-secondary)', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>📊 Equity Portfolio</div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>{formatCurrency(totalBase, topCurrency)}</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--fg-secondary)' }}>Invested: {formatCurrency(totalCostBase, topCurrency)}</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: totalPnL >= 0 ? 'var(--vu-green)' : 'var(--error)' }}>
                            {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL, topCurrency)} ({totalROI >= 0 ? '+' : ''}{totalROI.toFixed(1)}%)
                        </span>
                    </div>
                </div>

                {/* Broker Summary Cards */}
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
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
                            {/* Left P&L indicator bar */}
                            <div style={{
                                position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px',
                                background: s.pnl >= 0 ? '#10b981' : '#ef4444',
                                borderRadius: '3px 0 0 3px'
                            }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff', marginBottom: '4px' }}>{s.broker}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--fg-secondary)' }}>Cost: {formatCurrency(s.purchasePrice, 'GBP')}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>{formatCurrency(s.currentValue, 'GBP')}</div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: s.pnl >= 0 ? 'var(--vu-green)' : 'var(--error)', marginTop: '2px' }}>
                                        {s.pnl >= 0 ? '+' : ''}{formatCurrency(s.pnl, 'GBP')} ({s.roi >= 0 ? '+' : ''}{s.roi.toFixed(1)}%)
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // Transaction ledger
    const sortedTr = [...transactions].sort((a, b) => {
        return b.date.localeCompare(a.date);
    });

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


    const renderBuyAssetForm = () => {
        if (!buyData) return null;
        return (
            <div className="w-full h-full p-6 text-left relative flex flex-col z-10 overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h3 className="font-bebas text-xl tracking-widest text-[#D4AF37] uppercase">
                        {buyData.asset ? `Buy More ${buyData.asset}` : 'New Purchase'}
                    </h3>
                    <button onClick={() => setRightPaneMode('default')} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors hidden lg:block ml-auto"><X size={16} /></button>
                </div>

                <div className="flex flex-col gap-5 flex-1 pb-4">
                    {/* Broker & Currency */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block text-white/60 text-xs mb-1">Broker</label>
                            <select
                                value={buyData.broker}
                                onChange={e => setBuyData(prev => ({ ...prev, broker: e.target.value, currency: BROKER_CURRENCY[e.target.value] || 'GBP' }))}
                                className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#D4AF37]/50"
                            >
                                <option value="">Select Broker...</option>
                                {brokers.map(b => (
                                    <option key={b} value={b} className="bg-neutral-900">{b}</option>
                                ))}
                            </select>
                        </div>
                        <div className="w-full sm:w-28 shrink-0">
                            <label className="block text-white/60 text-xs mb-1">Currency</label>
                            <CurrencySelector
                                value={buyData.currency}
                                onChange={val => setBuyData(prev => ({ ...prev, currency: val }))}
                            />
                        </div>
                    </div>

                    {/* Date & Asset */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block text-white/60 text-xs mb-1">Date</label>
                            <input type="date" value={buyData.date} onChange={e => setBuyData(prev => ({ ...prev, date: e.target.value }))}
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
                                    <button onClick={() => setBuyData(prev => ({ ...prev, ticker: '', asset: '' }))} className="text-white/40 hover:text-white transition-colors shrink-0"><X size={14} /></button>
                                </div>
                            ) : (
                                <AssetSearch onSelect={async (selectedAsset) => {
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

                                        let finalPrice = lp || '';
                                        if (lp && sourceCurrency !== destCurrency) {
                                            const sourceRate = rates[sourceCurrency] || 1;
                                            const destRate = rates[destCurrency] || 1;
                                            finalPrice = (parseFloat(lp) / sourceRate) * destRate;
                                        }

                                        setBuyData(prev => ({
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
                                    <span className="animate-spin text-[10px]">⏳</span> Fetching price...
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
                            <label className="block text-white/60 text-xs mb-1">Price / Share ({SUPPORTED_CURRENCIES[buyData.currency]?.symbol || buyData.currency})</label>
                            <input type="number" value={buyData.buyPricePerShare} onChange={e => updateBuyCalc('buyPricePerShare', e.target.value)}
                                placeholder="0.00" step="any"
                                className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#D4AF37]/50" />
                        </div>
                    </div>

                    {/* Salary Contribution */}
                    <div className="flex items-center gap-2.5 pt-1">
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                checked={buyData.isSalaryContribution || false}
                                onChange={e => setBuyData(prev => ({ ...prev, isSalaryContribution: e.target.checked }))}
                                id="buy-salary-contribution"
                                className="w-4 h-4 rounded appearance-none border border-white/20 bg-white/5 checked:bg-emerald-500/20 checked:border-emerald-500/50 transition-colors cursor-pointer"
                            />
                            {buyData.isSalaryContribution && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-emerald-400">
                                    <svg viewBox="0 0 14 14" fill="none" className="w-2.5 h-2.5">
                                        <path d="M3 7.5L5.5 10L11 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <label htmlFor="buy-salary-contribution" className="text-white/80 text-xs font-medium cursor-pointer select-none">
                            Funded by Salary
                        </label>
                    </div>

                    {/* Total Investment Summary */}
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 mt-2">
                        <label className="block text-emerald-500/80 text-xs font-semibold uppercase tracking-wider mb-2">Total Amount</label>
                        <div className="relative flex items-center">
                            <span className="absolute left-3 text-emerald-400 font-bold">
                                {buyData.currency === 'BRL' ? 'R$' : (buyData.currency === 'USD' ? '$' : '£')}
                            </span>
                            <input
                                type="number"
                                value={buyData.totalInvestment}
                                onChange={e => updateBuyCalc('totalInvestment', e.target.value)}
                                step="any"
                                className="w-full py-2.5 pl-8 pr-3 bg-white/5 border border-emerald-500/30 rounded-lg text-emerald-50 text-base font-bold outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 mt-4 shrink-0 pt-2 border-t border-white/5">
                        <button type="button" onClick={() => setRightPaneMode('default')} className="flex-1 py-3 px-4 rounded-xl border border-white/10 bg-transparent text-white/50 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors font-space">
                            Cancel
                        </button>
                        <button type="button" onClick={handleBuyConfirm} className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#CC5500] to-[#D4AF37] text-[#1A0F2E] font-bold tracking-wide uppercase text-xs hover:brightness-110 shadow-lg shadow-[#D4AF37]/20 transition-all font-space">
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <div className="max-w-[1800px] mx-auto w-full pt-4 lg:pt-8">
                {/* Mobile Global Search Bar */}
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

                {activeHoldings.length > 0 ? (
                    <div className="lg:flex lg:gap-8 lg:items-start">
                        <div className="flex-1 min-w-0">
                            {renderConsolidated()}

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

                            {brokers.map(b => renderBrokerTable(b, brokerGroups[b]))}
                        </div>
                        <div className="hidden lg:block sticky top-8 h-fit">
                            <ContextPane
                                selectedAsset={selectedAsset}
                                rightPaneMode={rightPaneMode}
                                onClose={() => setSelectedAsset(null)}
                                renderEmptyState={() => {
                                    if (rightPaneMode === 'add-broker') {
                                        return (
                                            <div className="w-full h-full p-8 text-left relative flex flex-col z-10">
                                                <div className="flex justify-between items-center mb-6">
                                                    <button onClick={() => setRightPaneMode('default')} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors hidden lg:block ml-auto"><X size={16} /></button>
                                                </div>
                                                <div className="flex-1">
                                                    <BrokerForm assetClass="Equity" onSave={() => { setRightPaneMode('default'); fetchBrokers(); }} onCancel={() => setRightPaneMode('default')} />
                                                </div>
                                            </div>
                                        );
                                    }
                                    if (rightPaneMode === 'add-transaction') {
                                        return renderBuyAssetForm();
                                    }
                                    if (rightPaneMode === 'edit-transaction' && editingTr) {
                                        return (
                                            <div className="w-full h-full p-8 text-left relative flex flex-col z-10">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h3 className="text-lg font-bold text-white">Edit Transaction</h3>
                                                    <button onClick={() => { setRightPaneMode('default'); setEditingTr(null); }} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors"><X size={16} /></button>
                                                </div>
                                                <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
                                                    {[['date', 'Date'], ['asset', 'Asset'], ['broker', 'Broker'], ['investment', 'Investment'], ['quantity', 'Quantity'], ['costPerShare', 'Cost/Share'], ['currency', 'Currency'], ['pnl', 'P&L'], ['roiPercent', 'ROI %']].map(([field, label]) => (
                                                        <div key={field}>
                                                            <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">{label}</label>
                                                            {field === 'currency' ? (
                                                                <CurrencySelector
                                                                    value={editingTr.currency}
                                                                    onChange={val => handleEditChange('currency', val)}
                                                                />
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    value={editingTr[field] ?? ''}
                                                                    onChange={e => handleEditChange(field, e.target.value)}
                                                                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all"
                                                                />
                                                            )}
                                                        </div>
                                                    ))}
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={editingTr.isSalaryContribution || false}
                                                            onChange={e => handleEditChange('isSalaryContribution', e.target.checked)}
                                                            id="eq-edit-salary-contribution-pane"
                                                            className="w-4 h-4 accent-[#D4AF37]"
                                                        />
                                                        <label htmlFor="eq-edit-salary-contribution-pane" className="text-white text-sm cursor-pointer">Funded by Salary Contribution</label>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-white/10">
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
                                                    <span className="text-3xl filter grayscale opacity-70">📈</span>
                                                </div>
                                                <h3 className="text-xl font-bold text-white tracking-tight font-bebas tracking-widest mb-3">Select an Asset</h3>
                                                <p className="text-sm text-parchment/60 leading-relaxed max-w-[250px] mx-auto">
                                                    Click on any holding in your active portfolio to view detailed metrics and transition history.
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }}
                                renderHeader={(asset) => (
                                    <div className="flex flex-col">
                                        <h3 className="text-xl font-bold text-white/90 tracking-tight">{asset.asset}</h3>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="px-2 py-0.5 rounded bg-white/10 text-white/60 text-[10px] font-mono tracking-wider">{asset.broker}</span>
                                            {asset.ticker && <span className="px-2 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-mono tracking-wider">{asset.ticker}</span>}
                                        </div>
                                    </div>
                                )}
                                renderDetails={(asset) => {
                                    const isCash = asset.asset === 'Cash';
                                    return (
                                        <div className="grid grid-cols-2 gap-4">
                                            {!isCash && (
                                                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                                    <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5">Shares Hosted</span>
                                                    <span className="text-sm font-medium text-white/90 font-mono">{Math.abs(asset.qty).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                                                </div>
                                            )}
                                            {!isCash && (
                                                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                                    <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5">Live Price</span>
                                                    <span className="text-sm font-medium text-white/90 font-mono">{asset.livePrice ? formatCurrency(asset.livePrice, asset.brokerCurrency) : 'N/A'}</span>
                                                </div>
                                            )}
                                            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                                <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5">{isCash ? 'Deposits' : 'Cost Basis'}</span>
                                                <span className="text-sm font-medium text-white/90 font-mono">{formatCurrency(asset.totalCost, asset.brokerCurrency)}</span>
                                            </div>
                                            <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl p-3">
                                                <span className="block text-[10px] text-[#D4AF37]/60 uppercase tracking-widest mb-1.5">Current Value</span>
                                                <span className="text-sm font-bold text-[#D4AF37] font-mono drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">{formatCurrency(asset.currentValue, asset.brokerCurrency)}</span>
                                            </div>
                                            {!isCash && (
                                                <div className="col-span-2 bg-white/[0.02] border border-white/5 rounded-xl p-3 flex justify-between items-center">
                                                    <span className="text-[10px] text-white/40 uppercase tracking-widest">Total P&L</span>
                                                    <span className={`text-sm font-bold tracking-wider rounded-md font-mono ${asset.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {asset.pnl >= 0 ? '+' : ''}{formatCurrency(asset.pnl, asset.brokerCurrency)} ({asset.roi >= 0 ? '+' : ''}{asset.roi.toFixed(1)}%)
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
                                                className="flex-1 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors"
                                            >
                                                {isCash ? 'Deposit' : '+ Buy More'}
                                            </button>
                                            <button
                                                onClick={() => handleSellClick(asset)}
                                                className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors"
                                            >
                                                {isCash ? 'Withdraw' : '- Sell'}
                                            </button>
                                        </div>
                                    );
                                }}
                                renderTimeline={(asset) => {
                                    const assetHistory = sortedTr.filter(t => t.asset === asset.asset && t.broker === asset.broker);
                                    return (
                                        <TransactionTimeline
                                            transactions={assetHistory}
                                            onEdit={handleEditClick}
                                            onDelete={handleDeleteClick}
                                            renderItem={(tr) => {
                                                const isSell = tr.investment < 0;
                                                return (
                                                    <>
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${!isSell ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                            <span className="font-medium text-[10px] text-white/90 uppercase tracking-wider font-space">
                                                                {!isSell ? 'Bought' : 'Sold'}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-sm font-bold text-white tracking-tight font-mono">
                                                                {formatCurrency(Math.abs(tr.investment), tr.currency || 'GBP')}
                                                            </span>
                                                            <span className="text-[10px] text-white/40 font-mono tracking-tight leading-relaxed">
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
                ) : (
                    <EmptyState
                        icon="📈"
                        title="No Equity Assets"
                        message="Your equity portfolio is empty. Add your first stock or ETF to get started."
                        actionLabel="Add Equity"
                        onAction={() => handleNewBuyClick('Trading 212')}
                    />
                )}

                {/* Transaction Ledger */}
                <section className="max-w-3xl mx-auto mb-10 mt-12">
                    <div className="flex justify-between items-center mb-6 px-1">
                        <h3 className="text-lg font-medium text-white/90 flex items-center gap-2">
                            Activity History
                        </h3>
                        <button
                            onClick={() => setLedgerOpen(!ledgerOpen)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm font-medium transition-colors"
                        >
                            {ledgerOpen ? 'Hide' : 'Show'} ({transactions.length})
                        </button>
                    </div>

                    {ledgerOpen && (
                        <div className="bg-white/5 backdrop-blur-md border border-white/5 rounded-3xl p-4 sm:p-6 mb-24">
                            <TransactionTimeline
                                transactions={sortedTr}
                                onEdit={handleEditClick}
                                onDelete={handleDeleteClick}
                                renderItem={(tr) => {
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

                {/* Context-Aware FAB */}
                {/* New Expandable FAB */}
                <FloatingActionButton
                    onAddBroker={() => {
                        setRightPaneMode('add-broker');
                    }}
                    onAddTransaction={() => {
                        setEditingTransaction(null);
                        handleNewBuyClick('');
                    }}
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



                {/* Sell Modal */}
                {
                    isSellModalOpen && sellData && (
                        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setIsSellModalOpen(false)} />
                            <div className="glass-card" style={{ position: 'relative', zIndex: 1000, padding: '32px', width: '520px', maxWidth: '90vw' }}>
                                <h3 style={{ marginBottom: '8px', fontSize: '1.3rem', color: 'var(--error)' }}>Sell {sellData.asset}</h3>
                                <p style={{ margin: '0 0 24px', color: 'var(--fg-secondary)', fontSize: '0.9rem' }}>
                                    {sellData.broker} · {sellData.sharesHeld.toLocaleString(undefined, { maximumFractionDigits: 4 })} shares held · Avg cost: {formatCurrency(sellData.avgCost, sellData.currency)}
                                </p>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Date</label>
                                        <input type="text" value={sellData.date} onChange={e => setSellData(prev => ({ ...prev, date: e.target.value }))}
                                            style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Currency</label>
                                        <input type="text" value={sellData.currency} readOnly
                                            style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--fg-secondary)', fontSize: '0.95rem', outline: 'none' }} />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Quantity to Sell</label>
                                        <input type="number" value={sellData.qtyToSell} onChange={e => updateSellCalc('qtyToSell', e.target.value)}
                                            max={sellData.sharesHeld} step="any"
                                            style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Sell Price / Share</label>
                                        <input type="number" value={sellData.sellPricePerShare} onChange={e => updateSellCalc('sellPricePerShare', e.target.value)}
                                            step="any"
                                            style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
                                    </div>
                                </div>

                                {/* Summary card */}
                                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Total Sale Value (Proceeds)</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-secondary)' }}>
                                                {sellData.currency === 'BRL' ? 'R$' : (sellData.currency === 'USD' ? '$' : '£')}
                                            </span>
                                            <input
                                                type="number"
                                                value={sellData.totalProceeds}
                                                onChange={e => updateSellCalc('totalProceeds', e.target.value)}
                                                step="any"
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px 10px 32px',
                                                    background: 'rgba(255,255,255,0.08)',
                                                    border: '1px solid var(--accent-color)',
                                                    borderRadius: '8px',
                                                    color: '#fff',
                                                    fontSize: '1.1rem',
                                                    fontWeight: 600,
                                                    outline: 'none'
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <span style={{ color: 'var(--fg-secondary)' }}>Cost Basis</span>
                                        <span style={{ color: 'var(--fg-secondary)' }}>{formatCurrency(sellData.avgCost * (parseFloat(sellData.qtyToSell) || 0), sellData.currency)}</span>
                                    </div>
                                    <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: 600 }}>P&L</span>
                                        <span style={{ fontWeight: 700, fontSize: '1.1rem', color: sellData.pnl >= 0 ? 'var(--vu-green)' : 'var(--error)' }}>
                                            {sellData.pnl >= 0 ? '+' : ''}{formatCurrency(sellData.pnl, sellData.currency)} ({sellData.roi >= 0 ? '+' : ''}{sellData.roi.toFixed(1)}%)
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                    <button onClick={() => setIsSellModalOpen(false)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--fg-secondary)', cursor: 'pointer' }}>Cancel</button>
                                    <button onClick={handleSellConfirm} style={{ padding: '10px 20px', background: 'var(--error)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Confirm Sale</button>
                                </div>
                            </div>
                        </div>
                    )
                }

            </div >
        </PullToRefresh >
    );
}