import React, { useState, useEffect } from 'react';
import ConfirmationModal from './ConfirmationModal';
import { formatCurrency } from '@/lib/currency';
import pensionMap from '../data/pension_fund_map.json';

const BROKER_CURRENCY = {
    'Fidelity': 'GBP',
    'Hargreaves Lansdown': 'GBP',
    'Legal & General': 'GBP',
    'OAB': 'GBP'
};

export default function PensionsTab({ transactions, rates, onRefresh }) {
    const [isLoading, setIsLoading] = useState(false);
    const [ledgerOpen, setLedgerOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [trToDelete, setTrToDelete] = useState(null);
    const [editingTr, setEditingTr] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Simplification: Reuse Sell/Buy modals from EquityTab logic, but adapted
    const [isSellModalOpen, setIsSellModalOpen] = useState(false);
    const [sellData, setSellData] = useState(null);
    const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
    const [buyData, setBuyData] = useState(null);
    const [livePrices, setLivePrices] = useState({});
    const [marketData, setMarketData] = useState({});

    useEffect(() => {
        fetchLivePrices();
        fetchMarketData();
    }, []);

    const fetchMarketData = async () => {
        try {
            const tickers = pensionMap
                .filter(item => item.ticker && item.type === 'market-data')
                .map(item => item.ticker);
            if (tickers.length === 0) return;
            const uniqueTickers = [...new Set(tickers)];
            const res = await fetch('/api/market-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tickers: uniqueTickers })
            });
            if (res.ok) {
                const data = await res.json();
                setMarketData(data);
            }
        } catch (e) { console.error('Error fetching market data:', e); }
    };

    const fetchLivePrices = async () => {
        try {
            const res = await fetch('/api/pension-prices');
            if (res.ok) {
                const data = await res.json();
                setLivePrices(prev => ({ ...prev, ...data }));
            }
            fetch('/api/pension-prices?refresh=true')
                .then(res => res.json())
                .then(data => {
                    setLivePrices(prev => ({ ...prev, ...data }));
                })
                .catch(e => console.error('Error refreshing pension prices:', e));
        } catch (e) { console.error('Error fetching pension prices:', e); }
    };

    const handleDeleteClick = (id) => { setTrToDelete(id); setIsDeleteModalOpen(true); };
    const handleConfirmDelete = async () => {
        if (!trToDelete) return;
        try {
            await fetch(`/api/transactions?id=${trToDelete}`, { method: 'DELETE' });
            if (onRefresh) onRefresh();
            setIsDeleteModalOpen(false); setTrToDelete(null);
        } catch (e) { console.error(e); }
    };

    const handleEditClick = (tr) => { setEditingTr({ ...tr }); setIsEditModalOpen(true); };
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
            };

            await fetch('/api/transactions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (onRefresh) onRefresh();
            setIsEditModalOpen(false); setEditingTr(null);
        } catch (e) { console.error(e); }
    };


    // Sell flow
    const handleSellClick = (holding) => {
        // Simple default price = current value / qty? OR 0
        const price = holding.currentValue && holding.qty ? holding.currentValue / holding.qty : 0;
        setSellData({
            asset: holding.asset,
            broker: holding.broker,
            currency: 'GBP',
            ticker: holding.ticker,
            sharesHeld: holding.qty,
            qtyToSell: holding.qty,
            sellPricePerShare: price,
            totalProceeds: price * holding.qty,
            date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        });
        setIsSellModalOpen(true);
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
            price: price
        };
        try {
            const res = await fetch('/api/transactions', {
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
        setBuyData({
            asset: holding.asset,
            broker: holding.broker,
            currency: 'GBP',
            ticker: holding.ticker,
            qtyToBuy: '',
            buyPricePerShare: '',
            totalInvestment: 0,
            date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            allocationClass: holding.allocationClass || 'Equity' // Default or carry over
        });
        setIsBuyModalOpen(true);
    };

    const handleNewBuyClick = (brokerName) => {
        setBuyData({
            asset: '',
            broker: brokerName,
            currency: 'GBP',
            ticker: '',
            qtyToBuy: '',
            buyPricePerShare: '',
            totalInvestment: 0,
            date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            allocationClass: 'Equity' // Default
        });
        setIsBuyModalOpen(true);
    };

    // Calculate totals for Buy modal
    useEffect(() => {
        if (buyData) {
            const qty = parseFloat(buyData.qtyToBuy) || 0;
            const price = parseFloat(buyData.buyPricePerShare) || 0;
            setBuyData(prev => ({ ...prev, totalInvestment: qty * price }));
        }
    }, [buyData?.qtyToBuy, buyData?.buyPricePerShare]);


    const handleBuyConfirm = async () => {
        if (!buyData || !buyData.asset) return;
        const qty = parseFloat(buyData.qtyToBuy) || 0;
        const price = parseFloat(buyData.buyPricePerShare) || 0;
        if (qty <= 0 || price <= 0) return;

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
                setIsBuyModalOpen(false); setBuyData(null);
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
            const da = a.date ? a.date.split('/').reverse().join('') : '';
            const db = b.date ? b.date.split('/').reverse().join('') : '';
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

    const { activeHoldings, lockedPnL } = computeHoldings();

    const groupBroker = (name) => activeHoldings.filter(h => h.broker === name) || [];
    const brokers_list = ['Fidelity', 'Hargreaves Lansdown', 'Legal & General', 'OAB'];

    const renderBrokerTable = (brokerName, items) => {
        // Ensure Cash row exists
        let rows = [...items];
        if (!rows.find(r => r.asset === 'Cash')) {
            rows.push({ asset: 'Cash', qty: 0, totalCost: 0, broker: brokerName, currentValue: 0, pnl: 0, roi: 0 });
        }

        const cur = BROKER_CURRENCY[brokerName] || 'GBP';

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
            const brokerCur = BROKER_CURRENCY[brokerName] || 'GBP';

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

            return { ...h, currentValue, pnl, roi, valuePerShare };
        });

        // Sort: Cash top, then value desc
        rows.sort((a, b) => {
            if (a.asset === 'Cash') return -1;
            if (b.asset === 'Cash') return 1;
            return (b.currentValue || 0) - (a.currentValue || 0);
        });

        const totalPnL = totalCurrentValue - totalPurchasePrice + (lockedPnL[brokerName] || 0);
        const totalROI = totalPurchasePrice !== 0 ? (totalPnL / totalPurchasePrice * 100) : 0;

        // Styling constants
        const thStyle = { padding: '12px 24px', textAlign: 'left', color: 'var(--fg-secondary)', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.05)' };

        return (
            <div key={brokerName} className="glass-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '24px' }}>
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--glass-border)',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{brokerName}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                            onClick={() => handleNewBuyClick(brokerName)}
                            className="btn-primary"
                            style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem' }}
                        >+ New Asset</button>
                    </div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                            <th style={thStyle}>Asset</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Shares</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Value/Share</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Current Value</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Purchase Price</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>P&L</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>ROI %</th>
                            <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(r => {
                            const isCash = r.asset === 'Cash';
                            const rowStyle = isCash
                                ? { borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(16, 185, 129, 0.1)', fontWeight: 'bold' }
                                : { borderBottom: '1px solid rgba(255,255,255,0.05)' };

                            return (
                                <tr key={r.asset} className="ledger-row" style={rowStyle}>
                                    <td style={{ padding: '14px 24px', fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{r.asset}</td>
                                    <td style={{ padding: '14px 24px', textAlign: 'right' }}>{Math.abs(r.qty).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                    <td style={{ padding: '14px 24px', textAlign: 'right' }}>{formatCurrency(r.valuePerShare, cur)}</td>
                                    <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(r.currentValue, cur)}</td>
                                    <td style={{ padding: '14px 24px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(r.totalCost, cur)}</td>
                                    <td style={{ padding: '14px 24px', textAlign: 'right', color: r.pnl >= 0 ? 'var(--accent-color)' : 'var(--error)' }}>
                                        {r.pnl >= 0 ? '+' : ''}{formatCurrency(r.pnl, cur)}
                                    </td>
                                    <td style={{ padding: '14px 24px', textAlign: 'right', color: r.roi >= 0 ? 'var(--accent-color)' : 'var(--error)' }}>
                                        {r.roi >= 0 ? '+' : ''}{r.roi.toFixed(1)}%
                                    </td>
                                    <td style={{ padding: '14px 24px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <button onClick={() => handleBuyClick(r)} className="btn-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: 'var(--accent-color)' }}>Buy</button>
                                            <button onClick={() => handleSellClick(r)} className="btn-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--error)' }}>Sell</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {/* Subtotal & Locked P&L & Total Rows - Keeping simple for now, can iterate */}
                        <tr style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                            <td colSpan={2} style={{ padding: '14px 24px', fontWeight: 700, textAlign: 'right' }}>Total</td>
                            <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(totalCurrentValue, cur)}</td>
                            <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 600, color: 'var(--fg-secondary)' }}>{formatCurrency(totalPurchasePrice, cur)}</td>
                            <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(totalPnL, cur)}</td>
                            <td></td><td></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    };

    const updateSellCalc = (field, value) => {
        setSellData(prev => {
            const updated = { ...prev, [field]: value };
            const qty = parseFloat(updated.qtyToSell) || 0;
            const price = parseFloat(updated.sellPricePerShare) || 0;
            // For Pensions, avgCost is totalCost / qty
            const avgCost = prev.avgCost; // Passed on init
            const costBasis = avgCost * qty;
            updated.totalProceeds = price * qty;
            // P&L = Proceeds - Cost Basis
            updated.pnl = updated.totalProceeds - costBasis;
            updated.roi = costBasis !== 0 ? (updated.pnl / costBasis * 100) : 0;
            return updated;
        });
    };

    const updateBuyCalc = (field, value) => {
        setBuyData(prev => {
            const updated = { ...prev, [field]: value };
            const qty = parseFloat(updated.qtyToBuy) || 0;
            const price = parseFloat(updated.buyPricePerShare) || 0;
            updated.totalInvestment = qty * price;
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
            const cur = BROKER_CURRENCY[b] || 'GBP';
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

            // Convert Broker Summary to GBP
            const toGBP = (amount, currency) => {
                if (!rates) return amount;
                if (currency === 'GBP') return amount;
                if (currency === 'USD') return amount / rates.USD;
                return amount;
            };

            const cvGBP = toGBP(cv, cur);
            const ppGBP = toGBP(pp, cur);
            const lockedGBP = toGBP(locked, cur);

            totalGBP += cvGBP;
            totalCostGBP += ppGBP;
            totalLockedGBP += lockedGBP;

            const pnl = cvGBP - ppGBP + lockedGBP;
            const roi = ppGBP !== 0 ? (pnl / ppGBP * 100) : 0;

            return { broker: b, currentValue: cvGBP, purchasePrice: ppGBP, pnl, roi };
        });

        const totalPnL = totalGBP - totalCostGBP + totalLockedGBP;
        const totalROI = totalCostGBP !== 0 ? totalPnL / totalCostGBP * 100 : 0;

        return (
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '48px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{
                    padding: '20px 24px', borderBottom: '1px solid var(--glass-border)',
                    background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, rgba(255,255,255,0) 100%)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.3rem' }}>📊 Consolidated Portfolio</h3>
                    <span style={{ color: totalPnL >= 0 ? 'var(--accent-color)' : 'var(--error)', fontWeight: 700, fontSize: '1.1rem' }}>
                        {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL, 'GBP')} ({totalROI.toFixed(1)}%)
                    </span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: '12px 24px', textAlign: 'left', color: 'var(--fg-secondary)', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Broker</th>
                            <th style={{ padding: '12px 24px', textAlign: 'right', color: 'var(--fg-secondary)', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Current Value</th>
                            <th style={{ padding: '12px 24px', textAlign: 'right', color: 'var(--fg-secondary)', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Purchase Price</th>
                            <th style={{ padding: '12px 24px', textAlign: 'right', color: 'var(--fg-secondary)', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>P&L</th>
                            <th style={{ padding: '12px 24px', textAlign: 'right', color: 'var(--fg-secondary)', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>ROI %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {brokerSummaries.map(s => (
                            <tr key={s.broker} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '14px 24px', fontWeight: 600 }}>{s.broker}</td>
                                <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(s.currentValue, 'GBP')}</td>
                                <td style={{ padding: '14px 24px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(s.purchasePrice, 'GBP')}</td>
                                <td style={{ padding: '14px 24px', textAlign: 'right', color: s.pnl >= 0 ? 'var(--accent-color)' : 'var(--error)', fontWeight: 600 }}>
                                    {s.pnl >= 0 ? '+' : ''}{formatCurrency(s.pnl, 'GBP')}
                                </td>
                                <td style={{ padding: '14px 24px', textAlign: 'right', color: s.roi >= 0 ? 'var(--accent-color)' : 'var(--error)' }}>
                                    {s.roi >= 0 ? '+' : ''}{s.roi.toFixed(1)}%
                                </td>
                            </tr>
                        ))}
                        <tr style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>
                            <td style={{ padding: '14px 24px', fontWeight: 700, fontSize: '1.05rem' }}>Total</td>
                            <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 700, fontSize: '1.05rem' }}>{formatCurrency(totalGBP, 'GBP')}</td>
                            <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 600, color: 'var(--fg-secondary)' }}>{formatCurrency(totalCostGBP, 'GBP')}</td>
                            <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 700, fontSize: '1.05rem', color: totalPnL >= 0 ? 'var(--accent-color)' : 'var(--error)' }}>
                                {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL, 'GBP')}
                            </td>
                            <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 700, fontSize: '1.05rem', color: totalROI >= 0 ? 'var(--accent-color)' : 'var(--error)' }}>
                                {totalROI >= 0 ? '+' : ''}{totalROI.toFixed(1)}%
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 className="text-gradient" style={{ fontSize: '2.2rem', marginBottom: '32px', textAlign: 'center' }}>Pension Portfolio</h2>

            {renderConsolidated()}

            {brokers_list.map(b => renderBrokerTable(b, groupBroker(b)))}

            {/* Transaction Ledger */}
            <section style={{ marginTop: '48px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Transaction Ledger ({transactions.length})</h3>
                    <button onClick={() => setLedgerOpen(!ledgerOpen)} style={{ background: 'transparent', border: 'none', color: 'var(--fg-secondary)', cursor: 'pointer' }}>{ledgerOpen ? 'Hide' : 'Show'}</button>
                </div>
                {ledgerOpen && (
                    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                    <th style={{ padding: '12px 16px', color: 'var(--fg-secondary)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Date</th>
                                    <th style={{ padding: '12px 16px', color: 'var(--fg-secondary)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Broker</th>
                                    <th style={{ padding: '12px 16px', color: 'var(--fg-secondary)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Asset</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--fg-secondary)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Value</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--fg-secondary)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...transactions].sort((a, b) => {
                                    const da = a.date ? a.date.split('/').reverse().join('') : '';
                                    const db = b.date ? b.date.split('/').reverse().join('') : '';
                                    return db.localeCompare(da);
                                }).map(tr => (
                                    <tr key={tr.id} className="ledger-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '12px 16px', color: 'var(--fg-secondary)' }}>{tr.date}</td>
                                        <td style={{ padding: '12px 16px', color: 'var(--fg-secondary)' }}>{tr.broker}</td>
                                        <td style={{ padding: '12px 16px', fontWeight: 600, color: tr.type === 'Sell' ? 'var(--error)' : 'var(--accent-color)' }}>{tr.type === 'Sell' ? '↓ ' : '↑ '}{tr.asset}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(parseFloat(tr.value) || 0, 'GBP')}</td>
                                        <td style={{ padding: '12px 24px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button onClick={() => handleEditClick(tr)} className="btn-icon btn-edit">Edit</button>
                                                <button onClick={() => handleDeleteClick(tr.id)} className="btn-icon btn-delete">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>



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
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ color: 'var(--fg-secondary)' }}>Total Proceeds</span>
                                    <span style={{ fontWeight: 600 }}>{formatCurrency(sellData.totalProceeds, sellData.currency)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ color: 'var(--fg-secondary)' }}>Cost Basis</span>
                                    <span style={{ color: 'var(--fg-secondary)' }}>{formatCurrency((sellData.avgCost || 0) * (parseFloat(sellData.qtyToSell) || 0), sellData.currency)}</span>
                                </div>
                                <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 600 }}>P&L</span>
                                    <span style={{ fontWeight: 600, color: (sellData.pnl || 0) >= 0 ? 'var(--accent-color)' : 'var(--error)' }}>
                                        {(sellData.pnl || 0) >= 0 ? '+' : ''}{formatCurrency(sellData.pnl || 0, sellData.currency)}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button onClick={() => setIsSellModalOpen(false)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--fg-secondary)', cursor: 'pointer' }}>Cancel</button>
                                <button onClick={handleSellConfirm} style={{ padding: '10px 20px', background: 'var(--error)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Confirm Sell</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Buy Modal */}
            {
                isBuyModalOpen && buyData && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setIsBuyModalOpen(false)} />
                        <div className="glass-card" style={{ position: 'relative', zIndex: 1000, padding: '32px', width: '520px', maxWidth: '90vw' }}>
                            <h3 style={{ marginBottom: '24px', fontSize: '1.3rem', color: 'var(--accent-color)' }}>Buy Asset</h3>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Broker</label>
                                    <input type="text" value={buyData.broker} readOnly
                                        style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--fg-secondary)', fontSize: '0.95rem', outline: 'none' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Currency</label>
                                    <input type="text" value={buyData.currency} readOnly
                                        style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--fg-secondary)', fontSize: '0.95rem', outline: 'none' }} />
                                </div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Asset Name</label>
                                <input type="text" value={buyData.asset} onChange={e => setBuyData(prev => ({ ...prev, asset: e.target.value }))}
                                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Date</label>
                                    <input type="text" value={buyData.date} onChange={e => setBuyData(prev => ({ ...prev, date: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Ticker (Optional)</label>
                                    <input type="text" value={buyData.ticker} onChange={e => setBuyData(prev => ({ ...prev, ticker: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Quantity</label>
                                    <input type="number" value={buyData.qtyToBuy} onChange={e => updateBuyCalc('qtyToBuy', e.target.value)}
                                        step="any"
                                        style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Price / Share</label>
                                    <input type="number" value={buyData.buyPricePerShare} onChange={e => updateBuyCalc('buyPricePerShare', e.target.value)}
                                        step="any"
                                        style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
                                </div>
                            </div>

                            {/* Summary card */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '1px solid var(--glass-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--fg-secondary)' }}>Total Investment</span>
                                    <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{formatCurrency(buyData.totalInvestment, buyData.currency)}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <input
                                    type="checkbox"
                                    checked={buyData.isSalaryContribution || false}
                                    onChange={e => setBuyData(prev => ({ ...prev, isSalaryContribution: e.target.checked }))}
                                    id="buy-salary-contribution"
                                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)' }}
                                />
                                <label htmlFor="buy-salary-contribution" style={{ color: '#fff', fontSize: '0.9rem', cursor: 'pointer' }}>
                                    Funded by Salary Contribution
                                </label>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button onClick={() => setIsBuyModalOpen(false)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--fg-secondary)', cursor: 'pointer' }}>Cancel</button>
                                <button onClick={handleBuyConfirm} className="btn-primary" style={{ padding: '10px 20px', borderRadius: '8px' }}>Confirm Buy</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Edit Modal */}
            {
                isEditModalOpen && editingTr && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
                        <div className="glass-card" style={{ padding: '32px', width: '500px', maxWidth: '90vw' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {[['date', 'Date'], ['asset', 'Asset'], ['broker', 'Broker'], ['value', 'Value (Cost/Proceeds)'], ['quantity', 'Quantity'], ['price', 'Price'], ['type', 'Type (Buy/Sell)']].map(([field, label]) => (
                                    <div key={field}>
                                        <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>{label}</label>
                                        <input
                                            type="text"
                                            value={editingTr[field] ?? ''}
                                            onChange={e => handleEditChange(field, e.target.value)}
                                            style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', outline: 'none' }}
                                        />
                                    </div>
                                ))}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="checkbox"
                                        checked={editingTr.isSalaryContribution || false}
                                        onChange={e => handleEditChange('isSalaryContribution', e.target.checked)}
                                        id="edit-salary-contribution"
                                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)' }}
                                    />
                                    <label htmlFor="edit-salary-contribution" style={{ color: '#fff', fontSize: '0.9rem', cursor: 'pointer' }}>
                                        Funded by Salary Contribution
                                    </label>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                                <button onClick={() => setIsEditModalOpen(false)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--fg-secondary)', cursor: 'pointer' }}>Cancel</button>
                                <button onClick={handleEditSave} className="btn-primary" style={{ padding: '10px 20px', borderRadius: '8px' }}>Save</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Edit and Delete Modals to be fully implemented or confirmation modal used */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                title="Delete Transaction"
                message="Are you sure you want to delete this pension transaction?"
                onConfirm={handleConfirmDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
            />
        </div >
    );
}
