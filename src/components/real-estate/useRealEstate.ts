import { useState, useEffect } from 'react';
import { formatCurrency, convertCurrency } from '@/lib/currency';
import { usePortfolio } from '@/context/PortfolioContext';
import useContextPaneHeight from '@/hooks/useContextPaneHeight';
import type { RealEstateTabProps, PropertyData, PropertyDisplayData, FundHoldingComputed, SummaryCard, DeleteTarget } from './types';

export default function useRealEstate({ data, rates, onRefresh, marketData = {} }: RealEstateTabProps) {
    const { displayCurrencyOverrides } = usePortfolio();

    // --- UI State ---
    const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({});
    const [selectedAsset, setSelectedAsset] = useState<any>(null);
    const [rightPaneMode, setRightPaneMode] = useState('default');
    const [searchTerm, setSearchTerm] = useState('');
    const contextPaneMaxHeight = useContextPaneHeight('ftue-re-property-section', 'ftue-re-header');
    const [contextTab, setContextTab] = useState('overview');

    // Delete
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

    // Delete broker
    const [isDeleteBrokerModalOpen, setIsDeleteBrokerModalOpen] = useState(false);
    const [brokerToDelete, setBrokerToDelete] = useState<string | null>(null);

    // Property value editing
    const [editingValues, setEditingValues] = useState<any>(null);

    // Manual tab toggles
    const [enabledTabs, setEnabledTabs] = useState<Record<string, boolean>>({});
    const toggleEnabledTab = (id: string | number, tab: string) => {
        setEnabledTabs(prev => ({ ...prev, [`${id}-${tab}`]: !prev[`${id}-${tab}`] }));
    };

    // Add property (ContextPane form)
    const [newPropertyData, setNewPropertyData] = useState<any>({ name: '', currency: 'BRL', investment: '', currentValue: '', hasMortgage: false, hasRental: false });

    // DB brokers for Real Estate & glow tracking
    const [dbBrokers, setDbBrokers] = useState<any[]>([]);
    const [newlyAddedBrokers, setNewlyAddedBrokers] = useState<string[]>([]);
    const [newlyAddedProperties, setNewlyAddedProperties] = useState<string[]>([]);

    // Sell property
    const [sellPropertyData, setSellPropertyData] = useState<any>(null);

    // Activity history
    const [ledgerOpen, setLedgerOpen] = useState(false);

    // Fund buy/sell
    const [isFundBuyModalOpen, setIsFundBuyModalOpen] = useState(false);
    const [fundBuyData, setFundBuyData] = useState<any>(null);
    const [isFundSellModalOpen, setIsFundSellModalOpen] = useState(false);
    const [fundSellData, setFundSellData] = useState<any>(null);

    // Mortgage form
    const [mortgageFormData, setMortgageFormData] = useState<any>({ month: new Date().toISOString().split('T')[0], costs: '', interest: '', notes: '' });

    // Mortgage setup form
    const [mortgageSetupData, setMortgageSetupData] = useState<any>({ originalAmount: '', deposit: '', durationMonths: '', interestRate: '' });

    // Rental form
    const [rentalFormData, setRentalFormData] = useState<any>({ date: new Date().toISOString().split('T')[0], entryType: 'Cost', amount: '', notes: '' });

    // Airbnb sort
    const [airbnbSortConfig, setAirbnbSortConfig] = useState<{ key: string; direction: string }>({ key: 'month', direction: 'desc' });

    // Activity history
    const [showActivityHistory, setShowActivityHistory] = useState(false);

    // Success toast
    const [successToast, setSuccessToast] = useState<string | null>(null);

    // Transaction editing
    const [editingTransaction, setEditingTransaction] = useState<any>(null);

    // --- Effects ---
    const fetchREBrokers = async () => {
        try {
            const res = await fetch('/api/brokers?assetClass=Real Estate');
            const d = await res.json();
            if (d.brokers) setDbBrokers(d.brokers);
        } catch (e) { console.error('Failed to fetch RE brokers', e); }
    };
    useEffect(() => { fetchREBrokers(); }, []);

    // Keep selectedAsset in sync with fresh data after onRefresh()
    useEffect(() => {
        if (!selectedAsset || !data) return;
        if (selectedAsset.type === 'property') {
            const freshProp = data.properties?.find((p: PropertyData) => p.name === selectedAsset.name || p.id === selectedAsset.id);
            if (freshProp) {
                setSelectedAsset((prev: any) => ({ ...prev, ...freshProp, type: 'property' }));
            }
        } else if (selectedAsset.type === 'fund') {
            const allFunds = Object.values(data.funds || {}).flat() as any[];
            const freshFund = allFunds.find((f: any) => f.ticker === selectedAsset.ticker);
            if (freshFund) {
                setSelectedAsset((prev: any) => ({ ...prev, ...freshFund, type: 'fund' }));
            }
        }
    }, [data]);

    // Scroll to hash
    useEffect(() => {
        if (data && typeof window !== 'undefined' && window.location.hash) {
            const id = window.location.hash.substring(1);
            const el = document.getElementById(id);
            if (el) {
                setTimeout(() => {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.style.transition = 'box-shadow 1.5s ease-out';
                    el.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.4)';
                    setTimeout(() => { el.style.boxShadow = ''; }, 2000);
                }, 100);
            }
        }
    }, [data]);

    // --- Derived Data ---
    const properties = data?.properties || [];
    const funds = data?.funds || {};
    const BRL = rates?.BRL || 7.1;

    const activeProperties = properties.filter((p: PropertyData) => p.status !== 'Sold');
    const soldProperties = properties.filter((p: PropertyData) => p.status === 'Sold');

    const getPropertyDisplayData = (prop: PropertyData): PropertyDisplayData => {
        let currentValue = prop.currentValue || 0;
        let investment = prop.investment || 0;
        let taxes = prop.taxes || 0;
        let profitLoss = 0;
        let roi = 0;
        let equity = currentValue;

        if (prop.mortgage) {
            equity = currentValue - prop.mortgage.balance;
            const totalCost = prop.mortgage.deposit + taxes;
            profitLoss = equity - totalCost;
            if (prop.rental) profitLoss += (prop.rental.totalProfit || 0);
            roi = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;
        } else if (prop.rental) {
            const capitalGain = currentValue - investment;
            const rentalProfit = prop.rental.totalProfit || 0;
            profitLoss = (investment > 0 ? capitalGain : 0) + rentalProfit;
            roi = investment > 0 ? (profitLoss / investment) * 100 : 0;
        } else if (prop.status === 'Sold') {
            const salePrice = prop.salePrice || 0;
            const totalCost = investment + taxes;
            profitLoss = salePrice - totalCost;
            roi = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;
        } else {
            profitLoss = currentValue - investment;
            roi = investment > 0 ? (profitLoss / investment) * 100 : 0;
        }

        return { currentValue, investment, taxes, profitLoss, roi, equity };
    };

    const computeFundHoldings = (): FundHoldingComputed[] => {
        const summary: Record<string, any> = {};
        ((funds as any).transactions || []).forEach((tr: any) => {
            const ticker = tr.ticker || (tr.fund.split(' - ')[1] || tr.fund);
            const broker = 'XP';
            if (!summary[ticker]) summary[ticker] = { fund: tr.fund, ticker, broker, totalQuantity: 0, totalInvestment: 0, transactions: [] };
            summary[ticker].totalQuantity += tr.quantity;
            summary[ticker].totalInvestment += tr.investment;
            summary[ticker].transactions.push(tr);
        });
        return Object.values(summary).map((s: any) => {
            const holding = ((funds as any).holdings || []).find((h: any) => h.ticker === s.ticker);
            const liveData = marketData?.[`${s.ticker}.SA`];
            const curPrice = liveData?.price || holding?.currentPrice || 0;
            const curVal = s.totalQuantity * curPrice;
            const pnl = curVal - s.totalInvestment;
            const roi = s.totalInvestment !== 0 ? (pnl / s.totalInvestment) * 100 : 0;
            return { ...s, currentPrice: curPrice, currentValue: curVal, pnl, roi, liveData };
        });
    };

    const fundHoldings = computeFundHoldings();
    const fundBrokersFromHoldings = [...new Set(fundHoldings.map(f => f.broker))];
    const dbBrokerNames = dbBrokers.map((b: any) => b.name).filter((n: string) => !fundBrokersFromHoldings.includes(n));
    const fundBrokers = [...fundBrokersFromHoldings, ...dbBrokerNames];

    // Determine the "top currency"
    const currencyCounts: Record<string, number> = {};
    [...activeProperties, ...soldProperties].forEach((p: PropertyData) => {
        currencyCounts[p.currency] = (currencyCounts[p.currency] || 0) + 1;
    });
    fundHoldings.forEach(() => {
        currencyCounts['BRL'] = (currencyCounts['BRL'] || 0) + 1;
    });
    const topCurrency = Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'BRL';
    const effectiveCurrency = (displayCurrencyOverrides as any)?.realEstate || topCurrency;

    const toTopCurr = (amount: number, fromCurrency: string): number => {
        if (!rates) return amount;
        return convertCurrency(amount, fromCurrency, effectiveCurrency, rates);
    };

    let totalValue = 0;
    let totalInvestment = 0;
    activeProperties.forEach((p: PropertyData) => {
        const d = getPropertyDisplayData(p);
        totalValue += toTopCurr(p.mortgage ? d.equity : d.currentValue, p.currency);
        totalInvestment += toTopCurr(d.investment, p.currency);
    });
    fundHoldings.forEach((f: FundHoldingComputed) => {
        totalValue += toTopCurr(f.currentValue, 'BRL');
        totalInvestment += toTopCurr(f.totalInvestment, 'BRL');
    });

    let realisedPnL = 0;
    let soldInvestment = 0;
    soldProperties.forEach((p: PropertyData) => {
        const d = getPropertyDisplayData(p);
        realisedPnL += toTopCurr(d.profitLoss, p.currency);
        soldInvestment += toTopCurr(d.investment, p.currency);
    });

    const unrealisedPnL = totalValue - totalInvestment;
    const totalPnL = unrealisedPnL + realisedPnL;
    const totalROI = (totalInvestment + soldInvestment) !== 0 ? (totalPnL / (totalInvestment + soldInvestment)) * 100 : 0;

    // --- Handlers ---
    const toggleAccordion = (name: string) => setExpandedAccordions(prev => ({ ...prev, [name]: !prev[name] }));

    const handleDeleteEntry = (id: string | number) => {
        setDeleteTarget({ type: 'id', value: id });
        setIsDeleteModalOpen(true);
    };

    const handleEditTransaction = (tr: any) => {
        setEditingTransaction({ ...tr });
        setRightPaneMode('edit-transaction');
    };

    const handleSaveEditTransaction = async () => {
        if (!editingTransaction) return;
        try {
            if (editingTransaction.category === 'fund' || editingTransaction.ticker) {
                await fetch('/api/real-estate', {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ section: 'funds', transaction: { id: editingTransaction.id, date: editingTransaction.date, investment: parseFloat(editingTransaction.investment) || 0, quantity: parseFloat(editingTransaction.quantity) || 0, costPerShare: parseFloat(editingTransaction.costPerShare || editingTransaction.price) || 0 } })
                });
            } else {
                await fetch('/api/real-estate', {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ section: 'property-transaction', transaction: { id: editingTransaction.id, date: editingTransaction.date, amount: parseFloat(editingTransaction.amount) || 0, type: editingTransaction.type || editingTransaction.notes || '' } })
                });
            }
            setEditingTransaction(null); setRightPaneMode('default'); onRefresh();
        } catch (e) { console.error('Edit failed:', e); }
    };

    const handleDeleteAirbnbMonth = (month: string) => {
        setDeleteTarget({ type: 'airbnb-month', value: month });
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            let url: string;
            if (deleteTarget.type === 'airbnb-month') { url = `/api/real-estate?section=airbnb&month=${deleteTarget.value}`; }
            else if (deleteTarget.type === 'property') { url = `/api/real-estate?section=property&name=${encodeURIComponent(deleteTarget.name || '')}`; }
            else { url = `/api/real-estate?id=${deleteTarget.value}`; }
            await fetch(url, { method: 'DELETE' });
            setSelectedAsset(null); setRightPaneMode('default'); onRefresh();
        } catch (e) { console.error(e); }
        finally { setIsDeleteModalOpen(false); setDeleteTarget(null); }
    };

    const handleSavePropertyValues = async () => {
        if (!editingValues || isNaN(parseFloat(editingValues.currentValue)) || isNaN(parseFloat(editingValues.investment))) return;
        try {
            await fetch('/api/real-estate', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'updatePropertyValues', id: editingValues.id, name: editingValues.name, currentValue: parseFloat(editingValues.currentValue), investment: parseFloat(editingValues.investment), oldInvestment: editingValues.oldInvestment }) });
            setEditingValues(null); onRefresh();
        } catch (e) { console.error(e); }
    };

    const handleAddMortgagePayment = async () => {
        if (!mortgageFormData.month || !mortgageFormData.costs) return;
        try {
            const totalPayment = parseFloat(mortgageFormData.costs);
            const interestPaid = parseFloat(mortgageFormData.interest) || 0;
            const principalPaid = totalPayment - interestPaid;
            await fetch('/api/real-estate', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section: 'mortgages', propertyName: selectedAsset?.name, transaction: { month: mortgageFormData.month, costs: totalPayment, principal: principalPaid > 0 ? principalPaid : 0, notes: mortgageFormData.notes || 'Mortgage Payment' } }) });
            setMortgageFormData({ month: new Date().toISOString().split('T')[0], costs: '', interest: '', notes: '' }); setRightPaneMode('default');
            setSuccessToast(`Mortgage payment of ${formatCurrency(totalPayment, selectedAsset?.currency || 'GBP')} recorded`);
            setTimeout(() => setSuccessToast(null), 3500);
            onRefresh();
        } catch (e) { console.error(e); }
    };

    const handleSetupMortgage = async () => {
        if (!selectedAsset?.name) return;
        try {
            await fetch('/api/real-estate', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section: 'mortgage-setup', propertyName: selectedAsset.name, originalAmount: parseFloat(mortgageSetupData.originalAmount) || 0, deposit: parseFloat(mortgageSetupData.deposit) || 0, durationMonths: parseInt(mortgageSetupData.durationMonths) || 0, interestRate: parseFloat(mortgageSetupData.interestRate) || 0 }) });
            setMortgageSetupData({ originalAmount: '', deposit: '', durationMonths: '', interestRate: '' }); setRightPaneMode('default'); onRefresh();
        } catch (e) { console.error(e); }
    };

    const handleAddRentalEntry = async () => {
        if (!rentalFormData.date || !rentalFormData.amount) return;
        try {
            const amount = parseFloat(rentalFormData.amount) || 0;
            if (amount <= 0) return;
            await fetch('/api/real-estate', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section: 'airbnb-entry', propertyName: selectedAsset?.name, date: rentalFormData.date, type: rentalFormData.entryType, amount, notes: rentalFormData.notes || `Rental ${rentalFormData.entryType}` }) });
            setRentalFormData({ date: rentalFormData.date, entryType: rentalFormData.entryType, amount: '', notes: '' }); onRefresh();
        } catch (e) { console.error(e); }
    };

    // Fund handlers
    const handleFundBuyClick = (fundRow: any) => {
        const liveData = marketData?.[`${fundRow.ticker}.SA`];
        const livePrice = liveData?.price || fundRow.currentPrice || 0;
        setFundBuyData({ fund: fundRow.fund, ticker: fundRow.ticker, broker: fundRow.broker || 'XP', qtyToBuy: '', buyPricePerShare: livePrice, totalInvestment: 0, date: new Date().toISOString().split('T')[0] });
        setRightPaneMode('buy-transaction');
    };

    const handleNewFundBuyClick = (brokerName: string) => {
        setFundBuyData({ fund: '', ticker: '', broker: brokerName || 'XP', qtyToBuy: '', buyPricePerShare: '', totalInvestment: 0, date: new Date().toISOString().split('T')[0] });
        setRightPaneMode('buy-transaction');
    };

    const updateFundBuyCalc = (field: string, value: any) => {
        setFundBuyData((prev: any) => { const u = { ...prev, [field]: value }; u.totalInvestment = (parseFloat(u.qtyToBuy) || 0) * (parseFloat(u.buyPricePerShare) || 0); return u; });
    };

    const handleFundBuyConfirm = async () => {
        if (!fundBuyData?.fund) return;
        const qty = parseFloat(fundBuyData.qtyToBuy) || 0;
        const price = parseFloat(fundBuyData.buyPricePerShare) || 0;
        if (qty <= 0 || price <= 0) return;
        try {
            await fetch('/api/real-estate', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section: 'funds', transaction: { date: fundBuyData.date, fund: fundBuyData.fund, investment: price * qty, quantity: qty, costPerShare: price } }) });
            setRightPaneMode('default'); setFundBuyData(null); onRefresh();
        } catch (e) { console.error(e); }
    };

    const handleFundSellClick = (fundRow: any) => {
        const liveData = marketData?.[`${fundRow.ticker}.SA`];
        const livePrice = liveData?.price || fundRow.currentPrice || 0;
        const avgCost = fundRow.totalQuantity > 0 ? fundRow.totalInvestment / fundRow.totalQuantity : 0;
        const proceeds = livePrice * fundRow.totalQuantity;
        const pnl = proceeds - fundRow.totalInvestment;
        setFundSellData({ fund: fundRow.fund, ticker: fundRow.ticker, sharesHeld: fundRow.totalQuantity, avgCost, qtyToSell: fundRow.totalQuantity, sellPricePerShare: livePrice, totalProceeds: proceeds, pnl, roi: fundRow.totalInvestment ? (pnl / fundRow.totalInvestment * 100) : 0, date: new Date().toISOString().split('T')[0] });
        setRightPaneMode('sell-fund-transaction');
    };

    const updateFundSellCalc = (field: string, value: any) => {
        setFundSellData((prev: any) => { const u = { ...prev, [field]: value }; const qty = parseFloat(u.qtyToSell) || 0; const price = parseFloat(u.sellPricePerShare) || 0; u.totalProceeds = price * qty; const costBasis = prev.avgCost * qty; u.pnl = u.totalProceeds - costBasis; u.roi = costBasis ? (u.pnl / costBasis * 100) : 0; return u; });
    };

    const handleFundSellConfirm = async () => {
        if (!fundSellData) return;
        const qty = parseFloat(fundSellData.qtyToSell) || 0;
        const price = parseFloat(fundSellData.sellPricePerShare) || 0;
        if (qty <= 0 || price <= 0) return;
        try {
            await fetch('/api/real-estate', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section: 'funds', transaction: { date: fundSellData.date, fund: fundSellData.fund, investment: -(price * qty), quantity: -qty, costPerShare: price } }) });
            setRightPaneMode('default'); setFundSellData(null); onRefresh();
        } catch (e) { console.error(e); }
    };

    const handleAirbnbSort = (key: string) => {
        setAirbnbSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc' }));
    };

    const handleDeleteBrokerClick = (brokerName: string) => {
        setBrokerToDelete(brokerName); setIsDeleteBrokerModalOpen(true);
    };

    const handleConfirmDeleteBroker = async () => {
        if (!brokerToDelete) return;
        try {
            const res = await fetch(`/api/brokers?name=${encodeURIComponent(brokerToDelete)}`, { method: 'DELETE' });
            if (!res.ok) { console.error('Delete failed:', await res.text()); return; }
            setDbBrokers(prev => prev.filter((b: any) => b.name !== brokerToDelete));
            setIsDeleteBrokerModalOpen(false); setBrokerToDelete(null);
            if (onRefresh) onRefresh();
        } catch (e) { console.error('Failed to delete broker', e); }
    };

    const handleRenameAsset = async (oldName: string, newName: string, broker?: string) => {
        try {
            const res = await fetch('/api/assets/rename', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldName, newName, broker: broker || 'Properties', assetClass: 'Real Estate' }) });
            const data = await res.json();
            if (!res.ok) return { error: data.error || 'Failed to rename' };
            onRefresh(); setSelectedAsset(null); return { success: true };
        } catch (e) { console.error('Rename failed:', e); return { error: 'Network error' }; }
    };

    // Build summary cards for hero section
    const buildSummaryCards = (): SummaryCard[] => {
        const cards: SummaryCard[] = [];
        const toBRL = (amount: number, currency: string) => {
            if (currency === 'BRL') return amount;
            if (currency === 'GBP') return amount * BRL;
            if (currency === 'USD') return amount * (rates?.USD || 1.28) * BRL / (rates?.USD || 1.28);
            return amount;
        };
        let propVal = 0, propCost = 0;
        activeProperties.forEach((p: PropertyData) => { const d = getPropertyDisplayData(p); propVal += toBRL(p.mortgage ? d.equity : d.currentValue, p.currency); propCost += toBRL(d.investment, p.currency); });
        let propRealisedPnL = 0;
        soldProperties.forEach((p: PropertyData) => { propRealisedPnL += toBRL(getPropertyDisplayData(p).profitLoss, p.currency); });
        const propPnL = propVal - propCost + propRealisedPnL;
        const propROI = propCost !== 0 ? (propPnL / propCost * 100) : 0;
        cards.push({ name: 'Properties', currentValue: propVal, purchasePrice: propCost, pnl: propPnL, roi: propROI, currency: 'BRL' });

        fundBrokers.forEach((b: string) => {
            const brokerFunds = fundHoldings.filter(f => f.broker === b);
            let fVal = 0, fCost = 0;
            brokerFunds.forEach(f => { fVal += f.currentValue; fCost += f.totalInvestment; });
            const fPnL = fVal - fCost;
            const fROI = fCost !== 0 ? (fPnL / fCost * 100) : 0;
            cards.push({ name: b, currentValue: fVal, purchasePrice: fCost, pnl: fPnL, roi: fROI, currency: 'BRL' });
        });
        return cards;
    };

    return {
        // UI State
        expandedAccordions, setExpandedAccordions,
        successToast, setSuccessToast,
        selectedAsset, setSelectedAsset,
        rightPaneMode, setRightPaneMode,
        searchTerm, setSearchTerm,
        contextPaneMaxHeight,
        contextTab, setContextTab,
        isDeleteModalOpen, setIsDeleteModalOpen,
        deleteTarget, setDeleteTarget,
        isDeleteBrokerModalOpen, setIsDeleteBrokerModalOpen,
        brokerToDelete, setBrokerToDelete,
        editingValues, setEditingValues,
        enabledTabs, toggleEnabledTab,
        newPropertyData, setNewPropertyData,
        dbBrokers,
        newlyAddedBrokers, setNewlyAddedBrokers,
        newlyAddedProperties, setNewlyAddedProperties,
        sellPropertyData, setSellPropertyData,
        ledgerOpen, setLedgerOpen,
        isFundBuyModalOpen, setIsFundBuyModalOpen,
        fundBuyData, setFundBuyData,
        isFundSellModalOpen, setIsFundSellModalOpen,
        fundSellData, setFundSellData,
        mortgageFormData, setMortgageFormData,
        mortgageSetupData, setMortgageSetupData,
        rentalFormData, setRentalFormData,
        airbnbSortConfig,
        showActivityHistory, setShowActivityHistory,
        editingTransaction, setEditingTransaction,
        // also expose marketData + onRefresh for sub-components
        marketData, onRefresh,

        // Derived Data
        properties, funds, BRL,
        activeProperties, soldProperties,
        fundHoldings, fundBrokers,
        topCurrency, effectiveCurrency,
        totalValue, totalInvestment,
        realisedPnL, soldInvestment, totalPnL, totalROI,

        // Handlers
        toggleAccordion, handleDeleteEntry, handleEditTransaction, handleSaveEditTransaction,
        handleDeleteAirbnbMonth, confirmDelete, handleSavePropertyValues,
        handleAddMortgagePayment, handleSetupMortgage, handleAddRentalEntry,
        handleFundBuyClick, handleNewFundBuyClick, updateFundBuyCalc, handleFundBuyConfirm,
        handleFundSellClick, updateFundSellCalc, handleFundSellConfirm,
        handleAirbnbSort, handleDeleteBrokerClick, handleConfirmDeleteBroker,
        handleRenameAsset, fetchREBrokers,

        // Computed
        getPropertyDisplayData, buildSummaryCards, toTopCurr,
    };
}
