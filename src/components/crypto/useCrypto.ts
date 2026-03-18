import { useState, useEffect, useRef } from 'react';
import { convertCurrency } from '@/lib/currency';
import { usePortfolio } from '@/context/PortfolioContext';
import useContextPaneHeight from '@/hooks/useContextPaneHeight';
import type { CryptoTabProps, CryptoTransaction, CryptoSellData, CryptoBuyData, CryptoHolding } from './types';

const BROKER_CURRENCY: Record<string, string> = { "Binance": "USD", "Coinbase": "USD", "Crypto Wallet": "USD" };

export { BROKER_CURRENCY };

export default function useCrypto({ transactions = [], marketData = {}, rates, onRefresh }: CryptoTabProps) {
    const { setIsInspectorOpen, setInspectorMode, setEditingTransaction, displayCurrencyOverrides } = usePortfolio() as any;
    const [isLoading, setIsLoading] = useState(false);
    const [ledgerOpen, setLedgerOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleteBrokerModalOpen, setIsDeleteBrokerModalOpen] = useState(false);
    const [brokerToDelete, setBrokerToDelete] = useState<string | null>(null);
    const [expandedBrokers, setExpandedBrokers] = useState<Record<string, boolean>>({});
    const toggleBroker = (b: string) => setExpandedBrokers(prev => ({ ...prev, [b]: !prev[b] }));
    const [searchTerm, setSearchTerm] = useState('');
    const contextPaneMaxHeight = useContextPaneHeight('ftue-crypto-exchange-section', 'ftue-crypto-header');
    const [selectedAsset, setSelectedAsset] = useState<any>(null);
    const [rightPaneMode, setRightPaneMode] = useState('default');
    const [showEmptyBrokers, setShowEmptyBrokers] = useState(false);
    const [brokerDict, setBrokerDict] = useState<Record<string, string>>({ ...BROKER_CURRENCY });
    const [explicitDbBrokers, setExplicitDbBrokers] = useState<string[]>([]);
    const [deletedBrokerNames, setDeletedBrokerNames] = useState<string[]>([]);
    const [newlyAddedBrokers, setNewlyAddedBrokers] = useState<string[]>([]);

    const isInitialFetch = useRef(true);

    const [trToDelete, setTrToDelete] = useState<string | number | null>(null);
    const [editingTr, setEditingTr] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSellModalOpen, setIsSellModalOpen] = useState(false);
    const [sellData, setSellData] = useState<CryptoSellData | null>(null);
    const [buyData, setBuyData] = useState<CryptoBuyData | null>(null);
    const [isFetchingPrice, setIsFetchingPrice] = useState(false);

    const fetchBrokers = async () => {
        try {
            const res = await fetch('/api/brokers?assetClass=Crypto');
            const data = await res.json();
            if (data.brokers) {
                const fetchedNames: string[] = data.brokers.map((b: any) => b.name);

                if (!isInitialFetch.current) {
                    const newNames = fetchedNames.filter((name: string) => !explicitDbBrokers.includes(name) && !deletedBrokerNames.includes(name));
                    if (newNames.length > 0) {
                        setNewlyAddedBrokers(prev => [...new Set([...prev, ...newNames])]);
                        const expansions: Record<string, boolean> = {};
                        newNames.forEach((n: string) => expansions[n] = true);
                        setExpandedBrokers(prev => ({ ...prev, ...expansions }));
                    }
                }

                const dict: Record<string, string> = { ...BROKER_CURRENCY };
                data.brokers.forEach((b: any) => dict[b.name] = b.currency);
                deletedBrokerNames.forEach((name: string) => delete dict[name]);
                setBrokerDict(dict);
                setExplicitDbBrokers(fetchedNames);
                isInitialFetch.current = false;
            }
        } catch (e) { console.error('Failed to fetch brokers', e); }
    };

    useEffect(() => { fetchBrokers(); }, []);

    // Compute current holdings
    const computeHoldings = () => {
        const holdings: Record<string, CryptoHolding> = {};
        const lockedPnL: Record<string, number> = {};

        const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

        sorted.forEach(tr => {
            const key = `${tr.asset}|${tr.broker}`;
            if (!holdings[key]) {
                holdings[key] = { asset: tr.asset, qty: 0, totalCost: 0, broker: tr.broker, currency: tr.currency, ticker: tr.ticker || null };
            }
            if (tr.ticker && !holdings[key].ticker) holdings[key].ticker = tr.ticker;
            if (!lockedPnL[tr.broker]) lockedPnL[tr.broker] = 0;

            holdings[key].qty += (tr.quantity || 0);
            holdings[key].totalCost += tr.investment;

            if (tr.pnl !== null && tr.pnl !== undefined && tr.pnl !== 0) {
                lockedPnL[tr.broker] += tr.pnl;
            }

            if (Math.abs(holdings[key].qty) < 0.01) {
                holdings[key].totalCost = 0;
                holdings[key].qty = 0;
            }
        });

        const activeHoldings = Object.values(holdings).filter(h => Math.abs(h.qty) > 0.01);
        return { activeHoldings, lockedPnL };
    };

    // Auto-expand brokers when searching
    useEffect(() => {
        if (searchTerm) {
            const { activeHoldings: rawActiveHoldings } = computeHoldings();
            const matching: Record<string, boolean> = {};
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
            const id = window.location.hash.substring(1);
            const element = document.getElementById(id);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.style.transition = 'background-color 1.5s ease-out';
                    element.style.backgroundColor = 'rgba(212, 175, 55, 0.2)';
                    setTimeout(() => { element.style.backgroundColor = ''; }, 2000);
                }, 100);
            }
        }
    }, [isLoading, transactions.length]);

    const { activeHoldings: rawActiveHoldings, lockedPnL } = computeHoldings();

    const activeHoldings = rawActiveHoldings.filter(h =>
        h.asset.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (h.ticker && h.ticker.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Group by broker
    const brokerGroups: Record<string, CryptoHolding[]> = {};
    activeHoldings.forEach(h => {
        if (!brokerGroups[h.broker]) brokerGroups[h.broker] = [];
        brokerGroups[h.broker].push(h);
    });

    const brokerTotals: Record<string, number> = {};
    const currencyTotals: Record<string, number> = {};

    Object.keys(brokerGroups).forEach(b => {
        const cur = brokerDict[b] || 'USD';
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
    const dbBrokerNames = explicitDbBrokers.filter(b => !activeBrokers.includes(b));

    let topCurrency = 'USD';
    let maxAmt = -1;
    Object.entries(currencyTotals).forEach(([cur, amt]) => {
        if (amt > maxAmt) { maxAmt = amt; topCurrency = cur; }
    });
    if (Object.keys(currencyTotals).length === 0) topCurrency = 'USD';

    const effectiveCurrency = displayCurrencyOverrides?.crypto || topCurrency;

    const brokers = [...activeBrokers, ...dbBrokerNames]
        .sort((a, b) => {
            const costA = brokerTotals[a] || 0;
            const costB = brokerTotals[b] || 0;
            if (costA !== costB) return costB - costA;
            return a.localeCompare(b);
        });

    const getLivePrice = (ticker: string | null | undefined, assetName: string) => {
        if (assetName === 'Cash') return 1.0;
        if (assetName === 'Monzo - Equity') return 14.41;
        if (!ticker || !marketData[ticker]) return null;
        return marketData[ticker].price;
    };

    // Delete handlers
    const handleDeleteClick = (id: string | number) => { setTrToDelete(id); setIsDeleteModalOpen(true); };
    const handleConfirmDelete = async () => {
        if (!trToDelete) return;
        try {
            await fetch(`/api/crypto-transactions?id=${trToDelete}`, { method: 'DELETE' });
            if (onRefresh) onRefresh();
            setIsDeleteModalOpen(false); setTrToDelete(null);
        } catch (e) { console.error(e); }
    };

    const handleDeleteBrokerClick = (brokerName: string) => {
        setBrokerToDelete(brokerName);
        setIsDeleteBrokerModalOpen(true);
    };

    const handleConfirmDeleteBroker = async () => {
        if (!brokerToDelete) return;
        try {
            const res = await fetch(`/api/brokers?name=${encodeURIComponent(brokerToDelete)}`, { method: 'DELETE' });
            if (!res.ok) { console.error('Delete failed:', await res.text()); return; }
            setDeletedBrokerNames(prev => [...prev, brokerToDelete]);
            setBrokerDict(prev => { const next = { ...prev }; delete next[brokerToDelete]; return next; });
            setExplicitDbBrokers(prev => prev.filter(n => n !== brokerToDelete));
            setIsDeleteBrokerModalOpen(false);
            setBrokerToDelete(null);
        } catch (e) { console.error('Failed to delete broker', e); }
    };

    // Edit handlers
    const handleEditClick = (tr: any) => { setEditingTr({ ...tr }); setRightPaneMode('edit-transaction'); };
    const handleEditChange = (field: string, value: any) => { setEditingTr((prev: any) => prev ? ({ ...prev, [field]: value }) : null); };
    const handleEditSave = async () => {
        if (!editingTr) return;
        try {
            const payload = {
                ...editingTr,
                investment: parseFloat(String(editingTr.investment)) || 0,
                quantity: parseFloat(String(editingTr.quantity)) || 0,
                type: editingTr.type || 'Buy',
                platform: editingTr.broker || editingTr.platform,
            };
            const res = await fetch('/api/crypto-transactions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (res.ok) {
                if (onRefresh) onRefresh();
                setRightPaneMode('default'); setEditingTr(null);
            } else {
                const text = await res.text();
                alert('Edit transaction failed: ' + text);
                console.error(text);
            }
        } catch (e: any) {
            alert('Edit transaction failed: ' + e.message);
            console.error(e);
        }
    };

    // Sell flow
    const handleSellClick = (holding: any) => {
        const livePrice = getLivePrice(holding.ticker, holding.asset);
        const avgCost = holding.qty > 0 ? holding.totalCost / holding.qty : 0;
        const qty = Math.abs(holding.qty);
        const sellPrice = livePrice || avgCost;
        const proceeds = sellPrice * qty;
        const pnl = proceeds - holding.totalCost;
        const roi = holding.totalCost !== 0 ? (pnl / holding.totalCost * 100) : 0;
        setSellData({
            asset: holding.asset, broker: holding.broker, currency: holding.currency,
            ticker: holding.ticker, sharesHeld: qty, avgCost,
            qtyToSell: qty, sellPricePerShare: sellPrice,
            totalProceeds: proceeds, pnl, roi,
            date: new Date().toISOString().split('T')[0],
        });
        setIsSellModalOpen(true);
    };

    const updateSellCalc = (field: string, value: string) => {
        setSellData(prev => {
            if (!prev) return null;
            const updated: any = { ...prev, [field]: value };
            let qty = parseFloat(updated.qtyToSell) || 0;
            let price = parseFloat(updated.sellPricePerShare) || 0;
            let proceeds = parseFloat(updated.totalProceeds) || 0;
            const avgCost = prev.avgCost;

            if (field === 'totalProceeds') {
                if (qty > 0) { price = proceeds / qty; updated.sellPricePerShare = price; }
            } else if (field === 'qtyToSell' || field === 'sellPricePerShare') {
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
        const qty = parseFloat(String(sellData.qtyToSell)) || 0;
        const price = parseFloat(String(sellData.sellPricePerShare)) || 0;
        const tr = {
            date: sellData.date, asset: sellData.asset, broker: sellData.broker,
            currency: sellData.currency, ticker: sellData.ticker,
            investment: -price * Math.abs(qty), quantity: -Math.abs(qty),
            pnl: parseFloat(String(sellData.pnl)) || 0, type: 'Sell', platform: sellData.broker
        };
        try {
            const res = await fetch('/api/crypto-transactions', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tr)
            });
            if (res.ok) {
                if (onRefresh) onRefresh();
                setIsSellModalOpen(false); setSellData(null);
            } else {
                const text = await res.text();
                alert('Sell transaction failed: ' + text);
                console.error(text);
            }
        } catch (e: any) { alert('Sell transaction failed: ' + e.message); console.error(e); }
    };

    // Buy flow
    const handleBuyClick = (holding: any) => {
        const livePrice = getLivePrice(holding.ticker, holding.asset);
        setBuyData({
            asset: holding.asset, broker: holding.broker, currency: holding.currency,
            ticker: holding.ticker, qtyToBuy: '', buyPricePerShare: livePrice || '',
            totalInvestment: 0, date: new Date().toISOString().split('T')[0],
        });
        setRightPaneMode('add-transaction');
    };

    const handleNewBuyClick = (brokerName: string) => {
        const cur = brokerDict[brokerName] || 'USD';
        setBuyData({
            asset: '', broker: brokerName, currency: cur, ticker: '',
            qtyToBuy: '', buyPricePerShare: '', totalInvestment: 0,
            date: new Date().toISOString().split('T')[0],
        });
        setRightPaneMode('add-transaction');
    };

    const updateBuyCalc = (field: string, value: string) => {
        setBuyData(prev => {
            if (!prev) return null;
            const updated: any = { ...prev, [field]: value };
            let qty = parseFloat(updated.qtyToBuy) || 0;
            let price = parseFloat(updated.buyPricePerShare) || 0;
            let investment = parseFloat(updated.totalInvestment) || 0;

            if (field === 'totalInvestment') {
                if (qty > 0) { price = investment / qty; updated.buyPricePerShare = price; }
            } else if (field === 'qtyToBuy' || field === 'buyPricePerShare') {
                investment = qty * price;
                updated.totalInvestment = investment;
            }
            return updated;
        });
    };

    const handleBuyConfirm = async () => {
        if (!buyData || !buyData.asset) return;
        const qty = parseFloat(String(buyData.qtyToBuy)) || 0;
        const price = parseFloat(String(buyData.buyPricePerShare)) || 0;
        if (qty <= 0 || price <= 0) return;
        const tr = {
            date: buyData.date, asset: buyData.asset, broker: buyData.broker,
            currency: buyData.currency, ticker: buyData.ticker,
            investment: price * qty, quantity: qty,
            isSalaryContribution: buyData.isSalaryContribution || false,
            type: 'Buy', platform: buyData.broker
        };
        try {
            const res = await fetch('/api/crypto-transactions', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tr)
            });
            if (res.ok) {
                if (onRefresh) onRefresh();
                setRightPaneMode('default'); setBuyData(null);
            } else {
                const text = await res.text();
                alert('Add transaction failed: ' + text);
                console.error(text);
            }
        } catch (e: any) { alert('Add transaction failed: ' + e.message); console.error(e); }
    };

    const handleRenameAsset = async (oldName: string, newName: string, broker: string) => {
        try {
            const res = await fetch('/api/assets/rename', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldName, newName, broker, assetClass: 'Crypto' })
            });
            const data = await res.json();
            if (!res.ok) return { error: data.error || 'Failed to rename' };
            onRefresh?.();
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
        isDeleteBrokerModalOpen, setIsDeleteBrokerModalOpen,
        brokerToDelete, setBrokerToDelete,
        expandedBrokers, setExpandedBrokers,
        toggleBroker,
        searchTerm, setSearchTerm,
        contextPaneMaxHeight,
        selectedAsset, setSelectedAsset,
        rightPaneMode, setRightPaneMode,
        showEmptyBrokers, setShowEmptyBrokers,
        brokerDict,
        explicitDbBrokers,
        deletedBrokerNames,
        newlyAddedBrokers, setNewlyAddedBrokers,
        trToDelete, setTrToDelete,
        editingTr, setEditingTr,
        isEditModalOpen, setIsEditModalOpen,
        isSellModalOpen, setIsSellModalOpen,
        sellData, setSellData,
        buyData, setBuyData,
        isFetchingPrice, setIsFetchingPrice,

        // Derived
        activeHoldings, lockedPnL,
        brokerGroups,
        brokers,
        topCurrency, effectiveCurrency,
        marketData,

        // Handlers
        fetchBrokers,
        handleDeleteClick, handleConfirmDelete,
        handleDeleteBrokerClick, handleConfirmDeleteBroker,
        handleEditClick, handleEditChange, handleEditSave,
        handleSellClick, updateSellCalc, handleSellConfirm,
        handleBuyClick, handleNewBuyClick, updateBuyCalc, handleBuyConfirm,
        handleRenameAsset,
        getLivePrice,
        computeHoldings,
    };
}
