import React, { useState, useEffect } from 'react';
import ConfirmationModal from './ConfirmationModal';
import AssetSearch from './AssetSearch';
import { formatCurrency, convertCurrency } from '@/lib/currency';
import pensionMap from '../data/pension_fund_map.json';
import AssetCard from './AssetCard';
import TransactionTimeline from './TransactionTimeline';
import FloatingActionButton from './FloatingActionButton';
import EmptyState from './EmptyState';
import PullToRefresh from './PullToRefresh';

import DesktopAssetTable from './DesktopAssetTable';
import ContextPane from './ContextPane';
import useContextPaneHeight from '@/hooks/useContextPaneHeight';
import BrokerForm from './BrokerForm';
import AssetLogo from './AssetLogo';
import { usePortfolio } from '@/context/PortfolioContext';
import DisplayCurrencyPicker from './DisplayCurrencyPicker';
import PageTutorialOverlay from './ftue/PageTutorialOverlay';
import HeroDetailDrawer from './HeroDetailDrawer';
import { useRef } from 'react';

const PENSIONS_TUTORIAL_STEPS = [
    // Populated state
    { type: 'spotlight', targetId: 'ftue-pensions-header', title: 'Portfolio Overview', message: "Your total pension value, contributions, growth, and a breakdown by provider. Switch currencies with the picker.", position: 'bottom' },
    { type: 'spotlight', targetId: 'ftue-pensions-provider-section', title: 'Provider Details', message: "Expand each provider to see fund holdings, P&L, and contribution history. Buy into funds or sell positions from here.", position: 'bottom' },
    // Empty state
    { type: 'spotlight', targetId: 'ftue-pensions-empty', title: 'Get Started', message: "No pension accounts yet. Use the + button to add a provider and start tracking your retirement funds.", position: 'top' },
    // Always visible
    { type: 'spotlight', targetId: 'ftue-pensions-fab', title: 'Buy, Sell & Add Provider', message: "Use the + button to add a provider, buy into funds, or sell positions. Contributions vs. growth are tracked automatically.", position: 'top' },
];

// Added dynamic brokers to base dictionary map
const BASE_BROKER_CURRENCY = {
    'Fidelity': 'GBP',
    'Hargreaves Lansdown': 'GBP',
    'Legal & General': 'GBP',
    'OAB': 'GBP'
};

