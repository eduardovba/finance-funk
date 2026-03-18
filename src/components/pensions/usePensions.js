import { useState, useEffect, useRef } from 'react';
import { convertCurrency } from '@/lib/currency';
import { usePortfolio } from '@/context/PortfolioContext';
import useContextPaneHeight from '@/hooks/useContextPaneHeight';
import pensionMap from '../../data/pension_fund_map.json';

const BASE_BROKER_CURRENCY = {
    'Fidelity': 'GBP',
    'Hargreaves Lansdown': 'GBP',
    'Legal & General': 'GBP',
    'OAB': 'GBP'
};

export { BASE_BROKER_CURRENCY };

export default function usePensions({ transactions = [], rates, onRefresh, marketData: globalMarketData, pensionPrices: globalPensionPrices }) {
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
    const [expandedBrokers, setExpandedBrokers] = useState({});
    const toggleBroker = (b) => setExpandedBrokers(prev => ({ ...prev, [b]: !prev[b] }));

    const [newlyAddedBrokers, setNewlyAddedBrokers] = useState([]);
    const isInitialFetch = useRef(true);

    const [rightPaneMode, setRightPaneMode] = useState('default');
    const [sellData, setSellData] = useState(null);
    const [buyData, setBuyData] = useState(null);
    const [isFetchingPrice, setIsFetchingPrice] = useState(false);

    const [ledgerSortKey, setLedgerSortKey] = useState('date');
    const [ledgerSortDir, setLedgerSortDir] = useState('desc');

    const marketData = globalMarketData || {};
    const livePrices = globalPensionPrices || {};

    // --- Handlers ---
    const handleLedgerSort = (key) => {
        if (ledgerSortKey === key) {
            setLedgerSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setLedgerSortKey(key);
            setLedgerSortDir('asc');
        }
    };

    const sortArrow = (key) => ledgerSortKey === key ? (ledgerSortDir === 'asc' ? ' ▲' : ' ▼') : '';

    const fetchBrokers = async () => {
        try {
            const res = await fetch('/api/brokers');
            const data = await res.json();
            if (data.brokers) {
                const pensionBrokers = data.brokers.filter(b => b.asset_class === 'Pension');
                const fetchedNames = pensionBrokers.map(b => b.name);

                if (!isInitialFetch.current) {
                    const newNames = fetchedNames.filter(name => !explicitDbBrokers.includes(name) && !deletedBrokerNames.includes(name));
                    if (newNames.length > 0) {
                        setNewlyAddedBrokers(prev => [...new Set([...prev, ...newNames])]);
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

    // Compute current holdings
    const computeHoldings = () => {
        const holdings = {};
        const lockedPnL = {};

        const sorted = [...transactions].sort((a, b) => {
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
                holdings[key].totalCost -= val;
            }

            if (Math.abs(holdings[key].qty) < 0.01) {
                holdings[key].qty = 0;
                holdings[key].totalCost = 0;
            }
        });

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

    const { activeHoldings: rawActiveHoldings, lockedPnL } = computeHoldings();

    const activeHoldings = rawActiveHoldings.filter(h =>
        h.asset.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (h.ticker && h.ticker.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const groupBroker = (name) => activeHoldings.filter(h => h.broker === name) || [];

    // Dynamic broker list
    const brokers_with_transactions = [...new Set(transactions.map(t => t.broker))].filter(Boolean);
    const combined_brokers = [...new Set([...brokers_with_transactions, ...explicitDbBrokers])]
        .filter(b => !deletedBrokerNames.includes(b));

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

    // Top currency
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
        if (amt > maxCurrAmt) { maxCurrAmt = amt; topCurrency = cur; }
    });
    if (Object.keys(pensionCurrencyTotals).length === 0) topCurrency = 'GBP';

    const effectiveCurrency = displayCurrencyOverrides?.pensions || topCurrency;

    // Delete handlers
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

    // Edit handlers
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

    // Sell flow
    const handleSellClick = (holding) => {
        let price = holding.currentValue && holding.qty ? holding.currentValue / holding.qty : 0;
        if (holding.asset === 'Cash') price = 1;

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
            asset: holding.asset, broker: holding.broker, currency: 'GBP',
            ticker: holding.ticker, sharesHeld: holding.qty,
            qtyToSell: holding.qty, sellPricePerShare: price,
            totalProceeds: price * holding.qty, avgCost: avgCost,
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
            date: sellData.date, description: sellData.asset,
            account: sellData.broker, ticker: sellData.ticker,
            type: 'Sell', category: 'Pension',
            quantity: qty, amount: value, price: price,
            pnl: sellData.pnl, roiPercent: sellData.roi
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
            asset: holding.asset, broker: holding.broker, currency: 'GBP',
            ticker: holding.ticker, qtyToBuy: '',
            buyPricePerShare: holding.asset === 'Cash' ? 1 : '',
            totalInvestment: 0,
            date: new Date().toISOString().split('T')[0],
            allocationClass: holding.allocationClass || 'Equity'
        });
        setRightPaneMode('add-transaction');
    };

    const handleNewBuyClick = (brokerName) => {
        const cur = brokerDict[brokerName] || 'GBP';
        setBuyData({
            asset: '', broker: brokerName, currency: cur,
            ticker: '', qtyToBuy: '', buyPricePerShare: '',
            totalInvestment: 0,
            date: new Date().toISOString().split('T')[0],
            allocationClass: 'Equity',
            buyPath: 'search', scraperUrl: '', isVerified: false
        });
        setRightPaneMode('add-transaction');
    };

    const handleAssetSelect = async (selectedAsset) => {
        setIsFetchingPrice(true);
        try {
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
            date: buyData.date, description: buyData.asset,
            account: buyData.broker,
            ticker: buyData.ticker || buyData.asset,
            type: 'Buy', category: 'Pension',
            quantity: qty, amount: price * qty, price: price,
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

    const updateSellCalc = (field, value) => {
        setSellData(prev => {
            const updated = { ...prev, [field]: value };
            const qty = parseFloat(updated.qtyToSell) || 0;
            let price = parseFloat(updated.sellPricePerShare) || 0;
            let proceeds = parseFloat(updated.totalProceeds) || 0;
            const avgCost = prev.avgCost;

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

    const handleRenameAsset = async (oldName, newName, broker) => {
        try {
            const res = await fetch('/api/assets/rename', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldName, newName, broker, assetClass: 'Pensions' })
            });
            const data = await res.json();
            if (!res.ok) return { error: data.error || 'Failed to rename' };
            onRefresh();
            setSelectedAsset(null);
            return { success: true };
        } catch (e) {
            console.error('Rename failed:', e);
            return { error: 'Network error' };
        }
    };

    return {
        // State
        isLoading, setIsLoading,
        ledgerOpen, setLedgerOpen,
        isDeleteModalOpen, setIsDeleteModalOpen,
        trToDelete, setTrToDelete,
        isDeleteBrokerModalOpen, setIsDeleteBrokerModalOpen,
        brokerToDelete, setBrokerToDelete,
        editingTr, setEditingTr,
        selectedAsset, setSelectedAsset,
        searchTerm, setSearchTerm,
        contextPaneMaxHeight,
        brokerDict,
        explicitDbBrokers,
        deletedBrokerNames,
        showEmptyBrokers, setShowEmptyBrokers,
        expandedBrokers, setExpandedBrokers,
        toggleBroker,
        newlyAddedBrokers, setNewlyAddedBrokers,
        rightPaneMode, setRightPaneMode,
        sellData, setSellData,
        buyData, setBuyData,
        isFetchingPrice,
        ledgerSortKey, ledgerSortDir,
        marketData, livePrices,

        // Derived
        activeHoldings, lockedPnL,
        brokers_list,
        topCurrency, effectiveCurrency,

        // Handlers
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
        computeHoldings,
    };
}
