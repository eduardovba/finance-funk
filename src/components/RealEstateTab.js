import React, { useState, useEffect } from 'react';
import AssetSearch from './AssetSearch';
import ConfirmationModal from './ConfirmationModal';
import AssetCard from './AssetCard';
import TransactionTimeline from './TransactionTimeline';
import FloatingActionButton from './FloatingActionButton';
import PullToRefresh from './PullToRefresh';
import ContextPane from './ContextPane';
import BrokerForm from './BrokerForm';
import CurrencySelector from './CurrencySelector';
import NumberInput from './NumberInput';
import { formatCurrency } from '@/lib/currency';
import { X } from 'lucide-react';

export default function RealEstateTab({ data, rates, onRefresh, marketData = {} }) {
    // --- State ---
    const [expandedAccordions, setExpandedAccordions] = useState({ Properties: true });
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [rightPaneMode, setRightPaneMode] = useState('default');
    const [searchTerm, setSearchTerm] = useState('');
    const [contextTab, setContextTab] = useState('overview');

    // Delete
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'id'|'airbnb-month', value }

    // Property value editing
    const [editingValues, setEditingValues] = useState(null);

    // Manual tab toggles
    const [enabledTabs, setEnabledTabs] = useState({});
    const toggleEnabledTab = (id, tab) => {
        setEnabledTabs(prev => ({ ...prev, [`${id}-${tab}`]: !prev[`${id}-${tab}`] }));
    };

    // Add property (ContextPane form)
    const [newPropertyData, setNewPropertyData] = useState({ name: '', currency: 'BRL', investment: '', currentValue: '', hasMortgage: false, hasRental: false });

    // Sell property
    const [sellPropertyData, setSellPropertyData] = useState(null);

    // Activity history
    const [ledgerOpen, setLedgerOpen] = useState(false);

    // Fund buy/sell
    const [isFundBuyModalOpen, setIsFundBuyModalOpen] = useState(false);
    const [fundBuyData, setFundBuyData] = useState(null);
    const [isFundSellModalOpen, setIsFundSellModalOpen] = useState(false);
    const [fundSellData, setFundSellData] = useState(null);

    // Mortgage form
    const [mortgageFormData, setMortgageFormData] = useState({ month: '', costs: '', interest: '', notes: '' });

    // Mortgage setup form
    const [mortgageSetupData, setMortgageSetupData] = useState({ originalAmount: '', deposit: '', durationMonths: '', interestRate: '' });

    // Rental form — individual entries (revenue or cost on a specific date)
    const [rentalFormData, setRentalFormData] = useState({ date: '', entryType: 'Cost', amount: '', notes: '' });

    // Airbnb sort
    const [airbnbSortConfig, setAirbnbSortConfig] = useState({ key: 'month', direction: 'desc' });

    // Activity history
    const [showActivityHistory, setShowActivityHistory] = useState(false);

    // Transaction editing
    const [editingTransaction, setEditingTransaction] = useState(null);

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

    if (!data) return <div style={{ color: 'var(--fg-secondary)', padding: '20px' }}>Loading real estate data...</div>;

    const { properties = [], funds = {} } = data;
    const BRL = rates?.BRL || 7.1;

    // --- Derived Data ---
    const activeProperties = properties.filter(p => p.status !== 'Sold');
    const soldProperties = properties.filter(p => p.status === 'Sold');

    // Compute property values for display
    const getPropertyDisplayData = (prop) => {
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
            // Include rental net profit if property also has rental income
            if (prop.rental) profitLoss += (prop.rental.totalProfit || 0);
            roi = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;
        } else if (prop.rental) {
            // Rental-only property: capital appreciation + rental profit
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

    // Fund computations
    const computeFundHoldings = () => {
        const summary = {};
        (funds.transactions || []).forEach(tr => {
            const ticker = tr.ticker || (tr.fund.split(' - ')[1] || tr.fund);
            const broker = 'XP'; // All RE funds are under XP
            if (!summary[ticker]) summary[ticker] = { fund: tr.fund, ticker, broker, totalQuantity: 0, totalInvestment: 0, transactions: [] };
            summary[ticker].totalQuantity += tr.quantity;
            summary[ticker].totalInvestment += tr.investment;
            summary[ticker].transactions.push(tr);
        });
        return Object.values(summary).map(s => {
            const holding = (funds.holdings || []).find(h => h.ticker === s.ticker);
            const liveData = marketData[`${s.ticker}.SA`];
            const curPrice = liveData?.price || holding?.currentPrice || 0;
            const curVal = s.totalQuantity * curPrice;
            const pnl = curVal - s.totalInvestment;
            const roi = s.totalInvestment !== 0 ? (pnl / s.totalInvestment) * 100 : 0;
            return { ...s, currentPrice: curPrice, currentValue: curVal, pnl, roi, liveData };
        });
    };

    const fundHoldings = computeFundHoldings();
    const fundBrokers = [...new Set(fundHoldings.map(f => f.broker))];

    // Determine the "top currency" — the most common currency in the tab
    const currencyCounts = {};
    [...activeProperties, ...soldProperties].forEach(p => {
        currencyCounts[p.currency] = (currencyCounts[p.currency] || 0) + 1;
    });
    fundHoldings.forEach(() => {
        currencyCounts['BRL'] = (currencyCounts['BRL'] || 0) + 1;
    });
    const topCurrency = Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'BRL';

    // Convert any amount to the top currency
    const toTopCurr = (amount, fromCurrency) => {
        if (fromCurrency === topCurrency) return amount;
        // First convert to GBP, then from GBP to top currency
        let inGBP = amount;
        if (fromCurrency === 'BRL') inGBP = amount / BRL;
        else if (fromCurrency === 'USD') inGBP = amount / (rates?.USD || 1.28);
        // else already GBP
        if (topCurrency === 'GBP') return inGBP;
        if (topCurrency === 'BRL') return inGBP * BRL;
        if (topCurrency === 'USD') return inGBP * (rates?.USD || 1.28);
        return inGBP;
    };

    let totalValue = 0;
    let totalInvestment = 0;
    activeProperties.forEach(p => {
        const d = getPropertyDisplayData(p);
        totalValue += toTopCurr(p.mortgage ? d.equity : d.currentValue, p.currency);
        totalInvestment += toTopCurr(d.investment, p.currency);
    });
    fundHoldings.forEach(f => {
        totalValue += toTopCurr(f.currentValue, 'BRL');
        totalInvestment += toTopCurr(f.totalInvestment, 'BRL');
    });

    // Realised P&L from sold properties
    let realisedPnL = 0;
    let soldInvestment = 0;
    soldProperties.forEach(p => {
        const d = getPropertyDisplayData(p);
        realisedPnL += toTopCurr(d.profitLoss, p.currency);
        soldInvestment += toTopCurr(d.investment, p.currency);
    });

    // Total P&L includes unrealised (active) + realised (sold)
    const unrealisedPnL = totalValue - totalInvestment;
    const totalPnL = unrealisedPnL + realisedPnL;
    const totalROI = (totalInvestment + soldInvestment) !== 0 ? (totalPnL / (totalInvestment + soldInvestment)) * 100 : 0;

    // --- Handlers ---
    const toggleAccordion = (name) => setExpandedAccordions(prev => ({ ...prev, [name]: !prev[name] }));

    const handleDeleteEntry = (id) => {
        setDeleteTarget({ type: 'id', value: id });
        setIsDeleteModalOpen(true);
    };

    const handleEditTransaction = (tr) => {
        setEditingTransaction({ ...tr });
        setRightPaneMode('edit-transaction');
    };

    const handleSaveEditTransaction = async () => {
        if (!editingTransaction) return;
        try {
            if (editingTransaction.category === 'fund' || editingTransaction.ticker) {
                // Fund transaction edit
                await fetch('/api/real-estate', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        section: 'funds',
                        transaction: {
                            id: editingTransaction.id,
                            date: editingTransaction.date,
                            investment: parseFloat(editingTransaction.investment) || 0,
                            quantity: parseFloat(editingTransaction.quantity) || 0,
                            costPerShare: parseFloat(editingTransaction.costPerShare || editingTransaction.price) || 0,
                        }
                    })
                });
            } else {
                // Property ledger entry
                await fetch('/api/real-estate', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        section: 'property-transaction',
                        transaction: {
                            id: editingTransaction.id,
                            date: editingTransaction.date,
                            amount: parseFloat(editingTransaction.amount) || 0,
                            type: editingTransaction.type || editingTransaction.notes || ''
                        }
                    })
                });
            }
            setEditingTransaction(null);
            setRightPaneMode('default');
            onRefresh();
        } catch (e) { console.error('Edit failed:', e); }
    };

    const handleDeleteAirbnbMonth = (month) => {
        setDeleteTarget({ type: 'airbnb-month', value: month });
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            let url;
            if (deleteTarget.type === 'airbnb-month') {
                url = `/api/real-estate?section=airbnb&month=${deleteTarget.value}`;
            } else if (deleteTarget.type === 'property') {
                url = `/api/real-estate?section=property&name=${encodeURIComponent(deleteTarget.name)}`;
            } else {
                url = `/api/real-estate?id=${deleteTarget.value}`;
            }
            await fetch(url, { method: 'DELETE' });
            setSelectedAsset(null);
            setRightPaneMode('default');
            onRefresh();
        } catch (e) { console.error(e); }
        finally { setIsDeleteModalOpen(false); setDeleteTarget(null); }
    };

    const handleSavePropertyValues = async () => {
        if (!editingValues || isNaN(parseFloat(editingValues.currentValue)) || isNaN(parseFloat(editingValues.investment))) return;
        try {
            await fetch('/api/real-estate', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'updatePropertyValues',
                    id: editingValues.id,
                    name: editingValues.name,
                    currentValue: parseFloat(editingValues.currentValue),
                    investment: parseFloat(editingValues.investment),
                    oldInvestment: editingValues.oldInvestment
                })
            });
            setEditingValues(null);
            onRefresh();
        } catch (e) { console.error(e); }
    };

    const handleAddMortgagePayment = async () => {
        if (!mortgageFormData.month || !mortgageFormData.costs) return;
        try {
            const totalPayment = parseFloat(mortgageFormData.costs);
            const interestPaid = parseFloat(mortgageFormData.interest) || 0;
            const principalPaid = totalPayment - interestPaid;

            await fetch('/api/real-estate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    section: 'mortgages',
                    propertyName: selectedAsset?.name,
                    transaction: {
                        month: mortgageFormData.month,
                        costs: totalPayment,
                        principal: principalPaid > 0 ? principalPaid : 0,
                        notes: mortgageFormData.notes || 'Mortgage Payment'
                    }
                })
            });
            setMortgageFormData({ month: '', costs: '', interest: '', notes: '' });
            setRightPaneMode('default');
            onRefresh();
        } catch (e) { console.error(e); }
    };

    const handleSetupMortgage = async () => {
        if (!selectedAsset?.name) return;
        try {
            await fetch('/api/real-estate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    section: 'mortgage-setup',
                    propertyName: selectedAsset.name,
                    originalAmount: parseFloat(mortgageSetupData.originalAmount) || 0,
                    deposit: parseFloat(mortgageSetupData.deposit) || 0,
                    durationMonths: parseInt(mortgageSetupData.durationMonths) || 0,
                    interestRate: parseFloat(mortgageSetupData.interestRate) || 0
                })
            });
            setMortgageSetupData({ originalAmount: '', deposit: '', durationMonths: '', interestRate: '' });
            setRightPaneMode('default');
            onRefresh();
        } catch (e) { console.error(e); }
    };

    const handleAddRentalEntry = async () => {
        if (!rentalFormData.date || !rentalFormData.amount) return;
        try {
            const amount = parseFloat(rentalFormData.amount) || 0;
            if (amount <= 0) return;

            await fetch('/api/real-estate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    section: 'airbnb-entry',
                    propertyName: selectedAsset?.name,
                    date: rentalFormData.date,
                    type: rentalFormData.entryType,
                    amount,
                    notes: rentalFormData.notes || `Rental ${rentalFormData.entryType}`
                })
            });
            setRentalFormData({ date: rentalFormData.date, entryType: rentalFormData.entryType, amount: '', notes: '' });
            onRefresh();
        } catch (e) { console.error(e); }
    };

    // Fund handlers
    const handleFundBuyClick = (fundRow) => {
        const liveData = marketData[`${fundRow.ticker}.SA`];
        const livePrice = liveData?.price || fundRow.currentPrice || 0;
        setFundBuyData({
            fund: fundRow.fund, ticker: fundRow.ticker,
            qtyToBuy: '', buyPricePerShare: livePrice, totalInvestment: 0,
            date: new Date().toISOString().split('T')[0],
        });
        setIsFundBuyModalOpen(true);
    };

    const handleNewFundBuyClick = () => {
        setFundBuyData({
            fund: '', ticker: '', qtyToBuy: '', buyPricePerShare: '', totalInvestment: 0,
            date: new Date().toISOString().split('T')[0],
        });
        setIsFundBuyModalOpen(true);
    };

    const updateFundBuyCalc = (field, value) => {
        setFundBuyData(prev => {
            const u = { ...prev, [field]: value };
            u.totalInvestment = (parseFloat(u.qtyToBuy) || 0) * (parseFloat(u.buyPricePerShare) || 0);
            return u;
        });
    };

    const handleFundBuyConfirm = async () => {
        if (!fundBuyData?.fund) return;
        const qty = parseFloat(fundBuyData.qtyToBuy) || 0;
        const price = parseFloat(fundBuyData.buyPricePerShare) || 0;
        if (qty <= 0 || price <= 0) return;
        try {
            await fetch('/api/real-estate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section: 'funds', transaction: { date: fundBuyData.date, fund: fundBuyData.fund, investment: price * qty, quantity: qty, costPerShare: price } })
            });
            setIsFundBuyModalOpen(false); setFundBuyData(null); onRefresh();
        } catch (e) { console.error(e); }
    };

    const handleFundSellClick = (fundRow) => {
        const liveData = marketData[`${fundRow.ticker}.SA`];
        const livePrice = liveData?.price || fundRow.currentPrice || 0;
        const avgCost = fundRow.totalQuantity > 0 ? fundRow.totalInvestment / fundRow.totalQuantity : 0;
        const proceeds = livePrice * fundRow.totalQuantity;
        const pnl = proceeds - fundRow.totalInvestment;
        setFundSellData({
            fund: fundRow.fund, ticker: fundRow.ticker, sharesHeld: fundRow.totalQuantity,
            avgCost, qtyToSell: fundRow.totalQuantity, sellPricePerShare: livePrice,
            totalProceeds: proceeds, pnl, roi: fundRow.totalInvestment ? (pnl / fundRow.totalInvestment * 100) : 0,
            date: new Date().toISOString().split('T')[0],
        });
        setIsFundSellModalOpen(true);
    };

    const updateFundSellCalc = (field, value) => {
        setFundSellData(prev => {
            const u = { ...prev, [field]: value };
            const qty = parseFloat(u.qtyToSell) || 0;
            const price = parseFloat(u.sellPricePerShare) || 0;
            u.totalProceeds = price * qty;
            const costBasis = prev.avgCost * qty;
            u.pnl = u.totalProceeds - costBasis;
            u.roi = costBasis ? (u.pnl / costBasis * 100) : 0;
            return u;
        });
    };

    const handleFundSellConfirm = async () => {
        if (!fundSellData) return;
        const qty = parseFloat(fundSellData.qtyToSell) || 0;
        const price = parseFloat(fundSellData.sellPricePerShare) || 0;
        if (qty <= 0 || price <= 0) return;
        try {
            await fetch('/api/real-estate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section: 'funds', transaction: { date: fundSellData.date, fund: fundSellData.fund, investment: -(price * qty), quantity: -qty, costPerShare: price } })
            });
            setIsFundSellModalOpen(false); setFundSellData(null); onRefresh();
        } catch (e) { console.error(e); }
    };

    const handleAirbnbSort = (key) => {
        setAirbnbSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    // --- Consolidated Hero ---
    // Build summary cards for Properties + each fund broker
    const buildSummaryCards = () => {
        const cards = [];
        // Properties card - convert all to BRL for display
        const toBRL = (amount, currency) => {
            if (currency === 'BRL') return amount;
            if (currency === 'GBP') return amount * BRL;
            if (currency === 'USD') return amount * (rates?.USD || 1.28) * BRL / (rates?.USD || 1.28);
            return amount;
        };
        let propVal = 0, propCost = 0;
        activeProperties.forEach(p => {
            const d = getPropertyDisplayData(p);
            propVal += toBRL(p.mortgage ? d.equity : d.currentValue, p.currency);
            propCost += toBRL(d.investment, p.currency);
        });
        let propRealisedPnL = 0;
        soldProperties.forEach(p => {
            propRealisedPnL += toBRL(getPropertyDisplayData(p).profitLoss, p.currency);
        });
        const propPnL = propVal - propCost + propRealisedPnL;
        const propROI = propCost !== 0 ? (propPnL / propCost * 100) : 0;
        cards.push({ name: 'Properties', currentValue: propVal, purchasePrice: propCost, pnl: propPnL, roi: propROI, currency: 'BRL' });

        // Fund broker cards
        fundBrokers.forEach(b => {
            const brokerFunds = fundHoldings.filter(f => f.broker === b);
            let fVal = 0, fCost = 0;
            brokerFunds.forEach(f => { fVal += f.currentValue; fCost += f.totalInvestment; });
            const fPnL = fVal - fCost;
            const fROI = fCost !== 0 ? (fPnL / fCost * 100) : 0;
            cards.push({ name: b, currentValue: fVal, purchasePrice: fCost, pnl: fPnL, roi: fROI, currency: 'BRL' });
        });
        return cards;
    };

    const renderConsolidated = () => {
        const summaryCards = buildSummaryCards();
        return (
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '48px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                {/* Hero Total */}
                <div style={{
                    padding: '24px',
                    background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(255,255,255,0) 100%)',
                    borderBottom: '1px solid var(--glass-border)',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--fg-secondary)', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>🏢 Real Estate Portfolio</div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>{formatCurrency(totalValue, topCurrency)}</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--fg-secondary)' }}>Invested: {formatCurrency(totalInvestment, topCurrency)}</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: totalPnL >= 0 ? 'var(--vu-green)' : 'var(--error)' }}>
                            {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL, topCurrency)} ({totalROI >= 0 ? '+' : ''}{totalROI.toFixed(1)}%)
                        </span>
                        {realisedPnL !== 0 && (
                            <span style={{ fontSize: '0.85rem', color: 'var(--fg-secondary)' }}>
                                Realised: <span style={{ color: realisedPnL >= 0 ? 'var(--vu-green)' : 'var(--error)', fontWeight: 600 }}>
                                    {realisedPnL >= 0 ? '+' : ''}{formatCurrency(realisedPnL, topCurrency)}
                                </span>
                            </span>
                        )}
                    </div>
                </div>

                {/* Summary Cards */}
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    {summaryCards.filter(s => s.currentValue > 0.01 || s.purchasePrice > 0.01).map(s => (
                        <div
                            key={s.name}
                            onClick={() => {
                                const el = document.getElementById(encodeURIComponent(s.name));
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className="cursor-pointer hover:bg-white/5 transition-colors"
                            style={{
                                padding: '16px', borderRadius: '16px',
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                position: 'relative', overflow: 'hidden'
                            }}
                        >
                            <div style={{
                                position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px',
                                background: s.pnl >= 0 ? '#10b981' : '#ef4444',
                                borderRadius: '3px 0 0 3px'
                            }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff', marginBottom: '4px' }}>{s.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--fg-secondary)' }}>Cost: {formatCurrency(s.purchasePrice, s.currency)}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>{formatCurrency(s.currentValue, s.currency)}</div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: s.pnl >= 0 ? 'var(--vu-green)' : 'var(--error)', marginTop: '2px' }}>
                                        {s.pnl >= 0 ? '+' : ''}{formatCurrency(s.pnl, s.currency)} ({s.roi >= 0 ? '+' : ''}{s.roi.toFixed(1)}%)
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // --- Properties Accordion ---
    const renderPropertiesAccordion = () => {
        const allProps = [...activeProperties, ...soldProperties];
        // Convert to BRL for consistent accordion totals
        const propToBRL = (amount, currency) => {
            if (currency === 'BRL') return amount;
            if (currency === 'GBP') return amount * BRL;
            return amount;
        };
        let totalVal = 0, totalCost = 0;
        allProps.forEach(p => {
            const d = getPropertyDisplayData(p);
            if (p.status !== 'Sold') {
                totalVal += propToBRL(p.mortgage ? d.equity : d.currentValue, p.currency);
                totalCost += propToBRL(d.investment, p.currency);
            }
        });
        const totalRealisedPnL = soldProperties.reduce((s, p) => s + propToBRL(getPropertyDisplayData(p).profitLoss, p.currency), 0);
        const totalPnL = totalVal - totalCost + totalRealisedPnL;
        const isOpen = expandedAccordions['Properties'];
        const currency = 'BRL';

        return (
            <div className="mb-4">
                <div
                    onClick={() => toggleAccordion('Properties')}
                    className="flex justify-between items-center mb-4 px-4 py-3 cursor-pointer bg-white/5 hover:bg-white/10 rounded-2xl transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <span className="text-white/40 transform transition-transform duration-300 text-xs" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                        <div className="flex flex-col">
                            <h3 className="text-lg font-semibold text-white/90 m-0">Properties</h3>
                            <span className={`text-xs font-semibold mt-0.5 ${totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL, currency)}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                            <span className="text-xl font-bold text-white tracking-tight">{formatCurrency(totalVal, currency)}</span>
                            <span className="text-xs text-white/40 mt-0.5">Cost: {formatCurrency(totalCost, currency)}</span>
                        </div>
                    </div>
                </div>

                {isOpen && (
                    <>
                        {/* Mobile */}
                        <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {activeProperties.map(prop => {
                                const d = getPropertyDisplayData(prop);
                                const displayVal = prop.mortgage ? d.equity : d.currentValue;
                                return (
                                    <AssetCard
                                        key={prop.id}
                                        title={prop.name}
                                        subtitle={prop.currency}
                                        value={formatCurrency(displayVal, prop.currency)}
                                        performance={`${d.profitLoss >= 0 ? '+' : ''}${formatCurrency(d.profitLoss, prop.currency)} (${d.roi.toFixed(1)}%)`}
                                        isPositive={d.profitLoss >= 0}
                                        icon="🏢"
                                        expandedContent={
                                            <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                                                <button onClick={(e) => { e.stopPropagation(); setSelectedAsset({ ...prop, type: 'property', displayData: d }); setContextTab('overview'); }}
                                                    className="flex-1 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-semibold transition-colors">
                                                    View Details
                                                </button>
                                            </div>
                                        }
                                    />
                                );
                            })}
                            {soldProperties.length > 0 && (
                                <div className="col-span-full bg-white/5 rounded-3xl p-4 border border-white/10">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs text-white/40 font-medium tracking-wide uppercase block">Realised P&L</span>
                                        <span className={`text-sm font-bold ${totalRealisedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {totalRealisedPnL >= 0 ? '+' : ''}{formatCurrency(totalRealisedPnL, currency)}
                                        </span>
                                    </div>
                                    {soldProperties.map(prop => {
                                        const d = getPropertyDisplayData(prop);
                                        return (
                                            <div key={prop.id} className="flex justify-between items-center py-2">
                                                <span className="text-sm text-white/70">{prop.name}</span>
                                                <span className={`text-sm font-bold ${d.profitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {d.profitLoss >= 0 ? '+' : ''}{formatCurrency(d.profitLoss, prop.currency)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Desktop - Trading 212 style */}
                        <div className="hidden lg:block">
                            <div className="overflow-hidden rounded-xl border border-white/5 bg-black/40 backdrop-blur-sm shadow-xl divide-y divide-white/[0.04]">
                                {activeProperties.sort((a, b) => {
                                    const aVal = getPropertyDisplayData(a);
                                    const bVal = getPropertyDisplayData(b);
                                    return (b.mortgage ? bVal.equity : bVal.currentValue) - (a.mortgage ? aVal.equity : aVal.currentValue);
                                }).map(prop => {
                                    const d = getPropertyDisplayData(prop);
                                    const displayVal = prop.mortgage ? d.equity : d.currentValue;
                                    const isSelected = selectedAsset?.id === prop.id;
                                    return (
                                        <div
                                            key={prop.id}
                                            onClick={() => { setSelectedAsset({ ...prop, type: 'property', displayData: d }); setContextTab('overview'); setRightPaneMode('default'); }}
                                            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 group ${isSelected ? 'bg-white/[0.08] border-l-2 border-l-[#D4AF37]' : 'hover:bg-white/[0.04] border-l-2 border-l-transparent'}`}
                                        >
                                            <div className="w-9 h-9 min-w-[36px] rounded-full bg-emerald-500/20 flex items-center justify-center text-lg shrink-0">🏢</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-white/90 truncate leading-tight">{prop.name}</p>
                                                <p className="text-[11px] text-white/40 mt-0.5 font-mono">
                                                    {prop.currency} · <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${prop.status === 'Sold' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-emerald-500/20 text-emerald-400'}`}>{prop.status}</span>
                                                    {prop.mortgage && ' · Mortgage'}
                                                    {prop.rental && ' · Rental'}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-bold text-white tracking-tight leading-tight">{formatCurrency(displayVal, prop.currency)}</p>
                                                <p className={`text-[11px] mt-0.5 font-semibold ${d.profitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {d.profitLoss >= 0 ? '+' : ''}{formatCurrency(d.profitLoss, prop.currency)} ({d.roi >= 0 ? '+' : ''}{d.roi.toFixed(1)}%)
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {soldProperties.length > 0 && (
                                <div className="mt-4 bg-white/5 rounded-2xl p-4 border border-white/10">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs text-white/40 font-medium tracking-wide uppercase block">Realised P&L</span>
                                        <span className={`text-sm font-bold ${totalRealisedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {totalRealisedPnL >= 0 ? '+' : ''}{formatCurrency(totalRealisedPnL, currency)}
                                        </span>
                                    </div>
                                    <div className="overflow-hidden rounded-xl border border-white/5 bg-black/40 divide-y divide-white/[0.04]">
                                        {soldProperties.map(prop => {
                                            const d = getPropertyDisplayData(prop);
                                            const isSelected = selectedAsset?.id === prop.id;
                                            return (
                                                <div
                                                    key={prop.id}
                                                    onClick={() => { setSelectedAsset({ ...prop, type: 'property', displayData: d }); setContextTab('overview'); setRightPaneMode('default'); }}
                                                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 ${isSelected ? 'bg-white/[0.08] border-l-2 border-l-[#D4AF37]' : 'hover:bg-white/[0.04] border-l-2 border-l-transparent'}`}
                                                >
                                                    <div className="w-9 h-9 min-w-[36px] rounded-full bg-yellow-500/20 flex items-center justify-center text-lg shrink-0">🏠</div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-white/90 truncate">{prop.name}</p>
                                                        <p className="text-[11px] text-white/40 mt-0.5"><span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold bg-yellow-500/20 text-yellow-500">Sold</span></p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <span className={`text-sm font-bold ${d.profitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                            {d.profitLoss >= 0 ? '+' : ''}{formatCurrency(d.profitLoss, prop.currency)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    };

    // --- Fund Broker Accordion ---
    const renderFundBrokerAccordion = (brokerName) => {
        const brokerFunds = fundHoldings.filter(f => f.broker === brokerName).sort((a, b) => b.currentValue - a.currentValue);
        let totalVal = 0, totalCost = 0;
        brokerFunds.forEach(f => { totalVal += f.currentValue; totalCost += f.totalInvestment; });
        const bPnL = totalVal - totalCost;
        const bROI = totalCost !== 0 ? (bPnL / totalCost * 100) : 0;
        const isOpen = expandedAccordions[brokerName];

        return (
            <div key={brokerName} className="mb-4">
                <div onClick={() => toggleAccordion(brokerName)}
                    className="flex justify-between items-center mb-4 px-4 py-3 cursor-pointer bg-white/5 hover:bg-white/10 rounded-2xl transition-colors">
                    <div className="flex items-center gap-3">
                        <span className="text-white/40 transform transition-transform duration-300 text-xs" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                        <div className="flex flex-col">
                            <h3 className="text-lg font-semibold text-white/90 m-0">{brokerName}</h3>
                            <span className={`text-xs font-semibold mt-0.5 ${bPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {bPnL >= 0 ? '+' : ''}{formatCurrency(bPnL, 'BRL')} ({bROI >= 0 ? '+' : ''}{bROI.toFixed(1)}%)
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                            <span className="text-xl font-bold text-white tracking-tight">{formatCurrency(totalVal, 'BRL')}</span>
                            <span className="text-xs text-white/40 mt-0.5">Cost: {formatCurrency(totalCost, 'BRL')}</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleNewFundBuyClick(); }}
                            className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex items-center justify-center text-lg font-bold transition-colors shrink-0">+</button>
                    </div>
                </div>

                {isOpen && (
                    <>
                        <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {brokerFunds.map(f => (
                                <AssetCard key={f.ticker} title={f.fund}
                                    subtitle={`${f.totalQuantity} shares · ${formatCurrency(f.currentPrice, 'BRL')}/share`}
                                    value={formatCurrency(f.currentValue, 'BRL')}
                                    performance={`${f.pnl >= 0 ? '+' : ''}${formatCurrency(f.pnl, 'BRL')} (${f.roi.toFixed(1)}%)`}
                                    isPositive={f.pnl >= 0}
                                    icon={<div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">{f.ticker.slice(0, 2)}</div>}
                                    expandedContent={
                                        <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                                            <button onClick={(e) => { e.stopPropagation(); handleFundBuyClick(f); }} className="flex-1 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-semibold transition-colors">Buy</button>
                                            <button onClick={(e) => { e.stopPropagation(); handleFundSellClick(f); }} className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-sm font-semibold transition-colors">Sell</button>
                                        </div>
                                    }
                                />
                            ))}
                        </div>
                        <div className="hidden lg:block">
                            <div className="overflow-hidden rounded-xl border border-white/5 bg-black/40 backdrop-blur-sm shadow-xl divide-y divide-white/[0.04]">
                                {brokerFunds.map(f => {
                                    const isSelected = selectedAsset?.ticker === f.ticker && selectedAsset?.type === 'fund';
                                    return (
                                        <div key={f.ticker} onClick={() => { setSelectedAsset({ ...f, type: 'fund' }); setRightPaneMode('default'); }}
                                            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 group ${isSelected ? 'bg-white/[0.08] border-l-2 border-l-[#D4AF37]' : 'hover:bg-white/[0.04] border-l-2 border-l-transparent'}`}>
                                            <div className="w-9 h-9 min-w-[36px] rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0">{f.ticker.slice(0, 2)}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-white/90 truncate leading-tight">{f.fund}</p>
                                                <p className="text-[11px] text-white/40 mt-0.5 font-mono">{f.totalQuantity} shares · {f.ticker}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-bold text-white tracking-tight leading-tight">{formatCurrency(f.currentValue, 'BRL')}</p>
                                                <p className={`text-[11px] mt-0.5 font-semibold ${f.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {f.pnl >= 0 ? '+' : ''}{formatCurrency(f.pnl, 'BRL')} ({f.roi >= 0 ? '+' : ''}{f.roi.toFixed(1)}%)
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    };

    // --- Tab Bar for Property ContextPane ---
    const renderTabBar = (asset) => {
        // Data-driven: tabs are active if actual data exists, OR user manually enabled them this session
        const hasMortgageData = !!(asset.mortgage && (asset.mortgage.originalAmount > 0 || (asset.mortgage.ledger && asset.mortgage.ledger.length > 0)));
        const hasRentalData = !!(asset.rental && asset.rental.ledger && asset.rental.ledger.length > 0);
        const hasMortgage = hasMortgageData || enabledTabs[`${asset.id}-mortgage`];
        const hasRental = hasRentalData || enabledTabs[`${asset.id}-rental`];

        const allTabs = [
            { key: 'overview', label: 'Overview', icon: '📊', enabled: true, hasData: true },
            { key: 'mortgage', label: 'Mortgage', icon: '🏦', enabled: hasMortgage, hasData: hasMortgageData },
            { key: 'rental', label: 'Rental', icon: '🏠', enabled: hasRental, hasData: hasRentalData },
        ];

        const handleTabClick = (tab) => {
            if (!tab.enabled) {
                // Enable the tab and switch to it — will show setup card
                toggleEnabledTab(asset.id, tab.key);
                setContextTab(tab.key);
            } else {
                setContextTab(tab.key);
            }
        };

        return (
            <div style={{
                display: 'flex',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '14px',
                padding: '3px',
                marginBottom: '16px',
                border: '1px solid rgba(255,255,255,0.06)',
            }}>
                {allTabs.map(t => {
                    const isActive = contextTab === t.key;
                    return (
                        <button
                            key={t.key}
                            onClick={() => handleTabClick(t)}
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                padding: '8px 4px',
                                borderRadius: '11px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                letterSpacing: '0.03em',
                                textTransform: 'uppercase',
                                transition: 'all 0.2s ease',
                                position: 'relative',
                                background: isActive
                                    ? t.hasData
                                        ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08))'
                                        : 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.08))'
                                    : 'transparent',
                                color: isActive
                                    ? t.hasData ? '#34d399' : '#D4AF37'
                                    : t.hasData
                                        ? 'rgba(255,255,255,0.55)'
                                        : t.enabled
                                            ? 'rgba(255,255,255,0.35)'
                                            : 'rgba(255,255,255,0.2)',
                                boxShadow: isActive
                                    ? t.hasData
                                        ? '0 1px 8px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.05)'
                                        : '0 1px 8px rgba(212,175,55,0.1), inset 0 1px 0 rgba(255,255,255,0.05)'
                                    : 'none',
                                opacity: !t.enabled ? 0.5 : 1,
                            }}
                        >
                            <span style={{ fontSize: '0.85rem', lineHeight: 1, filter: !t.enabled ? 'grayscale(1)' : 'none' }}>{t.icon}</span>
                            <span>{t.label}</span>
                            {!t.enabled && (
                                <span style={{
                                    fontSize: '0.65rem',
                                    opacity: 0.5,
                                    marginLeft: '-2px',
                                }}>+</span>
                            )}
                            {t.hasData && !isActive && (
                                <span style={{
                                    width: '4px',
                                    height: '4px',
                                    borderRadius: '50%',
                                    background: t.key === 'mortgage' ? '#D4AF37' : '#10b981',
                                    position: 'absolute',
                                    top: '6px',
                                    right: '8px',
                                }} />
                            )}
                        </button>
                    );
                })}
            </div>
        );
    };

    // --- Overview Tab ---
    const renderOverviewTab = (asset) => {
        const d = asset.displayData || getPropertyDisplayData(asset);
        const isSold = asset.status === 'Sold';
        return (
            <>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                        <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5">{isSold ? 'Sale Price' : (asset.mortgage ? 'Property Value' : 'Current Value')}</span>
                        <span className="text-sm font-medium text-white/90 font-mono">{formatCurrency(isSold ? (asset.salePrice || 0) : d.currentValue, asset.currency)}</span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                        <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5">Investment</span>
                        <span className="text-sm font-medium text-white/90 font-mono">{formatCurrency(d.investment, asset.currency)}</span>
                    </div>
                    {d.taxes > 0 && (
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                            <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5">Taxes & Fees</span>
                            <span className="text-sm font-medium text-white/90 font-mono">{formatCurrency(d.taxes, asset.currency)}</span>
                        </div>
                    )}
                    {asset.mortgage && (
                        <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl p-3">
                            <span className="block text-[10px] text-[#D4AF37]/60 uppercase tracking-widest mb-1.5">Equity</span>
                            <span className="text-sm font-bold text-[#D4AF37] font-mono">{formatCurrency(d.equity, asset.currency)}</span>
                        </div>
                    )}
                    <div className="col-span-2 bg-white/[0.02] border border-white/5 rounded-xl p-3 flex justify-between items-center">
                        <span className="text-[10px] text-white/40 uppercase tracking-widest">{isSold ? 'Realised P&L' : 'Total P&L'}</span>
                        <span className={`text-sm font-bold font-mono ${d.profitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {d.profitLoss >= 0 ? '+' : ''}{formatCurrency(d.profitLoss, asset.currency)} ({d.roi >= 0 ? '+' : ''}{d.roi.toFixed(1)}%)
                        </span>
                    </div>
                </div>

                {/* Update Values */}
                {!isSold && (
                    <div className="pt-4 border-t border-white/5 mt-4">
                        {editingValues && editingValues.id === asset.id ? (
                            <div className="flex flex-col gap-3 p-3 bg-black/20 rounded-xl border border-white/10">
                                <h4 className="text-xs uppercase tracking-wider text-white/40 mb-1">Edit Values</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5">Investment</label>
                                        <NumberInput value={editingValues.investment} onChange={(val) => setEditingValues(p => ({ ...p, investment: val }))}
                                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50" placeholder="Investment" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5">Current Value</label>
                                        <NumberInput value={editingValues.currentValue} onChange={(val) => setEditingValues(p => ({ ...p, currentValue: val }))}
                                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50" placeholder="Valuation" />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleSavePropertyValues} className="flex-1 px-3 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-semibold hover:bg-emerald-500/30">Save Settings</button>
                                    <button onClick={() => setEditingValues(null)} className="flex-1 px-3 py-2 bg-rose-500/20 text-rose-400 rounded-xl text-sm font-semibold hover:bg-rose-500/30">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => setEditingValues({ id: asset.id, name: asset.name, currentValue: d.currentValue, investment: d.investment, oldInvestment: d.investment })}
                                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-sm font-semibold transition-colors border border-transparent hover:border-white/10">Edit Property Values</button>
                        )}
                    </div>
                )}

                {/* Property Transactions */}
                {asset.ledger && asset.ledger.length > 0 && (
                    <div className="pt-4 border-t border-white/5 mt-4">
                        <h4 className="text-[10px] text-white/40 uppercase tracking-[2px] mb-3">Property Transactions</h4>
                        <div className="bg-black/20 rounded-xl p-4 border border-white/[0.03]">
                            <TransactionTimeline transactions={asset.ledger.slice(0, 10)}
                                onDelete={handleDeleteEntry}
                                renderItem={(tx) => (
                                    <>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${tx.amount >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                            <span className="font-medium text-[10px] text-white/90 uppercase tracking-wider font-space">
                                                {tx.type || tx.notes || 'Transaction'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-bold text-white tracking-tight font-mono">
                                                {formatCurrency(Math.abs(tx.amount), asset.currency)}
                                            </span>
                                            <span className="text-[10px] text-white/40 font-mono tracking-tight">
                                                {tx.date}
                                            </span>
                                        </div>
                                    </>
                                )} />
                        </div>
                    </div>
                )}

                {/* Property Actions */}
                {!isSold && (
                    <div className="pt-4 border-t border-white/5 mt-4">
                        <h4 className="text-[10px] text-white/40 uppercase tracking-[2px] mb-3">Property Actions</h4>
                        {sellPropertyData && sellPropertyData.name === asset.name ? (
                            <div className="mt-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                                <h5 className="text-sm font-bold text-amber-400 mb-4 flex items-center gap-2">
                                    <span>💰</span> Sell {asset.name}
                                </h5>
                                <div className="flex flex-col gap-3">
                                    <div>
                                        <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-1.5">Sale Date</label>
                                        <input type="date" value={sellPropertyData.date}
                                            onChange={e => setSellPropertyData(p => ({ ...p, date: e.target.value }))}
                                            className="w-full p-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-amber-500/50 transition-all font-space text-sm" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-1.5">Sale Price</label>
                                            <NumberInput value={sellPropertyData.salePrice}
                                                onChange={val => setSellPropertyData(p => ({ ...p, salePrice: val }))}
                                                className="w-full p-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-amber-500/50 transition-all font-space text-sm" placeholder="0" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-1.5">Taxes & Fees</label>
                                            <NumberInput value={sellPropertyData.taxes}
                                                onChange={val => setSellPropertyData(p => ({ ...p, taxes: val }))}
                                                className="w-full p-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-amber-500/50 transition-all font-space text-sm" placeholder="0" />
                                        </div>
                                    </div>
                                    {/* Profit Preview */}
                                    {(() => {
                                        const sp = parseFloat(sellPropertyData.salePrice) || 0;
                                        const tx = parseFloat(sellPropertyData.taxes) || 0;
                                        const inv = d.investment;
                                        const profit = sp - inv - tx;
                                        const totalCost = inv + tx;
                                        const roiCalc = totalCost > 0 ? (profit / totalCost) * 100 : 0;
                                        if (sp <= 0) return null;
                                        return (
                                            <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] text-white/40 uppercase tracking-widest">Est. Profit</span>
                                                    <span className={`text-sm font-bold font-mono ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {profit >= 0 ? '+' : ''}{formatCurrency(profit, asset.currency)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] text-white/40 uppercase tracking-widest">ROI</span>
                                                    <span className={`text-sm font-bold font-mono ${roiCalc >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {roiCalc >= 0 ? '+' : ''}{roiCalc.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    <div className="flex gap-2 mt-1">
                                        <button onClick={() => setSellPropertyData(null)}
                                            className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 font-semibold text-sm hover:bg-white/5 transition-colors">Cancel</button>
                                        <button onClick={async () => {
                                            const sp = parseFloat(sellPropertyData.salePrice) || 0;
                                            if (sp <= 0) return;
                                            try {
                                                await fetch('/api/real-estate', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        section: 'sell-property',
                                                        name: asset.name,
                                                        salePrice: sp,
                                                        taxes: parseFloat(sellPropertyData.taxes) || 0,
                                                        date: sellPropertyData.date
                                                    })
                                                });
                                                setSellPropertyData(null);
                                                setSelectedAsset(null);
                                                if (onRefresh) onRefresh();
                                            } catch (e) { console.error('Failed to sell property:', e); }
                                        }}
                                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold text-sm hover:brightness-110 transition-all">Confirm Sale</button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => setSellPropertyData({
                                name: asset.name,
                                salePrice: '',
                                taxes: '',
                                date: new Date().toISOString().split('T')[0]
                            })}
                                className="w-full mt-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl text-sm font-semibold transition-colors border border-amber-500/20">
                                Sell Property
                            </button>
                        )}

                        <button onClick={() => {
                            setDeleteTarget({ type: 'property', id: asset.id, name: asset.name });
                            setIsDeleteModalOpen(true);
                        }}
                            className="w-full mt-3 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-sm font-semibold transition-colors border border-rose-500/20">
                            Delete Property
                        </button>
                    </div>
                )}
            </>
        );
    };

    // --- Mortgage Tab ---
    const renderMortgageTab = (asset) => {
        const m = asset.mortgage;

        // Empty state: no mortgage data exists — show setup card
        if (!m) {
            return (
                <div className="flex flex-col items-center text-center py-6">
                    <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mb-4 ring-1 ring-[#D4AF37]/20">
                        <span className="text-2xl">🏦</span>
                    </div>
                    <h4 className="text-base font-bold text-white mb-1">Set Up Mortgage</h4>
                    <p className="text-xs text-white/40 mb-5 max-w-[220px]">Configure your mortgage details to start tracking payments, principal, and interest.</p>
                    <div className="w-full p-4 bg-black/20 rounded-xl border border-white/5">
                        <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1 text-white/50 text-xs">Mortgage Amount</label>
                                    <NumberInput value={mortgageSetupData.originalAmount} onChange={val => setMortgageSetupData(p => ({ ...p, originalAmount: val }))}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50" placeholder="e.g. 300000" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-white/50 text-xs">Deposit Paid</label>
                                    <NumberInput value={mortgageSetupData.deposit} onChange={val => setMortgageSetupData(p => ({ ...p, deposit: val }))}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50" placeholder="e.g. 50000" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1 text-white/50 text-xs">Duration (months)</label>
                                    <NumberInput value={mortgageSetupData.durationMonths} onChange={val => setMortgageSetupData(p => ({ ...p, durationMonths: val }))}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50" placeholder="e.g. 360" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-white/50 text-xs">Interest Rate (%)</label>
                                    <NumberInput value={mortgageSetupData.interestRate} onChange={val => setMortgageSetupData(p => ({ ...p, interestRate: val }))}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50" placeholder="e.g. 4.5" />
                                </div>
                            </div>
                            <button onClick={handleSetupMortgage}
                                className="w-full py-2.5 rounded-xl text-sm font-semibold text-[#1A0F2E] mt-1" style={{ background: 'linear-gradient(135deg, #CC5500 0%, #D4AF37 100%)' }}>Set Up Mortgage</button>
                        </div>
                    </div>
                </div>
            );
        }

        const mortgagePayments = m.ledger.filter(l => l.source === 'Mortgage');

        return (
            <>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                        <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5">Original Amount</span>
                        <span className="text-sm font-medium text-white/90 font-mono">{formatCurrency(m.originalAmount, asset.currency)}</span>
                    </div>
                    <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3">
                        <span className="block text-[10px] text-rose-400/60 uppercase tracking-widest mb-1.5">Balance</span>
                        <span className="text-sm font-bold text-rose-400 font-mono">{formatCurrency(m.balance, asset.currency)}</span>
                    </div>
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                        <span className="block text-[10px] text-emerald-400/60 uppercase tracking-widest mb-1.5">Principal Paid</span>
                        <span className="text-sm font-bold text-emerald-400 font-mono">{formatCurrency(m.totalPrincipalPaid, asset.currency)}</span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                        <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5">Interest Paid</span>
                        <span className="text-sm font-medium text-white/90 font-mono">{formatCurrency(m.totalInterestPaid, asset.currency)}</span>
                    </div>
                </div>
                {rightPaneMode !== 'add-mortgage-payment' ? (
                    <button onClick={() => setRightPaneMode('add-mortgage-payment')}
                        className="w-full mt-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-sm font-semibold transition-colors">+ Add Payment</button>
                ) : (
                    <div className="mt-4 p-4 bg-black/20 rounded-xl border border-white/5">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-sm font-bold text-white">Add Mortgage Payment</h4>
                            <button onClick={() => setRightPaneMode('default')} className="p-1 hover:bg-white/10 rounded-full text-white/50"><X size={14} /></button>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div>
                                <label className="block mb-1 text-white/50 text-xs">Month</label>
                                <input type="text" value={mortgageFormData.month} onChange={e => setMortgageFormData(p => ({ ...p, month: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50" placeholder="Mar-26" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1 text-white/50 text-xs">Total Payment</label>
                                    <NumberInput value={mortgageFormData.costs} onChange={val => setMortgageFormData(p => ({ ...p, costs: val }))}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50" placeholder="e.g. 1500" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-white/50 text-xs">Interest Paid</label>
                                    <NumberInput value={mortgageFormData.interest} onChange={val => setMortgageFormData(p => ({ ...p, interest: val }))}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50" placeholder="e.g. 500" />
                                </div>
                            </div>
                            {/* Auto-calculated Principal Preview */}
                            {mortgageFormData.costs && (
                                <div className="text-right text-xs text-white/60 -mt-1">
                                    Principal (auto): <span className="font-bold text-[#D4AF37]">
                                        {formatCurrency(parseFloat(mortgageFormData.costs) - (parseFloat(mortgageFormData.interest) || 0), asset.currency)}
                                    </span>
                                </div>
                            )}
                            <button onClick={handleAddMortgagePayment}
                                className="w-full py-2.5 rounded-xl text-sm font-semibold text-[#1A0F2E]" style={{ background: 'linear-gradient(135deg, #CC5500 0%, #D4AF37 100%)' }}>Confirm Payment</button>
                        </div>
                    </div>
                )}
                <div className="pt-4 border-t border-white/5 mt-4">
                    <h4 className="text-[10px] text-white/40 uppercase tracking-[2px] mb-3">Payment History</h4>
                    <div className="bg-black/20 rounded-xl p-4 border border-white/[0.03] max-h-[300px] overflow-y-auto custom-scrollbar">
                        <TransactionTimeline transactions={mortgagePayments.slice(0, 20)}
                            renderItem={(tx) => (
                                <>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                        <span className="font-medium text-[10px] text-white/90 uppercase tracking-wider font-space">
                                            {tx.month}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm font-bold text-white tracking-tight font-mono">
                                            {formatCurrency(tx.costs, asset.currency)}
                                        </span>
                                        <span className="text-[10px] text-white/40 font-mono tracking-tight">
                                            Principal: {formatCurrency(tx.principal, asset.currency)}
                                        </span>
                                    </div>
                                </>
                            )} />
                    </div>
                </div>
            </>
        );
    };

    // --- Rental Tab ---
    const renderRentalTab = (asset) => {
        const r = asset.rental;

        // Empty state: no rental data — show add-first-entry card
        if (!r) {
            return (
                <div className="flex flex-col items-center text-center py-6">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 ring-1 ring-emerald-500/20">
                        <span className="text-2xl">🏠</span>
                    </div>
                    <h4 className="text-base font-bold text-white mb-1">Track Rental Income</h4>
                    <p className="text-xs text-white/40 mb-5 max-w-[220px]">Add revenue and cost entries on specific dates. They’ll aggregate by month automatically.</p>
                    <div className="w-full p-4 bg-black/20 rounded-xl border border-white/5">
                        <h4 className="text-sm font-bold text-white mb-3">Add Entry</h4>
                        <div className="flex flex-col gap-3">
                            <div className="flex gap-2">
                                {['Revenue', 'Cost'].map(t => (
                                    <button key={t} onClick={() => setRentalFormData(p => ({ ...p, entryType: t }))}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${rentalFormData.entryType === t
                                            ? t === 'Revenue' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                            : 'bg-white/5 border-white/10 text-white/40'
                                            }`}>{t === 'Revenue' ? '▲ Revenue' : '▼ Cost'}</button>
                                ))}
                            </div>
                            <div>
                                <label className="block mb-1 text-white/50 text-xs">Date</label>
                                <input type="date" value={rentalFormData.date} onChange={e => setRentalFormData(p => ({ ...p, date: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50" />
                            </div>
                            <div>
                                <label className="block mb-1 text-white/50 text-xs">Amount</label>
                                <NumberInput value={rentalFormData.amount} onChange={val => setRentalFormData(p => ({ ...p, amount: val }))}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50" placeholder="0" />
                            </div>
                            <div>
                                <label className="block mb-1 text-white/50 text-xs">Notes (optional)</label>
                                <input type="text" value={rentalFormData.notes} onChange={e => setRentalFormData(p => ({ ...p, notes: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50" placeholder="e.g. Cleaning fee" />
                            </div>
                            <button onClick={handleAddRentalEntry}
                                className="w-full py-2.5 rounded-xl text-sm font-semibold text-[#1A0F2E]" style={{ background: 'linear-gradient(135deg, #CC5500 0%, #D4AF37 100%)' }}>+ Add Entry</button>
                        </div>
                    </div>
                </div>
            );
        }

        const roi = asset.investment > 0 ? (r.totalProfit / asset.investment) * 100 : 0;
        const sortedLedger = [...(r.ledger || [])].sort((a, b) => {
            let valA, valB;
            switch (airbnbSortConfig.key) {
                case 'costs': valA = a.costs; valB = b.costs; break;
                case 'revenue': valA = a.revenue; valB = b.revenue; break;
                case 'profit': valA = (a.revenue - a.costs); valB = (b.revenue - b.costs); break;
                default: valA = a.rawDate || a.month; valB = b.rawDate || b.month; break;
            }
            if (valA < valB) return airbnbSortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return airbnbSortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return (
            <>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                        <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5">Total Revenue</span>
                        <span className="text-sm font-medium text-emerald-400 font-mono">{formatCurrency(r.totalRevenue, asset.currency)}</span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                        <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5">Total Costs</span>
                        <span className="text-sm font-medium text-rose-400 font-mono">{formatCurrency(r.totalCosts, asset.currency)}</span>
                    </div>
                    <div className={`${r.totalProfit >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'} border rounded-xl p-3`}>
                        <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5">Net Profit</span>
                        <span className={`text-sm font-bold font-mono ${r.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(r.totalProfit, asset.currency)}</span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                        <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5">ROI</span>
                        <span className="text-sm font-medium text-white/90 font-mono">{roi.toFixed(1)}%</span>
                    </div>
                </div>
                {rightPaneMode !== 'add-rental-month' ? (
                    <button onClick={() => setRightPaneMode('add-rental-month')}
                        className="w-full mt-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-sm font-semibold transition-colors">+ Add Entry</button>
                ) : (
                    <div className="mt-4 p-4 bg-black/20 rounded-xl border border-white/5">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-sm font-bold text-white">Add Rental Entry</h4>
                            <button onClick={() => setRightPaneMode('default')} className="p-1 hover:bg-white/10 rounded-full text-white/50"><X size={14} /></button>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="flex gap-2">
                                {['Revenue', 'Cost'].map(t => (
                                    <button key={t} onClick={() => setRentalFormData(p => ({ ...p, entryType: t }))}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${rentalFormData.entryType === t
                                            ? t === 'Revenue' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                            : 'bg-white/5 border-white/10 text-white/40'
                                            }`}>{t === 'Revenue' ? '▲ Revenue' : '▼ Cost'}</button>
                                ))}
                            </div>
                            <div>
                                <label className="block mb-1 text-white/50 text-xs">Date</label>
                                <input type="date" value={rentalFormData.date} onChange={e => setRentalFormData(p => ({ ...p, date: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50" />
                            </div>
                            <div>
                                <label className="block mb-1 text-white/50 text-xs">Amount</label>
                                <NumberInput value={rentalFormData.amount} onChange={val => setRentalFormData(p => ({ ...p, amount: val }))}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50" placeholder="0" />
                            </div>
                            <div>
                                <label className="block mb-1 text-white/50 text-xs">Notes (optional)</label>
                                <input type="text" value={rentalFormData.notes} onChange={e => setRentalFormData(p => ({ ...p, notes: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50" placeholder="e.g. Cleaning fee" />
                            </div>
                            <button onClick={handleAddRentalEntry}
                                className="w-full py-2.5 rounded-xl text-sm font-semibold text-[#1A0F2E]" style={{ background: 'linear-gradient(135deg, #CC5500 0%, #D4AF37 100%)' }}>+ Add Entry</button>
                        </div>
                    </div>
                )}
                <div className="flex gap-1.5 flex-wrap mt-4">
                    {['month', 'costs', 'revenue', 'profit'].map(key => (
                        <button key={key} onClick={() => handleAirbnbSort(key)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase cursor-pointer transition-colors border ${airbnbSortConfig.key === key ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-white/40'}`}>
                            {key}{airbnbSortConfig.key === key ? (airbnbSortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                        </button>
                    ))}
                </div>
                <div className="mt-4 flex flex-col gap-2 max-h-[350px] overflow-y-auto custom-scrollbar">
                    {sortedLedger.filter(l => l.revenue > 0 || l.costs > 0).map((entry, idx) => {
                        const profit = entry.revenue - entry.costs;
                        return (
                            <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-xl p-3" style={{ borderLeft: `3px solid ${profit >= 0 ? 'var(--vu-green)' : 'var(--error)'}` }}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="text-sm font-bold text-white">{entry.month}</div>
                                        <div className={`text-xs font-semibold mt-0.5 ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {profit >= 0 ? '+' : ''}{formatCurrency(profit, asset.currency)}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[11px] text-white/40">Rev: <span className="text-emerald-400 font-semibold">{formatCurrency(entry.revenue, asset.currency)}</span></div>
                                        <div className="text-[11px] text-white/40 mt-0.5">Cost: <span className="font-semibold">{formatCurrency(entry.costs, asset.currency)}</span></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </>
        );
    };

    // --- Fund Details (ContextPane) ---
    const renderFundDetails = (asset) => {
        const avgCost = asset.totalQuantity > 0 ? asset.totalInvestment / asset.totalQuantity : 0;
        return (
            <>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                        <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5">Shares</span>
                        <span className="text-sm font-medium text-white/90 font-mono">{asset.totalQuantity}</span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                        <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5">Live Price</span>
                        <span className="text-sm font-medium text-white/90 font-mono">{formatCurrency(asset.currentPrice, 'BRL')}</span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                        <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5">Avg Cost</span>
                        <span className="text-sm font-medium text-white/90 font-mono">{formatCurrency(avgCost, 'BRL')}</span>
                    </div>
                    <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl p-3">
                        <span className="block text-[10px] text-[#D4AF37]/60 uppercase tracking-widest mb-1.5">Current Value</span>
                        <span className="text-sm font-bold text-[#D4AF37] font-mono">{formatCurrency(asset.currentValue, 'BRL')}</span>
                    </div>
                    <div className="col-span-2 bg-white/[0.02] border border-white/5 rounded-xl p-3 flex justify-between items-center">
                        <span className="text-[10px] text-white/40 uppercase tracking-widest">Total P&L</span>
                        <span className={`text-sm font-bold font-mono ${asset.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {asset.pnl >= 0 ? '+' : ''}{formatCurrency(asset.pnl, 'BRL')} ({asset.roi >= 0 ? '+' : ''}{asset.roi.toFixed(1)}%)
                        </span>
                    </div>
                </div>
                <div className="flex gap-3 mt-4">
                    <button onClick={() => handleFundBuyClick(asset)} className="flex-1 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-semibold transition-colors">Buy</button>
                    <button onClick={() => handleFundSellClick(asset)} className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-sm font-semibold transition-colors">Sell</button>
                </div>
                {asset.transactions && asset.transactions.length > 0 && (
                    <div className="pt-4 border-t border-white/5 mt-4">
                        <h4 className="text-[10px] text-white/40 uppercase tracking-[2px] mb-3">Transactions</h4>
                        <div className="bg-black/20 rounded-xl p-4 border border-white/[0.03]">
                            <TransactionTimeline transactions={asset.transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10)}
                                onEdit={(tr) => handleEditTransaction({ ...tr, category: 'fund' })}
                                onDelete={handleDeleteEntry}
                                renderItem={(tx) => (
                                    <>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${tx.quantity >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                            <span className="font-medium text-[10px] text-white/90 uppercase tracking-wider font-space">
                                                {tx.quantity >= 0 ? 'Bought' : 'Sold'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-bold text-white tracking-tight font-mono">
                                                {formatCurrency(Math.abs(tx.investment), 'BRL')}
                                            </span>
                                            <span className="text-[10px] text-white/40 font-mono tracking-tight">
                                                {tx.quantity?.toLocaleString(undefined, { maximumFractionDigits: 2 })} units • {tx.date}
                                            </span>
                                        </div>
                                    </>
                                )} />
                        </div>
                    </div>
                )}
            </>
        );
    };

    // --- Main Return ---
    return (
        <PullToRefresh onRefresh={onRefresh}>
            <div className="max-w-[1800px] mx-auto w-full pt-4 lg:pt-8">
                {/* Mobile Search */}
                <div className="mb-8 w-full block lg:hidden relative px-4">
                    <input type="text" placeholder="Search properties & funds..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-12 text-white/90 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all placeholder:text-white/30 backdrop-blur-md shadow-lg" />
                    <span className="absolute left-8 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
                </div>

                <div className="lg:flex lg:gap-8 lg:items-start">
                    {/* Left Pane */}
                    <div className="flex-1 min-w-0">
                        {renderConsolidated()}
                        {renderPropertiesAccordion()}
                        {fundBrokers.map(b => renderFundBrokerAccordion(b))}
                    </div>

                    {/* Right Pane - Desktop ContextPane & Mobile Overlay */}
                    <div className={`${(selectedAsset || rightPaneMode !== 'default') ? 'block fixed inset-0 z-50 bg-[#0A0612] lg:bg-transparent lg:static lg:block' : 'hidden lg:block'} lg:sticky top-8 h-[100dvh] lg:h-fit overflow-hidden`}>
                        <ContextPane
                            selectedAsset={selectedAsset}
                            rightPaneMode={rightPaneMode}
                            onClose={() => { setSelectedAsset(null); setRightPaneMode('default'); }}
                            renderEmptyState={() => {
                                // --- Add Broker Form ---
                                if (rightPaneMode === 'add-broker') {
                                    return (
                                        <div className="w-full h-full p-8 text-left relative flex flex-col z-10">
                                            <div className="flex justify-between items-center mb-6">
                                                <button onClick={() => setRightPaneMode('default')} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors hidden lg:block ml-auto"><X size={16} /></button>
                                            </div>
                                            <div className="flex-1">
                                                <BrokerForm assetClass="Real Estate" onSave={() => { setRightPaneMode('default'); if (onRefresh) onRefresh(); }} onCancel={() => setRightPaneMode('default')} />
                                            </div>
                                        </div>
                                    );
                                }
                                // --- Add Property Form ---
                                if (rightPaneMode === 'add-property') {
                                    return (
                                        <div className="w-full h-full p-6 text-left relative flex flex-col z-10 overflow-y-auto custom-scrollbar">
                                            <div className="flex justify-between items-center mb-6 shrink-0">
                                                <h3 className="text-lg font-bold text-white">Add New Property</h3>
                                                <button onClick={() => setRightPaneMode('default')} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors"><X size={16} /></button>
                                            </div>
                                            <div className="flex-1 flex flex-col gap-5">
                                                <div>
                                                    <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Property Name</label>
                                                    <input type="text" value={newPropertyData.name} onChange={e => setNewPropertyData(p => ({ ...p, name: e.target.value }))}
                                                        className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50 focus:bg-white/10 transition-all font-space" placeholder="e.g. Beach House" autoFocus />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Currency</label>
                                                    <CurrencySelector value={newPropertyData.currency} onChange={val => setNewPropertyData(p => ({ ...p, currency: val }))} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Investment</label>
                                                        <NumberInput value={newPropertyData.investment} onChange={val => setNewPropertyData(p => ({ ...p, investment: val }))}
                                                            className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50 transition-all font-space" placeholder="0" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Current Value</label>
                                                        <NumberInput value={newPropertyData.currentValue} onChange={val => setNewPropertyData(p => ({ ...p, currentValue: val }))}
                                                            className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50 transition-all font-space" placeholder="0" />
                                                    </div>
                                                </div>
                                                <div className="pt-2 border-t border-white/5">
                                                    <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-3">Property Options</label>
                                                    <div className="flex flex-col gap-3">
                                                        <label className="flex items-center gap-3 cursor-pointer group">
                                                            <input type="checkbox" checked={newPropertyData.hasMortgage} onChange={e => setNewPropertyData(p => ({ ...p, hasMortgage: e.target.checked }))}
                                                                className="w-4 h-4 rounded bg-white/5 border-white/20 text-[#D4AF37] focus:ring-[#D4AF37]/50" />
                                                            <div>
                                                                <span className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">Mortgage</span>
                                                                <p className="text-[11px] text-white/40">Track mortgage payments, principal, and interest</p>
                                                            </div>
                                                        </label>
                                                        <label className="flex items-center gap-3 cursor-pointer group">
                                                            <input type="checkbox" checked={newPropertyData.hasRental} onChange={e => setNewPropertyData(p => ({ ...p, hasRental: e.target.checked }))}
                                                                className="w-4 h-4 rounded bg-white/5 border-white/20 text-[#D4AF37] focus:ring-[#D4AF37]/50" />
                                                            <div>
                                                                <span className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">Rental Income</span>
                                                                <p className="text-[11px] text-white/40">Track monthly revenue, costs, and ROI</p>
                                                            </div>
                                                        </label>
                                                    </div>
                                                </div>
                                                <div className="mt-auto pt-6 flex gap-3">
                                                    <button onClick={() => setRightPaneMode('default')}
                                                        className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-gray-400 font-bold tracking-wide uppercase text-sm hover:bg-white/5 hover:text-white transition-all font-space">Cancel</button>
                                                    <button onClick={async () => {
                                                        if (!newPropertyData.name) return;
                                                        try {
                                                            await fetch('/api/real-estate', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ type: 'property', ...newPropertyData, investment: parseFloat(newPropertyData.investment) || 0, currentValue: parseFloat(newPropertyData.currentValue) || 0 })
                                                            });
                                                            setRightPaneMode('default');
                                                            setNewPropertyData({ name: '', currency: 'BRL', investment: '', currentValue: '', hasMortgage: false, hasRental: false });
                                                            if (onRefresh) onRefresh();
                                                        } catch (e) { console.error('Failed to add property', e); }
                                                    }}
                                                        className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#CC5500] to-[#D4AF37] text-[#1A0F2E] font-bold tracking-wide uppercase text-sm hover:brightness-110 hover:shadow-lg shadow-[#D4AF37]/20 transition-all font-space">Save Property</button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                // --- Add Transaction Form ---
                                if (rightPaneMode === 'add-transaction') {
                                    return (
                                        <div className="w-full h-full p-6 text-left relative flex flex-col z-10 overflow-y-auto custom-scrollbar">
                                            <div className="flex justify-between items-center mb-6 shrink-0">
                                                <h3 className="text-lg font-bold text-white">Buy Fund Shares</h3>
                                                <button onClick={() => setRightPaneMode('default')} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors"><X size={16} /></button>
                                            </div>
                                            <div className="flex-1 flex flex-col gap-5">
                                                <div>
                                                    <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Search Fund</label>
                                                    <AssetSearch onSelect={(sel) => {
                                                        const lp = marketData[sel.symbol]?.price || '';
                                                        setFundBuyData(prev => ({ ...prev, fund: (prev?.broker ? prev.broker + ' - ' : 'XP - ') + sel.symbol.replace('.SA', ''), ticker: sel.symbol.replace('.SA', ''), buyPricePerShare: lp, totalInvestment: lp ? (parseFloat(prev?.qtyToBuy) || 0) * lp : 0 }));
                                                    }} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Broker</label>
                                                    <select
                                                        value={fundBuyData?.broker || fundBrokers[0] || 'XP'}
                                                        onChange={(e) => {
                                                            const newBroker = e.target.value;
                                                            setFundBuyData(prev => {
                                                                const newFundName = prev?.ticker ? `${newBroker} - ${prev.ticker}` : '';
                                                                return { ...prev, broker: newBroker, fund: newFundName };
                                                            });
                                                        }}
                                                        className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50 transition-all font-space appearance-none"
                                                    >
                                                        {(fundBrokers.length > 0 ? fundBrokers : ['XP']).map(b => (
                                                            <option key={b} value={b} className="bg-[#1A0F2E]">{b}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                {fundBuyData?.ticker && (
                                                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                                        <span className="text-sm font-semibold text-emerald-400">{fundBuyData.fund} ({fundBuyData.ticker})</span>
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Date</label>
                                                        <input type="date" value={fundBuyData?.date || new Date().toISOString().split('T')[0]} onChange={e => setFundBuyData(p => ({ ...p, date: e.target.value }))}
                                                            className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50 transition-all font-space" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Quantity</label>
                                                        <NumberInput value={fundBuyData?.qtyToBuy || ''} onChange={val => updateFundBuyCalc('qtyToBuy', val)}
                                                            className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50 transition-all font-space" placeholder="0" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Price per Share (R$)</label>
                                                    <NumberInput value={fundBuyData?.buyPricePerShare || ''} onChange={val => updateFundBuyCalc('buyPricePerShare', val)}
                                                        className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50 transition-all font-space" placeholder="0" />
                                                </div>
                                                <div className="glass-card p-4 text-center">
                                                    <div className="text-xs text-white/50 uppercase tracking-wider mb-1">Total Investment</div>
                                                    <div className="text-xl font-bold text-[#D4AF37]">{formatCurrency(fundBuyData?.totalInvestment || 0, 'BRL')}</div>
                                                </div>
                                                <div className="mt-auto pt-6 flex gap-3">
                                                    <button onClick={() => setRightPaneMode('default')}
                                                        className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-gray-400 font-bold tracking-wide uppercase text-sm hover:bg-white/5 hover:text-white transition-all font-space">Cancel</button>
                                                    <button onClick={() => { handleFundBuyConfirm(); setRightPaneMode('default'); }}
                                                        className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#CC5500] to-[#D4AF37] text-[#1A0F2E] font-bold tracking-wide uppercase text-sm hover:brightness-110 hover:shadow-lg shadow-[#D4AF37]/20 transition-all font-space">Confirm Purchase</button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                // --- Edit Transaction Form ---
                                if (rightPaneMode === 'edit-transaction' && editingTransaction) {
                                    const isFund = editingTransaction.category === 'fund' || editingTransaction.ticker;
                                    return (
                                        <div className="w-full h-full p-6 text-left relative flex flex-col z-10 overflow-y-auto custom-scrollbar">
                                            <div className="flex justify-between items-center mb-6 shrink-0">
                                                <h3 className="text-lg font-bold text-white">Edit Transaction</h3>
                                                <button onClick={() => { setEditingTransaction(null); setRightPaneMode('default'); }} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors"><X size={16} /></button>
                                            </div>
                                            <div className="flex-1 flex flex-col gap-5">
                                                {isFund && (
                                                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                                        <span className="text-sm font-semibold text-emerald-400">{editingTransaction.fund || editingTransaction.asset}</span>
                                                    </div>
                                                )}
                                                <div>
                                                    <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Date</label>
                                                    <input type="date" value={editingTransaction.date || ''}
                                                        onChange={e => setEditingTransaction(p => ({ ...p, date: e.target.value }))}
                                                        className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50 transition-all font-space" />
                                                </div>
                                                {isFund && (
                                                    <>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Quantity</label>
                                                                <NumberInput value={editingTransaction.quantity || ''}
                                                                    onChange={val => setEditingTransaction(p => ({ ...p, quantity: val }))}
                                                                    className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50 transition-all font-space" placeholder="0" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Price/Share</label>
                                                                <NumberInput value={editingTransaction.costPerShare || editingTransaction.price || ''}
                                                                    onChange={val => setEditingTransaction(p => ({ ...p, costPerShare: val }))}
                                                                    className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50 transition-all font-space" placeholder="0" />
                                                            </div>
                                                        </div>
                                                        <div className="glass-card p-4 text-center">
                                                            <div className="text-xs text-white/50 uppercase tracking-wider mb-1">Total</div>
                                                            <div className="text-xl font-bold text-[#D4AF37]">
                                                                {formatCurrency(Math.abs((parseFloat(editingTransaction.quantity) || 0) * (parseFloat(editingTransaction.costPerShare || editingTransaction.price) || 0)), 'BRL')}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                                {!isFund && (
                                                    <div className="flex flex-col gap-4">
                                                        <div>
                                                            <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Amount</label>
                                                            <NumberInput value={editingTransaction.amount || ''}
                                                                onChange={val => setEditingTransaction(p => ({ ...p, amount: val }))}
                                                                className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50 transition-all font-space" placeholder="0" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Type / Notes</label>
                                                            <input type="text" value={editingTransaction.type || ''}
                                                                onChange={e => setEditingTransaction(p => ({ ...p, type: e.target.value }))}
                                                                className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50 transition-all font-space" placeholder="e.g. Valuation Update, Renovation..." />
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="mt-auto pt-6 flex gap-3">
                                                    <button onClick={() => { setEditingTransaction(null); setRightPaneMode('default'); }}
                                                        className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-gray-400 font-bold tracking-wide uppercase text-sm hover:bg-white/5 hover:text-white transition-all font-space">Cancel</button>
                                                    <button onClick={handleSaveEditTransaction}
                                                        className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#CC5500] to-[#D4AF37] text-[#1A0F2E] font-bold tracking-wide uppercase text-sm hover:brightness-110 hover:shadow-lg shadow-[#D4AF37]/20 transition-all font-space">Save Changes</button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                // --- Default empty state ---
                                return (
                                    <div className="p-8 pb-4 h-full flex flex-col items-center justify-center text-center relative z-10 space-y-8">
                                        <div className="w-full max-w-md relative">
                                            <input type="text" placeholder="Search properties & funds..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-12 text-white border-none focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all placeholder:text-white/30 backdrop-blur-md shadow-2xl" />
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
                                        </div>
                                        <div className="flex-1 flex flex-col items-center justify-center -mt-16 w-full max-w-[280px] mx-auto opacity-60">
                                            <div className="w-20 h-20 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mb-6 ring-1 ring-[#D4AF37]/20">
                                                <span className="text-3xl filter grayscale opacity-70">🏢</span>
                                            </div>
                                            <h3 className="text-xl font-bold text-white tracking-tight font-bebas tracking-widest mb-3">Select an Asset</h3>
                                            <p className="text-sm text-parchment/60 leading-relaxed max-w-[250px] mx-auto">
                                                Click on any property or fund to view detailed metrics, mortgage info, and rental income.
                                            </p>
                                        </div>
                                    </div>
                                );
                            }}
                            renderHeader={(asset) => (
                                <div className="flex flex-col">
                                    <h3 className="text-xl font-bold text-white/90 tracking-tight">
                                        {asset.type === 'fund' ? asset.fund : asset.name}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="px-2 py-0.5 rounded bg-white/10 text-white/60 text-[10px] font-mono tracking-wider">
                                            {asset.type === 'fund' ? asset.ticker : asset.currency}
                                        </span>
                                        {asset.type === 'property' && (
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${asset.status === 'Sold' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                {asset.status}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                            renderDetails={(asset) => {
                                if (asset.type === 'fund') return renderFundDetails(asset);
                                return (
                                    <div>
                                        {renderTabBar(asset)}
                                        {contextTab === 'overview' && renderOverviewTab(asset)}
                                        {contextTab === 'mortgage' && renderMortgageTab(asset)}
                                        {contextTab === 'rental' && renderRentalTab(asset)}
                                    </div>
                                );
                            }}
                        />
                    </div>
                </div>

                {/* Fund Buy Modal */}
                {isFundBuyModalOpen && fundBuyData && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setIsFundBuyModalOpen(false)} />
                        <div className="glass-card" style={{ position: 'relative', zIndex: 1000, padding: '32px', width: '520px', maxWidth: '90vw' }}>
                            <h3 style={{ marginBottom: '8px', fontSize: '1.3rem', color: 'var(--accent-color)' }}>
                                {fundBuyData.ticker ? `Buy More ${fundBuyData.fund}` : 'New Fund Purchase'}
                            </h3>
                            {!fundBuyData.ticker && (
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Search Fund</label>
                                    <AssetSearch onSelect={(sel) => {
                                        const lp = marketData[sel.symbol]?.price || '';
                                        setFundBuyData(prev => ({ ...prev, fund: 'XP - ' + sel.symbol.replace('.SA', ''), ticker: sel.symbol.replace('.SA', ''), buyPricePerShare: lp, totalInvestment: lp ? (parseFloat(prev.qtyToBuy) || 0) * lp : 0 }));
                                    }} />
                                </div>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Date</label>
                                    <input type="date" value={fundBuyData.date} onChange={e => setFundBuyData(p => ({ ...p, date: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Quantity</label>
                                    <NumberInput value={fundBuyData.qtyToBuy} onChange={val => updateFundBuyCalc('qtyToBuy', val)}
                                        style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
                                </div>
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Buy Price / Share (R$)</label>
                                <NumberInput value={fundBuyData.buyPricePerShare} onChange={val => updateFundBuyCalc('buyPricePerShare', val)}
                                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
                            </div>
                            <div className="glass-card" style={{ padding: '16px', marginBottom: '24px', textAlign: 'center' }}>
                                <div style={{ color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>Total Investment</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-color)' }}>{formatCurrency(fundBuyData.totalInvestment || 0, 'BRL')}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button onClick={() => setIsFundBuyModalOpen(false)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--fg-secondary)', cursor: 'pointer' }}>Cancel</button>
                                <button onClick={handleFundBuyConfirm} style={{ padding: '10px 20px', background: 'var(--accent-color)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 600, cursor: 'pointer' }}>Confirm Purchase</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Fund Sell Modal */}
                {isFundSellModalOpen && fundSellData && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setIsFundSellModalOpen(false)} />
                        <div className="glass-card" style={{ position: 'relative', zIndex: 1000, padding: '32px', width: '520px', maxWidth: '90vw' }}>
                            <h3 style={{ marginBottom: '8px', fontSize: '1.3rem', color: 'var(--error)' }}>Sell {fundSellData.fund}</h3>
                            <p style={{ margin: '0 0 24px', color: 'var(--fg-secondary)', fontSize: '0.9rem' }}>{fundSellData.ticker} · BRL · {fundSellData.sharesHeld} shares held</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Date</label>
                                    <input type="date" value={fundSellData.date} onChange={e => setFundSellData(p => ({ ...p, date: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff', outline: 'none' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Quantity</label>
                                    <NumberInput value={fundSellData.qtyToSell} onChange={val => updateFundSellCalc('qtyToSell', val)}
                                        style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff', outline: 'none' }} />
                                </div>
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Sell Price / Share (R$)</label>
                                <NumberInput value={fundSellData.sellPricePerShare} onChange={val => updateFundSellCalc('sellPricePerShare', val)}
                                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff', outline: 'none' }} />
                            </div>
                            <div className="glass-card" style={{ padding: '16px', marginBottom: '24px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', textAlign: 'center' }}>
                                    <div>
                                        <div style={{ color: 'var(--fg-secondary)', fontSize: '0.8rem', marginBottom: '4px' }}>Proceeds</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-color)' }}>{formatCurrency(fundSellData.totalProceeds || 0, 'BRL')}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--fg-secondary)', fontSize: '0.8rem', marginBottom: '4px' }}>Cost Basis</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{formatCurrency(fundSellData.avgCost * (parseFloat(fundSellData.qtyToSell) || 0), 'BRL')}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--fg-secondary)', fontSize: '0.8rem', marginBottom: '4px' }}>P&L</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: fundSellData.pnl >= 0 ? 'var(--vu-green)' : 'var(--error)' }}>
                                            {formatCurrency(fundSellData.pnl || 0, 'BRL')} ({(fundSellData.roi || 0).toFixed(1)}%)
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button onClick={() => setIsFundSellModalOpen(false)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--fg-secondary)', cursor: 'pointer' }}>Cancel</button>
                                <button onClick={handleFundSellConfirm} style={{ padding: '10px 20px', background: 'var(--error)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Confirm Sale</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Activity History */}
                <section className="max-w-3xl mx-auto mb-10 mt-12">
                    <div className="flex justify-between items-center mb-6 px-1">
                        <h3 className="text-lg font-medium text-white/90 flex items-center gap-2">Activity History</h3>
                        <button onClick={() => setLedgerOpen(!ledgerOpen)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm font-medium transition-colors">
                            {ledgerOpen ? 'Hide' : 'Show'} ({(data?.funds?.transactions?.length || 0) + properties.reduce((a, p) => a + (p.ledger?.length || 0), 0)})
                        </button>
                    </div>
                    {ledgerOpen && (
                        <div className="bg-white/5 backdrop-blur-md border border-white/5 rounded-3xl p-4 sm:p-6 mb-24">
                            <TransactionTimeline
                                transactions={[
                                    ...properties.flatMap(p => (p.ledger || []).map(l => ({
                                        ...l, asset: p.name, broker: 'Manual', category: 'property',
                                        investment: l.amount, date: l.date, currency: p.currency
                                    }))),
                                    ...(data?.funds?.transactions || []).map(t => ({
                                        ...t, asset: t.fund, broker: 'XP', category: 'fund',
                                        date: t.date, currency: 'BRL'
                                    }))
                                ].sort((a, b) => (b.date || '').localeCompare(a.date || ''))}
                                onEdit={handleEditTransaction}
                                onDelete={handleDeleteEntry}
                                renderItem={(tr) => {
                                    const isSell = (tr.investment || tr.amount) < 0;
                                    const cur = tr.currency || 'BRL';
                                    return (
                                        <>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className={`w-2 h-2 rounded-full ${!isSell ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                <span className="font-semibold text-sm text-white/90">
                                                    {tr.category === 'fund' ? (tr.quantity >= 0 ? 'Bought' : 'Sold') : (tr.type || 'Transaction')} <span className="text-white/60">{tr.asset}</span>
                                                </span>
                                                <span className="text-xs text-white/40 ml-auto">{tr.broker}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-white tracking-tight">
                                                    {formatCurrency(Math.abs(tr.investment || tr.amount || 0), cur)}
                                                </span>
                                                <span className="text-xs text-white/40">• {tr.date}</span>
                                            </div>
                                        </>
                                    );
                                }}
                            />
                        </div>
                    )}
                </section>

                {/* FAB */}
                <FloatingActionButton
                    onAddBroker={() => { setSelectedAsset(null); setRightPaneMode('add-broker'); }}
                    onAddProperty={() => { setSelectedAsset(null); setRightPaneMode('add-property'); }}
                    onAddTransaction={() => { setSelectedAsset(null); setFundBuyData({ date: new Date().toISOString().split('T')[0], qtyToBuy: '', buyPricePerShare: '', totalInvestment: 0 }); setRightPaneMode('add-transaction'); }}
                />

                {/* Delete Confirmation */}
                <ConfirmationModal
                    isOpen={isDeleteModalOpen}
                    title="Delete Entry"
                    message="Are you sure you want to delete this entry?"
                    onConfirm={confirmDelete}
                    onCancel={() => { setIsDeleteModalOpen(false); setDeleteTarget(null); }}
                />
            </div>
        </PullToRefresh>
    );
}