export default function PensionsTab({ transactions = [], rates, onRefresh, marketData: globalMarketData, pensionPrices: globalPensionPrices }) {
    const { displayCurrencyOverrides } = usePortfolio();

    const [isLoading, setIsLoading] = useState(false);
    const [ledgerOpen, setLedgerOpen] = useState(false);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [trToDelete, setTrToDelete] = useState(null);
    const [isDeleteBrokerModalOpen, setIsDeleteBrokerModalOpen] = useState(false);
    const [brokerToDelete, setBrokerToDelete] = useState(null);

    const [editingTr, setEditingTr] = useState(null);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const contextPaneMaxHeight = useContextPaneHeight('ftue-pensions-provider-section', 'ftue-pensions-header');

    // Dynamic Brokers
    const [brokerDict, setBrokerDict] = useState({ ...BASE_BROKER_CURRENCY });
    const [explicitDbBrokers, setExplicitDbBrokers] = useState([]);
    const [deletedBrokerNames, setDeletedBrokerNames] = useState([]);
    const [showEmptyBrokers, setShowEmptyBrokers] = useState(false);

    // Expand states
    const [expandedBrokers, setExpandedBrokers] = useState(() => {
        const initial = {};
        // Initially expand all
        return initial;
    });
    const toggleBroker = (b) => setExpandedBrokers(prev => ({ ...prev, [b]: !prev[b] }));

    const [newlyAddedBrokers, setNewlyAddedBrokers] = useState([]);
    const isInitialFetch = useRef(true);


    // Simplification: Reuse Sell/Buy modals from EquityTab logic, but adapted
    const [rightPaneMode, setRightPaneMode] = useState('default');
    const [sellData, setSellData] = useState(null);
    const [buyData, setBuyData] = useState(null);
    const [isFetchingPrice, setIsFetchingPrice] = useState(false);

    const [ledgerSortKey, setLedgerSortKey] = useState('date');
    const [ledgerSortDir, setLedgerSortDir] = useState('desc');

    const marketData = globalMarketData || {};
    const livePrices = globalPensionPrices || {};

    const handleLedgerSort = (key) => {
        if (ledgerSortKey === key) {
            setLedgerSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setLedgerSortKey(key);
            setLedgerSortDir('asc');
        }
    };

    const fetchBrokers = async () => {
        try {
            const res = await fetch('/api/brokers');
            const data = await res.json();
            if (data.brokers) {
                const pensionBrokers = data.brokers.filter(b => b.asset_class === 'Pension');
                const fetchedNames = pensionBrokers.map(b => b.name);

                // Track newly added brokers in this session
                if (!isInitialFetch.current) {
                    const newNames = fetchedNames.filter(name => !explicitDbBrokers.includes(name) && !deletedBrokerNames.includes(name));
                    if (newNames.length > 0) {
                        setNewlyAddedBrokers(prev => [...new Set([...prev, ...newNames])]);
                        // Auto-expand newly added brokers
                        setExpandedBrokers(prev => {
                            const next = { ...prev };
                            newNames.forEach(n => next[n] = true);
                            return next;
                        });
                    }
                }

                setExplicitDbBrokers(fetchedNames);
                const newDict = { ...BASE_BROKER_CURRENCY };
                pensionBrokers.forEach(b => { newDict[b.name] = b.currency || 'GBP'; });
                setBrokerDict(prev => {
                    const merged = { ...prev, ...newDict };
                    deletedBrokerNames.forEach(d => delete merged[d]);
                    return merged;
                });

                if (isInitialFetch.current) {
                    // Initialize expanded state on first load — all collapsed by default
                    setExpandedBrokers(prev => {
                        const init = { ...prev };
                        const allBrokers = [...new Set([...transactions.map(t => t.broker), ...fetchedNames, ...Object.keys(BASE_BROKER_CURRENCY)])];
                        allBrokers.forEach(b => { if (init[b] === undefined) init[b] = false; });
                        return init;
                    });
                }
                isInitialFetch.current = false;
            }
        } catch (e) { console.error('Failed to fetch brokers:', e); }
    };

    useEffect(() => { fetchBrokers(); }, [deletedBrokerNames]);

    // Auto-expand brokers when searching
    useEffect(() => {
        if (searchTerm) {
            const { activeHoldings: rawHoldings } = computeHoldings();
            const matching = {};
            rawHoldings.forEach(h => {
                if (h.asset.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (h.ticker && h.ticker.toLowerCase().includes(searchTerm.toLowerCase()))) {
                    matching[h.broker] = true;
                }
            });
            setExpandedBrokers(matching);
        }
    }, [searchTerm, transactions]);

    const sortArrow = (key) => ledgerSortKey === key ? (ledgerSortDir === 'asc' ? ' ▲' : ' ▼') : '';

    const thStyle = { padding: '12px 16px', color: 'var(--fg-secondary)', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' };
    const thSortable = { ...thStyle, cursor: 'pointer', userSelect: 'none' };

    const handleDeleteClick = (id) => { setTrToDelete(id); setIsDeleteModalOpen(true); };
    const handleConfirmDelete = async () => {
        if (!trToDelete) return;
        try {
            await fetch(`/api/transactions?id=${trToDelete}`, { method: 'DELETE' });
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
            await fetch(`/api/brokers?name=${encodeURIComponent(brokerToDelete)}`, { method: 'DELETE' });
            setDeletedBrokerNames(prev => [...prev, brokerToDelete]);
            setIsDeleteBrokerModalOpen(false);
            setBrokerToDelete(null);
            setRightPaneMode('default');
            if (onRefresh) onRefresh();
        } catch (e) { console.error('Failed to delete broker:', e); }
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
                amount: parseFloat(editingTr.value) || 0,
                quantity: parseFloat(editingTr.quantity) || 0,
                price: parseFloat(editingTr.price) || 0,
                pnl: parseFloat(editingTr.pnl) || null,
                roiPercent: parseFloat(editingTr.roiPercent) || null
            };

            await fetch('/api/transactions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (onRefresh) onRefresh();
            setRightPaneMode('default'); setEditingTr(null);
        } catch (e) { console.error(e); }
    };


    const handleSellClick = (holding) => {
        // For Cash, default price to 1
        let price = holding.currentValue && holding.qty ? holding.currentValue / holding.qty : 0;
        if (holding.asset === 'Cash') price = 1;

        // Find avg cost from history
        const sameAssetTrs = transactions.filter(t => t.asset === holding.asset && t.broker === holding.broker);
        let totalQty = 0;
        let totalCost = 0;
        sameAssetTrs.forEach(t => {
            if (t.type === 'Buy') {
                totalQty += parseFloat(t.quantity) || 0;
                totalCost += parseFloat(t.value) || 0;
            }
        });
        const avgCost = totalQty > 0 ? totalCost / totalQty : (holding.asset === 'Cash' ? 1 : 0);

        setSellData({
            asset: holding.asset,
            broker: holding.broker,
            currency: 'GBP',
            ticker: holding.ticker,
            sharesHeld: holding.qty,
            qtyToSell: holding.qty,
            sellPricePerShare: price,
            totalProceeds: price * holding.qty,
            avgCost: avgCost,
            date: new Date().toISOString().split('T')[0],
        });
        setRightPaneMode('sell-transaction');
    };

    const handleSellConfirm = async () => {
        if (!sellData) return;
        const qty = parseFloat(sellData.qtyToSell) || 0;
        const price = parseFloat(sellData.sellPricePerShare) || 0;
        const value = price * qty;

        const tr = {
            date: sellData.date,
            description: sellData.asset,
            account: sellData.broker,
            ticker: sellData.ticker,
            type: 'Sell',
            category: 'Pension',
            quantity: qty,
            amount: value,
            price: price,
            pnl: sellData.pnl,
            roiPercent: sellData.roi
        };
        try {
            const res = await fetch('/api/transactions', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tr)
            });
            if (res.ok) {
                if (onRefresh) onRefresh();
                setRightPaneMode('default'); setSellData(null);
            }
        } catch (e) { console.error(e); }
    };

    // Buy flow
    const handleBuyClick = (holding) => {
        setBuyData({
            asset: holding.asset,
            broker: holding.broker,
            currency: 'GBP',
            ticker: holding.ticker,
            qtyToBuy: '',
            buyPricePerShare: holding.asset === 'Cash' ? 1 : '',
            totalInvestment: 0,
            date: new Date().toISOString().split('T')[0],
            allocationClass: holding.allocationClass || 'Equity' // Default or carry over
        });
        setRightPaneMode('add-transaction');
    };

    const handleNewBuyClick = (brokerName) => {
        const cur = brokerDict[brokerName] || 'GBP';
        setBuyData({
            asset: '',
            broker: brokerName,
            currency: cur,
            ticker: '',
            qtyToBuy: '',
            buyPricePerShare: '',
            totalInvestment: 0,
            date: new Date().toISOString().split('T')[0],
            allocationClass: 'Equity', // Default
            buyPath: 'search', // 'search' or 'manual'
            scraperUrl: '',
            isVerified: false
        });
        setRightPaneMode('add-transaction');
    };

    const handleAssetSelect = async (selectedAsset) => {
        setIsFetchingPrice(true);
        try {
            // Check if we already have it in marketData
            let lp = marketData[selectedAsset.symbol]?.price;
            let sourceCurrency = marketData[selectedAsset.symbol]?.currency || 'USD';

            if (!lp) {
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

            // Currency conversion if needed
            let finalPrice = lp || '';
            const destCurrency = buyData.currency || brokerDict[buyData.broker] || 'GBP';
            if (lp && sourceCurrency !== destCurrency && rates) {
                const sourceRate = rates[sourceCurrency] || 1;
                const destRate = rates[destCurrency] || 1;
                finalPrice = (parseFloat(lp) / sourceRate) * destRate;
            }

            setBuyData(prev => ({
                ...prev,
                asset: selectedAsset.name,
                ticker: selectedAsset.symbol,
                buyPricePerShare: finalPrice,
                totalInvestment: finalPrice ? (parseFloat(prev.qtyToBuy) || 0) * finalPrice : 0
            }));
        } catch (e) {
            console.error('Failed to fetch asset price:', e);
        } finally {
            setIsFetchingPrice(false);
        }
    };

    const handleVerifyScrape = async () => {
        if (!buyData.scraperUrl) return;
        setIsFetchingPrice(true);
        try {
            const res = await fetch('/api/pension-prices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'test-scrape',
                    url: buyData.scraperUrl,
                    assetName: buyData.asset
                })
            });
            const data = await res.json();
            if (data.price) {
                setBuyData(prev => ({
                    ...prev,
                    asset: prev.asset || data.scrapedName || '',
                    buyPricePerShare: data.price,
                    totalInvestment: (parseFloat(prev.qtyToBuy) || 0) * data.price,
                    isVerified: true,
                    scrapedType: data.type,
                    selector: data.selector
                }));
            } else {
                alert('Could not auto-detect price. Please check the URL or enter price manually.');
            }
        } catch (e) {
            console.error('Scrape verification failed:', e);
            alert('Verification failed.');
        } finally {
            setIsFetchingPrice(false);
        }
    };



    const handleBuyConfirm = async () => {
        if (!buyData || !buyData.asset) return;
        const qty = parseFloat(buyData.qtyToBuy) || 0;
        const price = parseFloat(buyData.buyPricePerShare) || 0;
        if (qty <= 0 || price <= 0) return;

        // 1. If it's a new configuration, save it to the mapping
        if (buyData.buyPath === 'manual' || (buyData.buyPath === 'search' && buyData.ticker)) {
            try {
                await fetch('/api/pension-prices', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'save-config',
                        asset: buyData.asset,
                        ticker: buyData.ticker,
                        url: buyData.scraperUrl,
                        buyPath: buyData.buyPath,
                        type: buyData.scrapedType,
                        selector: buyData.selector
                    })
                });
            } catch (e) {
                console.error('Failed to save pension config:', e);
            }
        }

        const tr = {
            date: buyData.date,
            description: buyData.asset,
            account: buyData.broker,
            ticker: buyData.ticker || buyData.asset,
            type: 'Buy',
            category: 'Pension',
            quantity: qty,
            amount: price * qty, // Investment amount
            price: price,
            isSalaryContribution: buyData.isSalaryContribution || false,
            allocationClass: buyData.allocationClass || 'Equity'
        };
        try {
            const res = await fetch('/api/transactions', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tr)
            });
            if (res.ok) {
                if (onRefresh) onRefresh();
                setRightPaneMode('default'); setBuyData(null);
            }
        } catch (e) { console.error(e); }
    };

    // Compute current holdings
    const computeHoldings = () => {
        const holdings = {};
        const lockedPnL = {};

        // Ingested data schema: { type: 'Buy'|'Sell', value: Number (abs), quantity: Number (abs), ... }
        // We need to interpret this.

        const sorted = [...transactions].sort((a, b) => {
            // Date parsing assuming DD/MM/YYYY
            const da = a.date || '';
            const db = b.date || '';
            return da.localeCompare(db);
        });

        sorted.forEach(tr => {
            const key = `${tr.asset}|${tr.broker}`;
            if (!holdings[key]) {
                holdings[key] = { asset: tr.asset, qty: 0, totalCost: 0, broker: tr.broker, ticker: tr.ticker };
            }
            if (!lockedPnL[tr.broker]) lockedPnL[tr.broker] = 0;

            const qty = parseFloat(tr.quantity) || 0;
            const val = parseFloat(tr.value) || 0;

            if (tr.type === 'Buy') {
                holdings[key].qty += qty;
                holdings[key].totalCost += val;
            } else if (tr.type === 'Sell') {
                holdings[key].qty -= qty;
                holdings[key].totalCost -= val; // Proceeds reduce cost basis (Net Investment approach)

                // If P&L is explicit in transaction (unlikely from ingestion unless mapped)
                // For now, assume simple flow.
            }

            // Handle precision
            if (Math.abs(holdings[key].qty) < 0.01) {
                holdings[key].qty = 0;
                holdings[key].totalCost = 0; // Reset if closed?
                // Or should we track Realized P&L?
                // If we close position, totalCost remaining is basically P&L?
                // Example: Buy 100 for £100. Sell 100 for £120.
                // totalCost = 100 - 120 = -20.
                // Qty = 0.
                // If we reset totalCost to 0, we lose the -20 (Profit).
                // We should add -totalCost (which is 20) to Locked P&L.

                // Logic:
                // if qty -> 0, remainder of totalCost is Realized P&L.
                // But totalCost is Net Investment.
                // Profit = Proceeds - Cost.
                // Here Net Investment = Cost - Proceeds = -Profit.
                // So Locked P&L += -totalCost.
            }
        });

        // Let's refine the loop to capture P&L on close
        // Resetting holdings Map
        Object.keys(holdings).forEach(key => {
            if (holdings[key].qty === 0 && holdings[key].totalCost !== 0) {
                const pnl = -holdings[key].totalCost;
                lockedPnL[holdings[key].broker] += pnl;
                holdings[key].totalCost = 0;
            }
        });

        const activeHoldings = Object.values(holdings).filter(h => Math.abs(h.qty) > 0.01);
        return { activeHoldings, lockedPnL };
    };

    const { activeHoldings: rawActiveHoldings, lockedPnL } = computeHoldings();

    // Filter active holdings based on search term
    const activeHoldings = rawActiveHoldings.filter(h =>
        h.asset.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (h.ticker && h.ticker.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const groupBroker = (name) => activeHoldings.filter(h => h.broker === name) || [];

    // Dynamic broker list: combine hardcoded, DB-fetched, and transaction-derived
    const brokers_with_transactions = [...new Set(transactions.map(t => t.broker))].filter(Boolean);
    const combined_brokers = [...new Set([...brokers_with_transactions, ...explicitDbBrokers, ...Object.keys(brokerDict)])]
        .filter(b => !deletedBrokerNames.includes(b));
    // Sort by total value (largest first)
    const brokerValueMap = {};
    combined_brokers.forEach(b => {
        const cur = brokerDict[b] || BASE_BROKER_CURRENCY[b] || 'GBP';
        const items = activeHoldings.filter(h => h.broker === b);
        let total = items.reduce((acc, h) => acc + Math.abs(h.totalCost), 0);
        if (cur !== 'GBP' && rates) {
            if (cur === 'USD') total = total / rates.USD;
            if (cur === 'BRL') total = total / rates.BRL;
        }
        brokerValueMap[b] = total;
    });
    combined_brokers.sort((a, b) => (brokerValueMap[b] || 0) - (brokerValueMap[a] || 0) || a.localeCompare(b));
    const brokers_list = combined_brokers;

    // Determine topCurrency from broker totals
    const pensionCurrencyTotals = {};
    brokers_list.forEach(b => {
        const cur = brokerDict[b] || BASE_BROKER_CURRENCY[b] || 'GBP';
        const items = activeHoldings.filter(h => h.broker === b);
        let totalCost = items.reduce((acc, h) => acc + Math.abs(h.totalCost), 0);
        let totalCostGBP = totalCost;
        if (cur !== 'GBP' && rates) {
            if (cur === 'USD') totalCostGBP = totalCost / rates.USD;
            if (cur === 'BRL') totalCostGBP = totalCost / rates.BRL;
        }
        if (!pensionCurrencyTotals[cur]) pensionCurrencyTotals[cur] = 0;
        pensionCurrencyTotals[cur] += totalCostGBP;
    });

    let topCurrency = 'GBP';
    let maxCurrAmt = -1;
    Object.entries(pensionCurrencyTotals).forEach(([cur, amt]) => {
        if (amt > maxCurrAmt) {
            maxCurrAmt = amt;
            topCurrency = cur;
        }
    });
    if (Object.keys(pensionCurrencyTotals).length === 0) topCurrency = 'GBP';

    // Apply display currency override if set by the user
    const effectiveCurrency = displayCurrencyOverrides?.pensions || topCurrency;

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
                    className="flex justify-between items-center mb-4 px-4 py-3 cursor-pointer bg-white/5 hover:bg-white/10 rounded-2xl transition-colors"
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

    const updateSellCalc = (field, value) => {
        setSellData(prev => {
            const updated = { ...prev, [field]: value };
            const qty = parseFloat(updated.qtyToSell) || 0;
            let price = parseFloat(updated.sellPricePerShare) || 0;
            let proceeds = parseFloat(updated.totalProceeds) || 0;
            const avgCost = prev.avgCost; // Passed on init

            if (updated.asset === 'Cash') {
                price = 1;
                updated.sellPricePerShare = 1;
            }

            if (field === 'totalProceeds') {
                if (qty > 0) {
                    price = proceeds / qty;
                    updated.sellPricePerShare = price;
                }
            } else if (field === 'qtyToSell' || field === 'sellPricePerShare') {
                proceeds = price * qty;
                updated.totalProceeds = proceeds;
            }

            const costBasis = (avgCost || 0) * qty;
            updated.pnl = updated.totalProceeds - costBasis;
            updated.roi = costBasis !== 0 ? (updated.pnl / costBasis * 100) : 0;
            return updated;
        });
    };

    const updateBuyCalc = (field, value) => {
        setBuyData(prev => {
            const updated = { ...prev, [field]: value };
            const qty = parseFloat(updated.qtyToBuy) || 0;
            let price = parseFloat(updated.buyPricePerShare) || 0;
            let investment = parseFloat(updated.totalInvestment) || 0;

            if (updated.asset === 'Cash') {
                price = 1;
                updated.buyPricePerShare = 1;
            }

            if (field === 'totalInvestment') {
                if (qty > 0) {
                    price = investment / qty;
                    updated.buyPricePerShare = price;
                }
            } else if (field === 'qtyToBuy' || field === 'buyPricePerShare') {
                investment = qty * price;
                updated.totalInvestment = investment;
            }

            return updated;
        });
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
            <div id="ftue-pensions-header" className="glass-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '48px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
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

                {combined_brokers.length > 0 ? (
                    <div className="lg:flex lg:gap-8 lg:items-start">
                        <div className="flex-1 min-w-0">
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
                        </div>

                        <div className="hidden lg:block sticky top-8 h-fit">
                            <ContextPane
                                selectedAsset={selectedAsset}
                                rightPaneMode={rightPaneMode}
                                onClose={() => setSelectedAsset(null)}
                                maxHeight={contextPaneMaxHeight}
                                renderHeader={(asset) => (
                                    <div className="flex flex-col">
                                        <h3 className="text-xl font-bold text-white/90 tracking-tight">{asset.asset}</h3>
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

                <div id="ftue-pensions-fab">
                <FloatingActionButton
                    onAddBroker={() => {
                        setRightPaneMode('add-broker');
                        setSelectedAsset(null);
                    }}
                    brokerLabel="Add Broker"
                />
                </div>

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
