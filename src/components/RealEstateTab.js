import React, { useState, useEffect } from 'react';
import AssetTable from './AssetTable';
import AssetSearch from './AssetSearch';
import TransactionLedger from './TransactionLedger';
import MortgageTransactionForm from './MortgageTransactionForm';
import AirbnbTransactionForm from './AirbnbTransactionForm';
import AirbnbEditModal from './AirbnbEditModal';
import InkCourtEditModal from './InkCourtEditModal';
import FundsEditModal from './FundsEditModal';
import FundsTransactionForm from './FundsTransactionForm';
import ConfirmationModal from './ConfirmationModal';

export default function RealEstateTab({ data, rates, onRefresh, marketData = {} }) {
    const [isMortgageFormOpen, setIsMortgageFormOpen] = useState(false);

    // Scroll to hash on load
    useEffect(() => {
        if (data && typeof window !== 'undefined' && window.location.hash) {
            const id = window.location.hash.substring(1); // remove '#'
            const element = document.getElementById(id);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.style.transition = 'box-shadow 1.5s ease-out';
                    element.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.4)';
                    setTimeout(() => { element.style.boxShadow = ''; }, 2000);
                }, 100);
            }
        }
    }, [data]);
    const [isAirbnbFormOpen, setIsAirbnbFormOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingMonth, setEditingMonth] = useState(null);
    const [isInkCourtEditModalOpen, setIsInkCourtEditModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [isFundsEditModalOpen, setIsFundsEditModalOpen] = useState(false);
    const [editingFundTransaction, setEditingFundTransaction] = useState(null);
    const [isFundsFormOpen, setIsFundsFormOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [idToDelete, setIdToDelete] = useState(null);
    const [monthToDelete, setMonthToDelete] = useState(null);
    const [expandedPropertyId, setExpandedPropertyId] = useState(null);
    const [hoveredCostMonth, setHoveredCostMonth] = useState(null);
    const [liveMarketValue, setLiveMarketValue] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    // Ledger expansion states
    const [isFundsLedgerOpen, setIsFundsLedgerOpen] = useState(false);
    const [isAirbnbLedgerOpen, setIsAirbnbLedgerOpen] = useState(false);
    const [isMortgageLedgerOpen, setIsMortgageLedgerOpen] = useState(false);

    // Fund Buy/Sell modal states
    const [isFundBuyModalOpen, setIsFundBuyModalOpen] = useState(false);
    const [fundBuyData, setFundBuyData] = useState(null);
    const [isFundSellModalOpen, setIsFundSellModalOpen] = useState(false);
    const [fundSellData, setFundSellData] = useState(null);

    const [isEditingPropertyValue, setIsEditingPropertyValue] = useState(false);
    const [tempPropertyValue, setTempPropertyValue] = useState(0);

    const [airbnbSortConfig, setAirbnbSortConfig] = useState({ key: 'month', direction: 'desc' });

    const handleAirbnbSort = (key) => {
        let direction = 'desc';
        if (airbnbSortConfig.key === key && airbnbSortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setAirbnbSortConfig({ key, direction });
    };

    const getAirbnbSortIndicator = (key) => {
        if (airbnbSortConfig.key !== key) return null;
        return airbnbSortConfig.direction === 'asc' ? ' ▲' : ' ▼';
    };

    const handleSavePropertyValue = async () => {
        if (!tempPropertyValue || isNaN(parseFloat(tempPropertyValue))) {
            alert('Please enter a valid number');
            return;
        }
        try {
            const res = await fetch('/api/real-estate', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'updatePropertyValue', value: parseFloat(tempPropertyValue) })
            });
            if (res.ok) {
                setIsEditingPropertyValue(false);
                if (onRefresh) onRefresh();
            } else {
                const errData = await res.json();
                alert('Error saving: ' + (errData.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('Failed to save property value:', err);
            alert('Failed to connect to server');
        }
    };

    useEffect(() => {
        const fetchMarketValue = async () => {
            try {
                const res = await fetch('/api/market-value');
                const data = await res.json();
                if (data.price) {
                    setLiveMarketValue(data.price);
                    setLastUpdated(new Date());
                }
            } catch (err) {
                console.error('Failed to fetch live market value:', err);
            } finally {
                setLastUpdated(new Date());
            }
        };
        fetchMarketValue();
        // Refresh every 5 minutes
        const interval = setInterval(fetchMarketValue, 300000);
        return () => clearInterval(interval);
    }, []);

    if (!data) return <div style={{ color: 'var(--fg-secondary)', padding: '20px' }}>Loading real estate data...</div>;

    const { properties, funds, airbnb, inkCourt } = data;
    const BRL = rates.BRL;

    // Fund Buy/Sell handlers
    const handleFundBuyClick = (fundRow) => {
        const ticker = fundRow.ticker;
        const liveData = marketData[`${ticker}.SA`];
        const livePrice = liveData?.price || fundRow.currentPrice || 0;
        setFundBuyData({
            fund: fundRow.fund,
            ticker: ticker,
            qtyToBuy: '',
            buyPricePerShare: livePrice,
            totalInvestment: 0,
            date: new Date().toISOString().split('T')[0],
        });
        setIsFundBuyModalOpen(true);
    };

    const handleNewFundBuyClick = () => {
        setFundBuyData({
            fund: '',
            ticker: '',
            qtyToBuy: '',
            buyPricePerShare: '',
            totalInvestment: 0,
            date: new Date().toISOString().split('T')[0],
        });
        setIsFundBuyModalOpen(true);
    };

    const updateFundBuyCalc = (field, value) => {
        setFundBuyData(prev => {
            const updated = { ...prev, [field]: value };
            const qty = parseFloat(updated.qtyToBuy) || 0;
            const price = parseFloat(updated.buyPricePerShare) || 0;
            updated.totalInvestment = qty * price;
            return updated;
        });
    };

    const handleFundBuyConfirm = async () => {
        if (!fundBuyData || !fundBuyData.fund) return;
        const qty = parseFloat(fundBuyData.qtyToBuy) || 0;
        const price = parseFloat(fundBuyData.buyPricePerShare) || 0;
        if (qty <= 0 || price <= 0) return;
        const tr = {
            id: 'fund-' + Date.now(),
            date: fundBuyData.date,
            fund: fundBuyData.fund,
            investment: price * qty,
            quantity: qty,
            costPerShare: price,
        };
        try {
            await fetch('/api/real-estate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section: 'funds', transaction: tr })
            });
            setIsFundBuyModalOpen(false);
            setFundBuyData(null);
            onRefresh();
        } catch (e) { console.error(e); }
    };

    const handleFundSellClick = (fundRow) => {
        const ticker = fundRow.ticker;
        const liveData = marketData[`${ticker}.SA`];
        const livePrice = liveData?.price || fundRow.currentPrice || 0;
        const avgCost = fundRow.totalQuantity > 0 ? fundRow.totalInvestment / fundRow.totalQuantity : 0;
        const qty = fundRow.totalQuantity;
        const sellPrice = livePrice;
        const proceeds = sellPrice * qty;
        const pnl = proceeds - fundRow.totalInvestment;
        const roi = fundRow.totalInvestment !== 0 ? (pnl / fundRow.totalInvestment * 100) : 0;
        setFundSellData({
            fund: fundRow.fund,
            ticker: ticker,
            sharesHeld: qty,
            avgCost,
            qtyToSell: qty,
            sellPricePerShare: sellPrice,
            totalProceeds: proceeds,
            pnl,
            roi,
            date: new Date().toISOString().split('T')[0],
        });
        setIsFundSellModalOpen(true);
    };

    const updateFundSellCalc = (field, value) => {
        setFundSellData(prev => {
            const updated = { ...prev, [field]: value };
            const qty = parseFloat(updated.qtyToSell) || 0;
            const price = parseFloat(updated.sellPricePerShare) || 0;
            const costBasis = prev.avgCost * qty;
            updated.totalProceeds = price * qty;
            updated.pnl = updated.totalProceeds - costBasis;
            updated.roi = costBasis !== 0 ? (updated.pnl / costBasis * 100) : 0;
            return updated;
        });
    };

    const handleFundSellConfirm = async () => {
        if (!fundSellData) return;
        const qty = parseFloat(fundSellData.qtyToSell) || 0;
        const price = parseFloat(fundSellData.sellPricePerShare) || 0;
        if (qty <= 0 || price <= 0) return;
        const tr = {
            id: 'fund-' + Date.now(),
            date: fundSellData.date,
            fund: fundSellData.fund,
            investment: -(price * qty),
            quantity: -qty,
            costPerShare: price,
        };
        try {
            await fetch('/api/real-estate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section: 'funds', transaction: tr })
            });
            setIsFundSellModalOpen(false);
            setFundSellData(null);
            onRefresh();
        } catch (e) { console.error(e); }
    };

    const handleAddMortgage = async (newEntry) => {
        try {
            await fetch('/api/real-estate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section: 'mortgages', ...newEntry })
            });
            onRefresh();
            setIsMortgageFormOpen(false);
        } catch (error) {
            console.error('Failed to add mortgage transaction:', error);
        }
    };

    const handleAddAirbnb = async (newEntry) => {
        try {
            await fetch('/api/real-estate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section: 'airbnb', ...newEntry })
            });
            onRefresh();
            setIsAirbnbFormOpen(false);
        } catch (error) {
            console.error('Failed to add Airbnb transaction:', error);
        }
    };

    const handleEditInkCourtTransaction = (transaction) => {
        setEditingTransaction(transaction);
        setIsInkCourtEditModalOpen(true);
    };

    const handleSaveInkCourtTransaction = async (updatedTransaction) => {
        try {
            await fetch('/api/real-estate', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section: 'inkCourt', transaction: updatedTransaction })
            });
            onRefresh();
            setIsInkCourtEditModalOpen(false);
            setEditingTransaction(null);
        } catch (error) {
            console.error('Failed to update transaction:', error);
        }
    };

    const handleEditFundTransaction = (transaction) => {
        setEditingFundTransaction(transaction);
        setIsFundsEditModalOpen(true);
    };

    const handleSaveFundTransaction = async (updatedTransaction) => {
        try {
            await fetch('/api/real-estate', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section: 'funds', transaction: updatedTransaction })
            });
            onRefresh();
            setIsFundsEditModalOpen(false);
            setEditingFundTransaction(null);
        } catch (error) {
            console.error('Failed to update fund transaction:', error);
        }
    };

    const handleDeleteEntry = (id) => {
        if (!id) return;
        setIdToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!idToDelete) return;
        try {
            const res = await fetch(`/api/real-estate?id=${idToDelete}`, { method: 'DELETE' });
            if (res.ok) {
                onRefresh();
            }
        } catch (error) {
            console.error('Failed to delete transaction:', error);
        } finally {
            setIsDeleteModalOpen(false);
            setIdToDelete(null);
        }
    };

    const handleDeleteAirbnbMonth = (month) => {
        if (!month) return;
        setMonthToDelete(month);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteAirbnbMonth = async () => {
        if (!monthToDelete) return;
        try {
            const res = await fetch(`/api/real-estate?section=airbnb&month=${monthToDelete}`, { method: 'DELETE' });
            if (res.ok) {
                onRefresh();
            }
        } catch (error) {
            console.error('Failed to delete Airbnb month:', error);
        } finally {
            setIsDeleteModalOpen(false);
            setMonthToDelete(null);
        }
    };

    const handleEditAirbnbMonth = (month) => {
        setEditingMonth(month);
        setIsEditModalOpen(true);
    };

    const handleSaveTransactions = async (month, transactions) => {
        try {
            await fetch('/api/real-estate', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section: 'airbnb', month, transactions })
            });
            onRefresh();
            setIsEditModalOpen(false);
            setEditingMonth(null);
        } catch (error) {
            console.error('Failed to update transactions:', error);
        }
    };

    const parseShortDate = (dateStr) => {
        // Formats: "MMM-YY" (e.g. Feb-26) or "DD/MM/YYYY" (e.g. 03/04/2023)
        if (dateStr.includes('/')) {
            const [d, m, y] = dateStr.split('/').map(Number);
            return new Date(y, m - 1, d);
        }
        const [mmm, yy] = dateStr.split('-');
        const months = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };
        return new Date(2000 + parseInt(yy), months[mmm], 1);
    };

    const sortLedger = (ledger, dateKey = 'date') => {
        if (!ledger || !Array.isArray(ledger)) return [];
        return [...ledger].sort((a, b) => parseShortDate(b[dateKey]) - parseShortDate(a[dateKey]));
    };

    const calculateMonthAggregates = (monthEntry) => {
        if (!monthEntry.transactions || monthEntry.transactions.length === 0) {
            // Backward compatibility: use existing aggregated data
            return {
                costs: monthEntry.costs || 0,
                revenue: monthEntry.revenue || 0,
                costBreakdown: monthEntry.costBreakdown || null
            };
        }

        // Calculate from transactions
        let costs = 0;
        let revenue = 0;
        const costBreakdown = {};

        monthEntry.transactions.forEach(t => {
            if (t.type === 'Revenue') {
                revenue += t.amount;
            } else if (t.type === 'Cost') {
                costs += t.amount;
                if (t.costType) {
                    costBreakdown[t.costType] = (costBreakdown[t.costType] || 0) + t.amount;
                }
            }
        });

        return {
            costs,
            revenue,
            costBreakdown: Object.keys(costBreakdown).length > 0 ? costBreakdown : null
        };
    };

    // Funds Calculation (Matching the Funds Summary Table logic)
    const fundSummary = {};
    let fundsTotalValueBrl = 0;
    let fundsTotalInvestmentBrl = 0;

    funds.transactions?.forEach(tr => {
        const ticker = tr.fund.split(' - ')[1] || tr.fund;
        if (!fundSummary[ticker]) {
            fundSummary[ticker] = { totalQuantity: 0, totalInvestment: 0 };
        }
        fundSummary[ticker].totalQuantity += tr.quantity;
        fundSummary[ticker].totalInvestment += tr.investment;
    });

    Object.entries(fundSummary).forEach(([ticker, summary]) => {
        const holding = funds.holdings.find(h => h.ticker === ticker);
        const liveData = marketData[`${ticker}.SA`];
        const currentPrice = liveData?.price || holding?.currentPrice || 0;
        fundsTotalValueBrl += summary.totalQuantity * currentPrice;
        fundsTotalInvestmentBrl += summary.totalInvestment;
    });

    // Properties Calculation
    const currentAssets = properties.filter(p => p.status === 'Owned').map(p => {
        let displayValue = p.currentValue;

        // Andyara 2: Use Investment Value (Unrealized gain ignored)
        if (p.id === 'andyara-2') {
            displayValue = 290000;
            p.investment = 290000;
        }
        // Ink Court: Use Equity (Property Value - Mortgage Balance)
        else if (p.id === 'ink-court' && inkCourt) {
            const totalPrincipalPaid = inkCourt.ledger.reduce((sum, t) => sum + (t.principal || 0), 0);
            const mortgageBalance = (inkCourt.mortgageAmount || 0) - totalPrincipalPaid;
            displayValue = (inkCourt.propertyValue || 0) - mortgageBalance;
            p.investment = displayValue;
        }

        let roi = p.investment > 0 ? ((displayValue - p.investment) / p.investment) * 100 : 0;

        if (p.id === 'andyara-2') {
            roi = ((500000 - 290000) / 290000) * 100;
        }

        if (p.name.includes('Zara')) {
            displayValue = 444204;
            p.investment = 444204;

            if (airbnb) {
                const airbnbRevenue = airbnb.ledger.reduce((sum, l) => sum + calculateMonthAggregates(l).revenue, 0);
                const airbnbCosts = airbnb.ledger.reduce((sum, l) => sum + calculateMonthAggregates(l).costs, 0);
                const profit = airbnbRevenue - airbnbCosts;
                roi = (profit / 444204) * 100;
            }
        }

        return {
            name: p.name,
            brl: p.currency === 'GBP' ? displayValue * BRL : displayValue,
            gbp: p.currency === 'GBP' ? displayValue : displayValue / BRL,
            investmentGBP: p.currency === 'GBP' ? p.investment : p.investment / BRL,
            roi: roi
        };
    });

    currentAssets.push({
        name: 'Funds',
        brl: fundsTotalValueBrl,
        gbp: fundsTotalValueBrl / BRL,
        investmentGBP: fundsTotalInvestmentBrl / BRL,
        roi: fundsTotalInvestmentBrl !== 0 ? ((fundsTotalValueBrl - fundsTotalInvestmentBrl) / fundsTotalInvestmentBrl * 100) : 0
    });

    // Realised P&L calculation
    let totalRealisedPnLBrl = 0;
    properties.filter(p => p.status === 'Sold').forEach(p => {
        let inv = p.investment || 0;
        let tax = p.taxes || 0;
        let sale = p.salePrice || 0;

        if (p.name.includes('Andyara 1')) {
            inv = 237000; tax = 9074; sale = 360000;
        } else if (p.name.includes('Montes Claros')) {
            inv = 681000; tax = 29748; sale = 822920;
        }

        const profit = sale - (inv + tax);
        totalRealisedPnLBrl += (p.currency === 'GBP' ? profit * BRL : profit);
    });

    if (totalRealisedPnLBrl !== 0) {
        currentAssets.push({
            name: 'Realised P&L',
            brl: totalRealisedPnLBrl,
            gbp: totalRealisedPnLBrl / BRL,
            investmentGBP: 0,
            roi: 0,
            isRealisedPnL: true
        });
    }

    const activeAssets = currentAssets.filter(a => !a.isRealisedPnL).sort((a, b) => b.brl - a.brl);

    const totalCurrentBrl = activeAssets.reduce((sum, a) => sum + a.brl, 0);
    const totalCurrentGbp = activeAssets.reduce((sum, a) => sum + a.gbp, 0);
    const totalInvestmentGbp = activeAssets.reduce((sum, a) => sum + (a.investmentGBP || 0), 0);

    const subtotalPnL = totalCurrentGbp - totalInvestmentGbp;
    const subtotalRoi = totalInvestmentGbp !== 0 ? (subtotalPnL / totalInvestmentGbp * 100) : 0;

    const totalRealisedPnLGbp = totalRealisedPnLBrl !== 0 ? (totalRealisedPnLBrl / BRL) : 0;
    const totalPnL = subtotalPnL + totalRealisedPnLGbp;
    const totalRoi = totalInvestmentGbp !== 0 ? (totalPnL / totalInvestmentGbp * 100) : 0;

    // Add Total row for rendering if needed, but we'll render it separately in the footer
    // currentAssets.push({ ... }); // Let's keep the array clean for mapping and render Total manually


    // 2. History & Totals - Calculate from data if summary is missing
    const summary = data.summary || (() => {
        let tInvestment = 0;
        let tTaxes = 0;
        let tSales = 0;
        let tIncomeTax = 0;
        let tSalesTax = 0;

        // Properties
        properties.forEach(p => {
            let inv = p.investment || 0;
            let taxes = p.taxes || 0;
            let sale = p.status === 'Sold' ? (p.salePrice || 0) : 0;

            if (p.id === 'ink-court' && inkCourt) {
                // Ink Court Equity calculation
                const totalPrincipalPaid = inkCourt.ledger.reduce((sum, t) => sum + (t.principal || 0), 0);
                const deposit = inkCourt.deposit || 0;
                const stampDuty = inkCourt.ledger.find(l => l.source === 'Stamp Duty')?.costs || 0;
                inv = deposit + stampDuty + totalPrincipalPaid;

                // Taxes
                const taxesTx = inkCourt.ledger.filter(t =>
                    ['Stamp Duty', 'Tinsdills + Management Fees', 'L&G Home Survey'].includes(t.source)
                );
                taxes = taxesTx.reduce((sum, t) => sum + t.costs, 0);

                // Adjust investment to match equity (as we want ROI to be 0 for now)
                inv = inv; // Now inv is equity
            }

            // Convert to GBP if BRL
            if (p.currency === 'BRL') {
                inv /= BRL;
                taxes /= BRL;
                sale /= BRL;
            }

            tInvestment += inv;
            tTaxes += taxes;
            tSales += sale;
        });

        // Funds
        // fundsTotalInvestmentBrl is calculated above
        tInvestment += (fundsTotalInvestmentBrl / BRL);

        return {
            totalInvestment: tInvestment,
            totalTaxes: tTaxes,
            totalSales: tSales,
            incomeTax: tIncomeTax,
            salesTax: tSalesTax
        };
    })();

    const historyStats = [
        { label: 'Investment', value: summary.totalInvestment },
        { label: 'Taxes & Fees', value: summary.totalTaxes },
        { label: 'Total Investment', value: summary.totalInvestment + summary.totalTaxes },
        { label: 'Total Sales', value: summary.totalSales },
        { label: 'Gross Profit', value: summary.totalSales - (summary.totalInvestment + summary.totalTaxes), isProfit: true }, // Gross = Sales - Total Cost
        { label: 'Net Profit', value: (summary.totalSales - (summary.totalInvestment + summary.totalTaxes)) - summary.incomeTax - summary.salesTax, isProfit: true }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>

            {/* SECTION 1: TOP SUMMARY */}
            <section>
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '48px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div style={{
                        padding: '20px 24px', borderBottom: '1px solid var(--glass-border)',
                        background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, rgba(255,255,255,0) 100%)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '1.3rem' }}>📊 Real Estate Consolidated Portfolio</h3>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ color: totalPnL >= 0 ? 'var(--vu-green)' : 'var(--error)', fontWeight: 700, fontSize: '1.1rem' }}>
                                {totalPnL >= 0 ? '+' : ''}£{totalPnL.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({totalRoi.toFixed(1)}%)
                            </span>
                            <div style={{ fontSize: '0.85rem', color: 'var(--fg-secondary)', marginTop: '4px' }}>
                                Total: R$ {totalCurrentBrl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                        </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                <th style={{ padding: '12px 24px', textAlign: 'left', color: 'var(--fg-secondary)', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Asset</th>
                                <th style={{ padding: '12px 24px', textAlign: 'right', color: 'var(--fg-secondary)', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Value (BRL)</th>
                                <th style={{ padding: '12px 24px', textAlign: 'right', color: 'var(--fg-secondary)', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Value (GBP)</th>
                                <th style={{ padding: '12px 24px', textAlign: 'right', color: 'var(--fg-secondary)', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Net Invest (GBP)</th>
                                <th style={{ padding: '12px 24px', textAlign: 'right', color: 'var(--fg-secondary)', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>ROI %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeAssets.map(asset => (
                                <tr key={asset.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '14px 24px', fontWeight: 600 }}>{asset.name}</td>
                                    <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 600 }}>R$ {asset.brl.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                    <td style={{ padding: '14px 24px', textAlign: 'right', color: 'var(--fg-secondary)' }}>£{asset.gbp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                    <td style={{ padding: '14px 24px', textAlign: 'right', color: 'var(--fg-secondary)' }}>£{asset.investmentGBP.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                    <td style={{ padding: '14px 24px', textAlign: 'right', color: asset.roi >= 0 ? 'var(--vu-green)' : 'var(--error)', fontWeight: 600 }}>
                                        {asset.roi !== null ? (asset.roi >= 0 ? '+' : '') + asset.roi.toFixed(1) + '%' : '-'}
                                    </td>
                                </tr>
                            ))}
                            {totalRealisedPnLBrl !== 0 && (
                                <>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                        <td style={{ padding: '14px 24px', fontWeight: 600, color: 'var(--fg-secondary)', textAlign: 'right', fontStyle: 'italic' }}>
                                            Current Holdings Subtotal
                                        </td>
                                        <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 600, fontSize: '0.9rem' }}>
                                            R$ {totalCurrentBrl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </td>
                                        <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 600, fontSize: '0.9rem', color: 'var(--fg-secondary)' }}>
                                            £{totalCurrentGbp.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </td>
                                        <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 600, fontSize: '0.9rem', color: 'var(--fg-secondary)' }}>
                                            £{totalInvestmentGbp.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </td>
                                        <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 600, fontSize: '0.9rem', color: subtotalRoi >= 0 ? 'var(--vu-green)' : 'var(--error)' }}>
                                            {subtotalRoi >= 0 ? '+' : ''}{subtotalRoi.toFixed(1)}%
                                        </td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                        <td colSpan={2} style={{ padding: '14px 24px', fontStyle: 'italic', color: 'var(--fg-secondary)', textAlign: 'right' }}>
                                            Realised P&L
                                        </td>
                                        <td style={{ padding: '14px 24px', textAlign: 'right', color: totalRealisedPnLGbp >= 0 ? 'var(--vu-green)' : 'var(--error)', fontWeight: 600 }}>
                                            {totalRealisedPnLGbp >= 0 ? '+' : ''}£{totalRealisedPnLGbp.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </td>
                                        <td colSpan={2}></td>
                                    </tr>
                                </>
                            )}
                            <tr style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>
                                <td style={{ padding: '14px 24px', fontWeight: 700, fontSize: '1.05rem' }}>Total</td>
                                <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 700, fontSize: '1.05rem' }}>R$ {totalCurrentBrl.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 600, color: 'var(--fg-secondary)' }}>£{totalCurrentGbp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 600, color: 'var(--fg-secondary)' }}>£{totalInvestmentGbp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 700, fontSize: '1.05rem', color: totalRoi >= 0 ? 'var(--vu-green)' : 'var(--error)' }}>
                                    {totalRoi >= 0 ? '+' : ''}{totalRoi.toFixed(1)}%
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>



            {/* SECTION 3: PROPERTIES */}
            <section className="glass-card" style={{ padding: '32px' }}>
                <h2 className="text-gradient" style={{ marginBottom: '24px', fontSize: '1.5rem' }}>Properties</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '32px' }}>
                    {properties.map(prop => {
                        // Dynamic data for Ink Court
                        let currentVal = prop.currentValue;
                        let investment = prop.investment;
                        let taxes = prop.taxes || 0;
                        let activeLedger = prop.ledger;
                        let profitLoss = 0;
                        let isSold = prop.status === 'Sold';
                        let roi = 0;

                        if (prop.id === 'ink-court' && inkCourt) {
                            // Calculate Equity based on Current Value - Mortgage Balance
                            const totalPrincipalPaid = inkCourt.ledger.reduce((sum, t) => sum + (t.principal || 0), 0);
                            const mortgageBalance = (inkCourt.mortgageAmount || 0) - totalPrincipalPaid;
                            const equity = (inkCourt.propertyValue || 0) - mortgageBalance;

                            investment = equity;
                            currentVal = equity;

                            // Calculate Taxes from specific ledger items
                            const taxesTx = inkCourt.ledger.filter(t =>
                                ['Stamp Duty', 'Tinsdills + Management Fees', 'L&G Home Survey'].includes(t.source)
                            );
                            taxes = taxesTx.reduce((sum, t) => sum + t.costs, 0);

                            // P&L is 0 for now as requested
                            profitLoss = 0;

                            // Use Ink Court ledger for display
                            activeLedger = inkCourt.ledger.map(l => ({
                                date: l.month,
                                amount: l.costs,
                                type: l.source,
                                costType: l.notes
                            }));
                        } else if (prop.name.includes('Zara') && airbnb) {
                            // Edifício Zara P&L based on Airbnb ledger
                            investment = 444204;
                            currentVal = 444204;

                            const airbnbRevenue = airbnb.ledger.reduce((sum, t) => sum + calculateMonthAggregates(t).revenue, 0);
                            const airbnbCosts = airbnb.ledger.reduce((sum, t) => sum + calculateMonthAggregates(t).costs, 0);
                            profitLoss = airbnbRevenue - airbnbCosts;
                        } else if (prop.id === 'andyara-2') {
                            investment = 290000;
                            currentVal = 290000;
                            taxes = 0;
                            profitLoss = 500000 - 290000;
                            roi = (profitLoss / investment) * 100;
                        } else {
                            // Standard calculation for other properties
                            if (isSold) {
                                // Hardcoded/Calculated realized profit for sold properties if not in ledger
                                if (prop.name.includes('Andyara 1')) {
                                    investment = 237000;
                                    taxes = 9074;
                                    prop.salePrice = 360000;
                                } else if (prop.name.includes('Montes Claros')) {
                                    investment = 681000;
                                    taxes = 29748;
                                    prop.salePrice = 822920;
                                }
                                profitLoss = (prop.salePrice || 0) - (investment + taxes);
                            } else {
                                profitLoss = currentVal - (investment + taxes); // Unrealized
                            }
                        }

                        const totalCost = investment + taxes;

                        // Recalculate ROI based on the new P&L
                        // For Zara, we want to match the Airbnb section ROI explicitly (Profit / 444204)
                        if (prop.name.includes('Zara')) {
                            roi = (profitLoss / 444204) * 100;
                        } else {
                            roi = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;
                        }

                        const symbol = prop.currency === 'GBP' ? '£' : 'R$';

                        const isExpanded = expandedPropertyId === prop.id;

                        return (
                            <div key={prop.id} id={encodeURIComponent(prop.name)} className="glass-card" style={{ padding: '0', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                {/* Header / Hero */}
                                <div style={{
                                    padding: '24px',
                                    background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                            <div style={{
                                                width: '48px', height: '48px', borderRadius: '12px',
                                                backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '1.5rem'
                                            }}>
                                                🏢
                                            </div>
                                            <div>
                                                <h3 style={{ fontSize: '1.3rem', margin: 0, fontWeight: '600' }}>{prop.name}</h3>
                                                <p style={{ color: 'var(--fg-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                                                    {prop.subtitle || prop.address || (isSold ? 'Prior Investment' : 'Active Portfolio')}
                                                </p>
                                            </div>
                                        </div>
                                        <div style={{
                                            padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold',
                                            backgroundColor: isSold ? 'rgba(234, 179, 8, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                            color: isSold ? '#dac402' : 'var(--accent-color)',
                                            border: `1px solid ${isSold ? 'rgba(234, 179, 8, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                                        }}>
                                            {prop.status.toUpperCase()}
                                        </div>
                                    </div>

                                    {/* Key Metrics Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                                        <div>
                                            <div style={{ color: 'var(--fg-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Investment</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>{symbol} {investment.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--fg-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Taxes & Fees</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>{symbol} {taxes.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--fg-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                                {isSold ? 'Sale Price' : 'Current Value'}
                                            </div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>
                                                {symbol} {(isSold ? prop.salePrice : currentVal).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--fg-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                                {isSold ? 'Realized P/L' : (prop.id === 'zara' ? 'Airbnb P/L' : 'Unrealized P/L')}
                                            </div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: '600', color: profitLoss >= 0 ? 'var(--vu-green)' : 'var(--error)' }}>
                                                {symbol} {Math.abs(profitLoss).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                <span style={{ fontSize: '0.8rem', opacity: 0.8, marginLeft: '6px' }}>
                                                    ({profitLoss >= 0 ? '+' : '-'}{Math.abs(roi).toFixed(1)}%)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Bar */}
                                <div style={{ padding: '12px 24px', display: 'flex', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                                    <button
                                        onClick={() => setExpandedPropertyId(isExpanded ? null : prop.id)}
                                        style={{
                                            background: 'transparent', border: 'none', color: 'var(--fg-secondary)',
                                            cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px',
                                            padding: '8px', width: '100%', justifyContent: 'center', transition: 'color 0.2s'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.color = 'var(--fg-primary)'}
                                        onMouseOut={(e) => e.currentTarget.style.color = 'var(--fg-secondary)'}
                                    >
                                        {isExpanded ? 'Hide Transactions' : 'View Transactions'}
                                        <span style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
                                    </button>
                                </div>

                                {/* Expandable Ledger */}
                                {isExpanded && (
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '24px', backgroundColor: 'rgba(0,0,0,0.1)' }}>
                                        <TransactionLedger
                                            transactions={sortLedger(activeLedger || [], 'date').map(l => ({ ...l, account: prop.name, investment: l.amount, interest: 0, currency: prop.currency }))}
                                            rates={rates}
                                            compact={true}
                                            onDeleteClick={handleDeleteEntry}
                                            hideAccount={true}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* SECTION 4: REAL ESTATE FUNDS */}
            <section className="glass-card" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <h2 className="text-gradient" style={{ margin: 0, fontSize: '1.5rem' }}>Real Estate Funds</h2>
                    <button
                        onClick={handleNewFundBuyClick}
                        className="btn-primary"
                        style={{ fontSize: '0.85rem', padding: '8px 16px', borderRadius: '8px' }}
                    >+ New Fund</button>
                </div>

                {/* Funds Summary Table */}
                <div style={{ marginBottom: '48px' }}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Funds Summary</h3>
                    <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--glass-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                    <th style={{ padding: '16px', color: 'var(--fg-secondary)' }}>Fund</th>
                                    <th style={{ padding: '16px', color: 'var(--fg-secondary)', textAlign: 'right' }}>Quantity</th>
                                    <th style={{ padding: '16px', color: 'var(--fg-secondary)', textAlign: 'right' }}>Value / Share</th>
                                    <th style={{ padding: '16px', color: 'var(--fg-secondary)', textAlign: 'right' }}>Current Value</th>
                                    <th style={{ padding: '16px', color: 'var(--fg-secondary)', textAlign: 'right' }}>Purchase Cost</th>
                                    <th style={{ padding: '16px', color: 'var(--fg-secondary)', textAlign: 'right' }}>Profit/Loss</th>
                                    <th style={{ padding: '16px', color: 'var(--fg-secondary)', textAlign: 'right' }}>ROI %</th>
                                    <th style={{ padding: '16px', color: 'var(--fg-secondary)', textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    // Aggregate transactions by fund
                                    const fundSummary = {};
                                    let grandTotalCurrentValue = 0;
                                    let grandTotalInvestment = 0;

                                    funds.transactions?.forEach(tr => {
                                        const ticker = tr.fund.split(' - ')[1] || tr.fund;
                                        if (!fundSummary[ticker]) {
                                            fundSummary[ticker] = {
                                                fund: tr.fund,
                                                totalQuantity: 0,
                                                totalInvestment: 0
                                            };
                                        }
                                        fundSummary[ticker].totalQuantity += tr.quantity;
                                        fundSummary[ticker].totalInvestment += tr.investment;
                                    });

                                    const rows = Object.entries(fundSummary).map(([ticker, summary]) => {
                                        const holding = funds.holdings.find(h => h.ticker === ticker);
                                        const liveData = marketData[`${ticker}.SA`];
                                        const currentPrice = liveData?.price || holding?.currentPrice || 0;
                                        const currentValue = summary.totalQuantity * currentPrice;
                                        const profitLoss = currentValue - summary.totalInvestment;
                                        const roi = summary.totalInvestment !== 0 ? (profitLoss / summary.totalInvestment) * 100 : 0;

                                        grandTotalCurrentValue += currentValue;
                                        grandTotalInvestment += summary.totalInvestment;

                                        return (
                                            <tr key={ticker} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '12px', color: 'var(--fg-primary)' }}>{summary.fund}</td>
                                                <td style={{ padding: '12px', textAlign: 'right', color: 'var(--fg-primary)' }}>
                                                    {summary.totalQuantity}
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'right', color: 'var(--fg-primary)' }}>
                                                    R$ {currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    {liveData && (
                                                        <span style={{
                                                            fontSize: '0.7rem',
                                                            color: liveData.changePercent >= 0 ? 'var(--vu-green)' : 'var(--error)',
                                                            marginLeft: '6px'
                                                        }}>
                                                            ({liveData.changePercent >= 0 ? '+' : ''}{liveData.changePercent.toFixed(2)}%)
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'right', color: 'var(--fg-primary)' }}>
                                                    R$ {currentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'right', color: 'var(--fg-primary)' }}>
                                                    R$ {summary.totalInvestment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'right', color: profitLoss >= 0 ? 'var(--vu-green)' : 'var(--error)' }}>
                                                    R$ {profitLoss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'right', color: roi >= 0 ? 'var(--vu-green)' : 'var(--error)' }}>
                                                    {roi.toFixed(1)}%
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        <button
                                                            onClick={() => handleFundBuyClick({ fund: summary.fund, ticker, totalQuantity: summary.totalQuantity, totalInvestment: summary.totalInvestment, currentPrice })}
                                                            className="btn-icon"
                                                            style={{
                                                                background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
                                                                color: 'var(--accent-color)', fontWeight: 600
                                                            }}
                                                            onMouseEnter={e => e.target.style.background = 'rgba(16, 185, 129, 0.25)'}
                                                            onMouseLeave={e => e.target.style.background = 'rgba(16, 185, 129, 0.1)'}
                                                        >Buy</button>
                                                        <button
                                                            onClick={() => handleFundSellClick({ fund: summary.fund, ticker, totalQuantity: summary.totalQuantity, totalInvestment: summary.totalInvestment, currentPrice })}
                                                            className="btn-icon"
                                                            style={{
                                                                background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                                                                color: 'var(--error)', fontWeight: 600
                                                            }}
                                                            onMouseEnter={e => e.target.style.background = 'rgba(239, 68, 68, 0.25)'}
                                                            onMouseLeave={e => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
                                                        >Sell</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    });

                                    // Grand Totals
                                    const totalProfitLoss = grandTotalCurrentValue - grandTotalInvestment;
                                    const totalRoi = grandTotalInvestment !== 0 ? (totalProfitLoss / grandTotalInvestment) * 100 : 0;

                                    rows.push(
                                        <tr key="total" style={{ borderTop: '2px solid rgba(255,255,255,0.1)', fontWeight: 'bold', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                            <td style={{ padding: '12px', color: 'var(--fg-primary)' }}>TOTAL</td>
                                            <td style={{ padding: '12px', textAlign: 'right' }}>-</td>
                                            <td style={{ padding: '12px', textAlign: 'right' }}>-</td>
                                            <td style={{ padding: '12px', textAlign: 'right', color: 'var(--fg-primary)' }}>
                                                R$ {grandTotalCurrentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'right', color: 'var(--fg-primary)' }}>
                                                R$ {grandTotalInvestment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'right', color: totalProfitLoss >= 0 ? 'var(--vu-green)' : 'var(--error)' }}>
                                                R$ {totalProfitLoss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'right', color: totalRoi >= 0 ? 'var(--vu-green)' : 'var(--error)' }}>
                                                {totalRoi.toFixed(1)}%
                                            </td>
                                            <td></td>
                                        </tr>
                                    );

                                    return rows;
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Transaction Ledger */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Transaction Ledger</h3>
                            <button
                                onClick={() => setIsFundsLedgerOpen(!isFundsLedgerOpen)}
                                style={{
                                    background: 'transparent', border: 'none', color: 'var(--fg-secondary)',
                                    cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '8px', transition: 'color 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.color = 'var(--fg-primary)'}
                                onMouseOut={(e) => e.currentTarget.style.color = 'var(--fg-secondary)'}
                            >
                                {isFundsLedgerOpen ? 'Hide' : 'Show'}
                                <span style={{ transform: isFundsLedgerOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
                            </button>
                        </div>
                        <button
                            onClick={() => setIsFundsFormOpen(true)}
                            className="btn-primary"
                            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                        >
                            + Add Transaction
                        </button>
                    </div>
                    {isFundsLedgerOpen && (
                        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--glass-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                        <th style={{ padding: '16px', color: 'var(--fg-secondary)' }}>Date</th>
                                        <th style={{ padding: '16px', color: 'var(--fg-secondary)' }}>Fund</th>
                                        <th style={{ padding: '16px', color: 'var(--fg-secondary)', textAlign: 'right' }}>Investment</th>
                                        <th style={{ padding: '16px', color: 'var(--fg-secondary)', textAlign: 'right' }}>Quantity</th>
                                        <th style={{ padding: '16px', color: 'var(--fg-secondary)', textAlign: 'right' }}>Cost / Share</th>
                                        <th style={{ padding: '16px', color: 'var(--fg-secondary)', textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {funds.transactions && funds.transactions
                                        .slice()
                                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                                        .map((tr, idx) => (
                                            <tr key={tr.id || idx} className="funds-ledger-row ledger-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '12px', color: 'var(--fg-primary)' }}>
                                                    {new Date(tr.date).toLocaleDateString('pt-BR')}
                                                </td>
                                                <td style={{ padding: '12px', color: 'var(--fg-primary)' }}>{tr.fund}</td>
                                                <td style={{ padding: '12px', textAlign: 'right', color: tr.investment < 0 ? 'var(--error)' : 'var(--fg-primary)' }}>
                                                    R$ {tr.investment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'right', color: 'var(--fg-primary)' }}>
                                                    {tr.quantity}
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'right', color: 'var(--fg-primary)' }}>
                                                    R$ {(tr.costPerShare || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                                    <div className="funds-actions" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        <button
                                                            onClick={() => handleEditFundTransaction(tr)}
                                                            className="btn-icon btn-edit"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteEntry(tr.id)}
                                                            className="btn-icon btn-delete"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </section>

            {/* Fund Buy Modal */}
            {isFundBuyModalOpen && fundBuyData && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setIsFundBuyModalOpen(false)} />
                    <div className="glass-card" style={{ position: 'relative', zIndex: 1000, padding: '32px', width: '520px', maxWidth: '90vw' }}>
                        <h3 style={{ marginBottom: '8px', fontSize: '1.3rem', color: 'var(--accent-color)' }}>
                            {fundBuyData.ticker ? `Buy More ${fundBuyData.fund}` : 'New Fund Purchase'}
                        </h3>
                        {fundBuyData.ticker && (
                            <p style={{ margin: '0 0 24px', color: 'var(--fg-secondary)', fontSize: '0.9rem' }}>
                                {fundBuyData.ticker} · BRL
                            </p>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
                            {!fundBuyData.ticker && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Search Fund</label>
                                    <AssetSearch onSelect={(selectedAsset) => {
                                        const lp = marketData[selectedAsset.symbol]?.price || '';
                                        setFundBuyData(prev => ({
                                            ...prev,
                                            fund: 'XP - ' + selectedAsset.symbol.replace('.SA', ''),
                                            ticker: selectedAsset.symbol.replace('.SA', ''),
                                            buyPricePerShare: lp,
                                            totalInvestment: lp ? (parseFloat(prev.qtyToBuy) || 0) * lp : 0,
                                        }));
                                    }} />
                                </div>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Date</label>
                                    <input type="date" value={fundBuyData.date} onChange={e => setFundBuyData(prev => ({ ...prev, date: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Quantity</label>
                                    <input type="number" value={fundBuyData.qtyToBuy} onChange={e => updateFundBuyCalc('qtyToBuy', e.target.value)}
                                        placeholder="0" step="any"
                                        style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Buy Price / Share (R$)</label>
                                <input type="number" value={fundBuyData.buyPricePerShare} onChange={e => updateFundBuyCalc('buyPricePerShare', e.target.value)}
                                    placeholder="0.00" step="any"
                                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
                            </div>
                        </div>

                        {/* Total card */}
                        <div className="glass-card" style={{ padding: '16px', marginBottom: '24px', textAlign: 'center' }}>
                            <div style={{ color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>Total Investment</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-color)' }}>
                                R$ {(fundBuyData.totalInvestment || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
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
                        <h3 style={{ marginBottom: '8px', fontSize: '1.3rem', color: 'var(--error)' }}>
                            Sell {fundSellData.fund}
                        </h3>
                        <p style={{ margin: '0 0 24px', color: 'var(--fg-secondary)', fontSize: '0.9rem' }}>
                            {fundSellData.ticker} · BRL · {fundSellData.sharesHeld} shares held
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Date</label>
                                    <input type="date" value={fundSellData.date} onChange={e => setFundSellData(prev => ({ ...prev, date: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Quantity to Sell</label>
                                    <input type="number" value={fundSellData.qtyToSell} onChange={e => updateFundSellCalc('qtyToSell', e.target.value)}
                                        placeholder="0" step="any" max={fundSellData.sharesHeld}
                                        style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Sell Price / Share (R$)</label>
                                <input type="number" value={fundSellData.sellPricePerShare} onChange={e => updateFundSellCalc('sellPricePerShare', e.target.value)}
                                    placeholder="0.00" step="any"
                                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
                            </div>
                        </div>

                        {/* Summary card */}
                        <div className="glass-card" style={{ padding: '16px', marginBottom: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', textAlign: 'center' }}>
                                <div>
                                    <div style={{ color: 'var(--fg-secondary)', fontSize: '0.8rem', marginBottom: '4px' }}>Total Proceeds</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-color)' }}>
                                        R$ {(fundSellData.totalProceeds || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--fg-secondary)', fontSize: '0.8rem', marginBottom: '4px' }}>Cost Basis</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                                        R$ {(fundSellData.avgCost * (parseFloat(fundSellData.qtyToSell) || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--fg-secondary)', fontSize: '0.8rem', marginBottom: '4px' }}>P&L</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: fundSellData.pnl >= 0 ? 'var(--vu-green)' : 'var(--error)' }}>
                                        R$ {(fundSellData.pnl || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        <span style={{ fontSize: '0.75rem', marginLeft: '4px' }}>({(fundSellData.roi || 0).toFixed(1)}%)</span>
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

            {/* SECTION 5: AIRBNB */}
            <section className="glass-card" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 className="text-gradient" style={{ margin: 0, fontSize: '1.5rem' }}>Airbnb Management (Zara)</h2>
                    <button
                        onClick={() => setIsAirbnbFormOpen(true)}
                        className="btn-primary"
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                        + Add Transaction
                    </button>
                </div>

                {/* Summary Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
                    <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ color: 'var(--fg-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Total Costs</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>
                            R$ {airbnb.ledger.reduce((sum, l) => sum + calculateMonthAggregates(l).costs, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ color: 'var(--fg-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Total Revenue</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>
                            R$ {airbnb.ledger.reduce((sum, l) => sum + calculateMonthAggregates(l).revenue, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ color: 'var(--fg-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Total Profit</div>
                        <div style={{
                            fontSize: '1.2rem', fontWeight: '600', color: airbnb.ledger.reduce((sum, l) => {
                                const agg = calculateMonthAggregates(l);
                                return sum + (agg.revenue - agg.costs);
                            }, 0) >= 0 ? 'var(--vu-green)' : 'var(--error)'
                        }}>
                            R$ {airbnb.ledger.reduce((sum, l) => {
                                const agg = calculateMonthAggregates(l);
                                return sum + (agg.revenue - agg.costs);
                            }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ color: 'var(--fg-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Total ROI %</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>
                            {((airbnb.ledger.reduce((sum, l) => {
                                const agg = calculateMonthAggregates(l);
                                return sum + (agg.revenue - agg.costs);
                            }, 0) / 444204) * 100).toFixed(1)}%
                        </div>
                    </div>
                </div>

                {/* Ledger Table */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                    <button
                        onClick={() => setIsAirbnbLedgerOpen(!isAirbnbLedgerOpen)}
                        style={{
                            background: 'transparent', border: 'none', color: 'var(--fg-secondary)',
                            cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px', transition: 'color 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.color = 'var(--fg-primary)'}
                        onMouseOut={(e) => e.currentTarget.style.color = 'var(--fg-secondary)'}
                    >
                        {isAirbnbLedgerOpen ? 'Hide' : 'Show'} Full Ledger
                        <span style={{ transform: isAirbnbLedgerOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
                    </button>
                </div>

                {isAirbnbLedgerOpen && (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', color: 'var(--fg-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleAirbnbSort('month')}>Month{getAirbnbSortIndicator('month')}</th>
                                    <th style={{ padding: '12px', textAlign: 'right', color: 'var(--fg-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleAirbnbSort('costs')}>Costs{getAirbnbSortIndicator('costs')}</th>
                                    <th style={{ padding: '12px', textAlign: 'right', color: 'var(--fg-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleAirbnbSort('revenue')}>Revenue{getAirbnbSortIndicator('revenue')}</th>
                                    <th style={{ padding: '12px', textAlign: 'right', color: 'var(--fg-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleAirbnbSort('profit')}>Profit/Loss{getAirbnbSortIndicator('profit')}</th>
                                    <th style={{ padding: '12px', textAlign: 'right', color: 'var(--fg-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleAirbnbSort('roi')}>ROI %{getAirbnbSortIndicator('roi')}</th>
                                    <th style={{ padding: '12px', textAlign: 'center', color: 'var(--fg-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const enrichedLedger = airbnb.ledger.filter(l => {
                                        const agg = calculateMonthAggregates(l);
                                        return agg.costs > 0 || agg.revenue > 0;
                                    }).map(l => {
                                        const agg = calculateMonthAggregates(l);
                                        const profit = agg.revenue - agg.costs;
                                        const roi = (profit / 444204) * 100;
                                        return { ...l, agg, profit, roi };
                                    });

                                    enrichedLedger.sort((a, b) => {
                                        let valA, valB;
                                        switch (airbnbSortConfig.key) {
                                            case 'costs':
                                                valA = a.agg.costs;
                                                valB = b.agg.costs;
                                                break;
                                            case 'revenue':
                                                valA = a.agg.revenue;
                                                valB = b.agg.revenue;
                                                break;
                                            case 'profit':
                                                valA = a.profit;
                                                valB = b.profit;
                                                break;
                                            case 'roi':
                                                valA = a.roi;
                                                valB = b.roi;
                                                break;
                                            case 'month':
                                            default:
                                                valA = a.month;
                                                valB = b.month;
                                                break;
                                        }

                                        if (valA < valB) return airbnbSortConfig.direction === 'asc' ? -1 : 1;
                                        if (valA > valB) return airbnbSortConfig.direction === 'asc' ? 1 : -1;
                                        return 0;
                                    });

                                    return enrichedLedger.map((entry, idx) => {
                                        const agg = entry.agg;
                                        const profit = entry.profit;
                                        const roi = entry.roi;

                                        return (
                                            <tr key={idx} className="airbnb-ledger-row ledger-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '12px', color: 'var(--fg-primary)' }}>{entry.month}</td>
                                                <td
                                                    style={{ padding: '12px', textAlign: 'right', color: 'var(--fg-primary)', position: 'relative', cursor: 'pointer' }}
                                                    onMouseEnter={() => setHoveredCostMonth(entry.month)}
                                                    onMouseLeave={() => setHoveredCostMonth(null)}
                                                >
                                                    R$ {agg.costs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    {hoveredCostMonth === entry.month && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            bottom: '100%',
                                                            right: '0',
                                                            backgroundColor: 'rgba(30, 41, 59, 0.95)',
                                                            border: '1px solid var(--glass-border)',
                                                            borderRadius: '8px',
                                                            padding: '12px',
                                                            minWidth: '200px',
                                                            zIndex: 1000,
                                                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                                            marginBottom: '8px'
                                                        }}>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', marginBottom: '8px', fontWeight: '600' }}>Cost Breakdown</div>
                                                            {agg.costBreakdown ? (
                                                                Object.entries(agg.costBreakdown).map(([type, amount]) => (
                                                                    <div key={type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                                                                        <span style={{ color: 'var(--fg-secondary)' }}>{type}:</span>
                                                                        <span style={{ color: 'var(--fg-primary)', fontWeight: '500' }}>R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div style={{ fontSize: '0.8rem', color: 'var(--fg-secondary)', fontStyle: 'italic' }}>Breakdown not available</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'right', color: 'var(--accent-color)' }}>
                                                    R$ {agg.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'right', color: profit >= 0 ? 'var(--vu-green)' : 'var(--error)' }}>
                                                    R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'right', color: 'var(--fg-primary)' }}>
                                                    {roi.toFixed(1)}%
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                                    <div className="airbnb-actions" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        <button
                                                            onClick={() => handleEditAirbnbMonth(entry.month)}
                                                            className="btn-icon btn-edit"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteAirbnbMonth(entry.month)}
                                                            className="btn-icon btn-delete"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    });
                                })()}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* SECTION 6: INK COURT MORTGAGE */}
            <section className="glass-card" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 className="text-gradient" style={{ margin: 0, fontSize: '1.5rem' }}>Ink Court (HSBC Mortgage)</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
                    <div className="glass-card" style={{ padding: '16px', borderLeft: '3px solid var(--accent-color)', background: 'rgba(16, 185, 129, 0.05)' }}>
                        <div style={{ color: 'var(--fg-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Current Value (Equity)</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--accent-color)' }}>
                            {(() => {
                                const totalPrincipalPaid = inkCourt.ledger.reduce((s, l) => s + l.principal, 0);
                                const mortgageBalance = inkCourt.mortgageAmount - totalPrincipalPaid;
                                const currentPrice = inkCourt.propertyValue;
                                const equity = currentPrice - mortgageBalance;
                                return `£${Math.max(0, equity).toLocaleString()} `;
                            })()}
                        </div>
                    </div>
                    <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', position: 'relative' }}>
                        <div style={{ color: 'var(--fg-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Property Value</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isEditingPropertyValue ? (
                                <>
                                    <input
                                        type="number"
                                        value={tempPropertyValue}
                                        onChange={(e) => setTempPropertyValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSavePropertyValue();
                                            if (e.key === 'Escape') setIsEditingPropertyValue(false);
                                        }}
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(16, 185, 129, 0.5)',
                                            color: 'white',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            width: '120px',
                                            fontSize: '1rem',
                                            outline: 'none'
                                        }}
                                        autoFocus
                                    />
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                            onClick={handleSavePropertyValue}
                                            style={{
                                                background: 'var(--accent-color)',
                                                border: 'none',
                                                color: '#000',
                                                borderRadius: '4px',
                                                width: '24px',
                                                height: '24px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                fontWeight: 'bold'
                                            }}
                                            title="Accept"
                                        >
                                            ✓
                                        </button>
                                        <button
                                            onClick={() => setIsEditingPropertyValue(false)}
                                            style={{
                                                background: 'rgba(239, 68, 68, 0.2)',
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                color: 'var(--error)',
                                                borderRadius: '4px',
                                                width: '24px',
                                                height: '24px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                fontWeight: 'bold'
                                            }}
                                            title="Cancel"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>£{inkCourt.propertyValue.toLocaleString()}</div>
                                    <button
                                        onClick={() => {
                                            setTempPropertyValue(inkCourt.propertyValue);
                                            setIsEditingPropertyValue(true);
                                        }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--fg-secondary)',
                                            cursor: 'pointer',
                                            padding: '0',
                                            opacity: 0.5,
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                        className="hover-opacity"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ color: 'var(--fg-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Deposit</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>£{inkCourt.deposit.toLocaleString()}</div>
                    </div>
                    <div className="glass-card" style={{
                        padding: '16px',
                        background: 'rgba(139, 92, 246, 0.05)',
                        borderLeft: '3px solid #8b5cf6'
                    }}>
                        <a
                            href="https://themovemarket.com/tools/propertyprices/flat-307-ink-court-419-wick-lane-london-e3-2pw"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'none', display: 'block' }}
                            className="market-value-link"
                        >
                            <div style={{ color: 'var(--fg-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                Market Value (Live)
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            </div>
                            <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#a78bfa' }}>
                                £{(liveMarketValue || inkCourt.marketValue || inkCourt.propertyValue).toLocaleString()}
                            </div>
                            {lastUpdated && (
                                <div style={{ fontSize: '0.65rem', color: 'var(--fg-secondary)', marginTop: '4px' }}>
                                    Updated on {lastUpdated.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            )}
                        </a>
                        <style jsx>{`
                            .market-value-link {
                                transition: opacity 0.2s ease, transform 0.2s ease;
                            }
                            .market-value-link:hover {
                                opacity: 0.8;
                                transform: translateY(-1px);
                            }
                        `}</style>
                    </div>

                    <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ color: 'var(--fg-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Total Investment</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>£{inkCourt.ledger.reduce((s, l) => s + l.costs, 0).toLocaleString()}</div>
                    </div>
                    <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ color: 'var(--fg-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Total Principal Paid</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--accent-color)' }}>£{inkCourt.ledger.reduce((s, l) => s + l.principal, 0).toLocaleString()}</div>
                    </div>
                    <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ color: 'var(--fg-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Mortgage Balance</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--error)' }}>£{(inkCourt.mortgageAmount - inkCourt.ledger.reduce((s, l) => s + l.principal, 0)).toLocaleString()}</div>
                    </div>
                    <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ color: 'var(--fg-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Interest Rate</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>
                            {(() => {
                                const mortgagePayments = inkCourt.ledger.filter(l => l.source === 'Mortgage');
                                if (mortgagePayments.length === 0) return '3.3%';
                                const last = mortgagePayments[mortgagePayments.length - 1];
                                const idx = inkCourt.ledger.indexOf(last);
                                const balanceBefore = inkCourt.mortgageAmount - inkCourt.ledger.slice(0, idx).reduce((s, l) => s + l.principal, 0);
                                const rate = (last.interest / balanceBefore) * 12 * 100;
                                return rate.toFixed(2) + '%';
                            })()}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                    <button
                        onClick={() => setIsMortgageLedgerOpen(!isMortgageLedgerOpen)}
                        style={{
                            background: 'transparent', border: 'none', color: 'var(--fg-secondary)',
                            cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px', transition: 'color 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.color = 'var(--fg-primary)'}
                        onMouseOut={(e) => e.currentTarget.style.color = 'var(--fg-secondary)'}
                    >
                        {isMortgageLedgerOpen ? 'Hide' : 'Show'} Full Ledger
                        <span style={{ transform: isMortgageLedgerOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
                    </button>
                </div>

                {isMortgageLedgerOpen && (
                    <TransactionLedger
                        transactions={sortLedger(inkCourt.ledger, 'month').map(l => ({ ...l, date: l.month, raw_date: l.rawDate, account: 'HSBC', investment: l.costs, interest: l.interest, currency: 'GBP', notes: l.source }))}
                        rates={rates}
                        showPrincipal={true}
                        onAddClick={() => setIsMortgageFormOpen(true)}
                        onDeleteClick={handleDeleteEntry}
                        onEditClick={handleEditInkCourtTransaction}
                        hideAccount={true}
                    />
                )}
            </section>

            {isMortgageFormOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div
                        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
                        onClick={() => setIsMortgageFormOpen(false)}
                    />
                    <MortgageTransactionForm
                        onAdd={handleAddMortgage}
                        onCancel={() => setIsMortgageFormOpen(false)}
                    />
                </div>
            )}

            {isAirbnbFormOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div
                        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
                        onClick={() => setIsAirbnbFormOpen(false)}
                    />
                    <AirbnbTransactionForm
                        onAdd={handleAddAirbnb}
                        onCancel={() => setIsAirbnbFormOpen(false)}
                    />
                </div>
            )}

            {isEditModalOpen && editingMonth && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div
                        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
                        onClick={() => {
                            setIsEditModalOpen(false);
                            setEditingMonth(null);
                        }}
                    />
                    <AirbnbEditModal
                        month={editingMonth}
                        transactions={airbnb.ledger.find(l => l.month === editingMonth)?.transactions || []}
                        onSave={handleSaveTransactions}
                        onCancel={() => {
                            setIsEditModalOpen(false);
                            setEditingMonth(null);
                        }}
                    />
                </div>
            )}

            {isInkCourtEditModalOpen && editingTransaction && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div
                        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
                        onClick={() => {
                            setIsInkCourtEditModalOpen(false);
                            setEditingTransaction(null);
                        }}
                    />
                    <InkCourtEditModal
                        transaction={editingTransaction}
                        onSave={handleSaveInkCourtTransaction}
                        onCancel={() => {
                            setIsInkCourtEditModalOpen(false);
                            setEditingTransaction(null);
                        }}
                    />
                </div>
            )}

            {isFundsEditModalOpen && editingFundTransaction && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div
                        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
                        onClick={() => {
                            setIsFundsEditModalOpen(false);
                            setEditingFundTransaction(null);
                        }}
                    />
                    <FundsEditModal
                        transaction={editingFundTransaction}
                        onSave={handleSaveFundTransaction}
                        onCancel={() => {
                            setIsFundsEditModalOpen(false);
                            setEditingFundTransaction(null);
                        }}
                    />
                </div>
            )}

            {isFundsFormOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div
                        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
                        onClick={() => setIsFundsFormOpen(false)}
                    />
                    <FundsTransactionForm
                        onSubmit={async (transaction) => {
                            try {
                                const newTransaction = {
                                    ...transaction,
                                    id: Date.now()
                                };

                                // For now, we'll reuse the handleSaveFundTransaction logic but identifying it as a new transaction
                                // actually, handleSaveFundTransaction is for PUT (updates). We need a POST or similar.
                                // Let's check handleSaveFundTransaction implementation first or just create a new handler.
                                // Looking at the code, I should probably reuse the POST endpoint used for other things or create a specific one.
                                // Actually, let's look at how handleSaveFundTransaction is implemented.
                                // I'll implement a specific handler here for clarity.

                                const response = await fetch('/api/real-estate', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        section: 'funds',
                                        transaction: newTransaction
                                    })
                                });

                                if (response.ok) {
                                    setIsFundsFormOpen(false);
                                    onRefresh();
                                } else {
                                    console.error('Failed to save transaction');
                                }
                            } catch (error) {
                                console.error('Error saving transaction:', error);
                            }
                        }}
                        onCancel={() => setIsFundsFormOpen(false)}
                    />
                </div>
            )}

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                title="Confirm Deletion"
                message={monthToDelete
                    ? `Are you sure you want to delete all transactions for ${monthToDelete} ? This action cannot be undone.`
                    : "Are you sure you want to delete this transaction? This action cannot be undone."}
                onConfirm={monthToDelete ? confirmDeleteAirbnbMonth : confirmDelete}
                onCancel={() => {
                    setIsDeleteModalOpen(false);
                    setIdToDelete(null);
                    setMonthToDelete(null);
                }}
            />
        </div>
    );
}
