import React, { useState, useEffect } from 'react';
import ConfirmationModal from './ConfirmationModal';
import AssetSearch from './AssetSearch';
import { formatCurrency } from '@/lib/currency';

// No more ASSET_TICKER_MAP - tickers are stored directly on transactions

const BROKER_CURRENCY = {
    'Trading 212': 'GBP', 'XP': 'BRL', 'Amazon': 'USD', 'GGF': 'USD', 'Green Gold Farms': 'USD', 'Monzo': 'GBP', 'Fidelity': 'GBP'
};

export default function EquityTab({ marketData, rates, onRefresh }) {
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [ledgerOpen, setLedgerOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [trToDelete, setTrToDelete] = useState(null);
    const [editingTr, setEditingTr] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSellModalOpen, setIsSellModalOpen] = useState(false);
    const [sellData, setSellData] = useState(null);
    const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
    const [buyData, setBuyData] = useState(null);

    useEffect(() => { fetchTransactions(); }, []);

    const fetchTransactions = async () => {
        try {
            const res = await fetch('/api/equity-transactions');
            const data = await res.json();
            setTransactions(data);
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    const handleDeleteClick = (id) => { setTrToDelete(id); setIsDeleteModalOpen(true); };
    const handleConfirmDelete = async () => {
        if (!trToDelete) return;
        try {
            await fetch(`/api/equity-transactions?id=${trToDelete}`, { method: 'DELETE' });
            setTransactions(prev => prev.filter(t => t.id !== trToDelete));
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
                investment: parseFloat(editingTr.investment) || 0,
                quantity: parseFloat(editingTr.quantity) || 0,
                costPerShare: parseFloat(editingTr.costPerShare) || 0,
                pnl: editingTr.pnl ? parseFloat(editingTr.pnl) : null,
                roiPercent: editingTr.roiPercent ? parseFloat(editingTr.roiPercent) : null,
            };
            await fetch('/api/equity-transactions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            setTransactions(prev => prev.map(t => t.id === payload.id ? payload : t));
            setIsEditModalOpen(false); setEditingTr(null);
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
            date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        });
        setIsSellModalOpen(true);
    };

    const updateSellCalc = (field, value) => {
        setSellData(prev => {
            const updated = { ...prev, [field]: value };
            const qty = parseFloat(updated.qtyToSell) || 0;
            const price = parseFloat(updated.sellPricePerShare) || 0;
            const avgCost = prev.avgCost;
            const costBasis = avgCost * qty;
            updated.totalProceeds = price * qty;
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
                const saved = await res.json();
                setTransactions(prev => [...prev, saved]);
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
            date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        });
        setIsBuyModalOpen(true);
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
            date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        });
        setIsBuyModalOpen(true);
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
        };
        try {
            const res = await fetch('/api/equity-transactions', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tr)
            });
            if (res.ok) {
                const saved = await res.json();
                setTransactions(prev => [...prev, saved]);
                setIsBuyModalOpen(false); setBuyData(null);
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

        // Filter out fully sold positions (qty ≈ 0)
        const activeHoldings = Object.values(holdings).filter(h => Math.abs(h.qty) > 0.01);
        return { activeHoldings, lockedPnL };
    };

    const { activeHoldings, lockedPnL } = computeHoldings();

    // Group by broker
    const brokers = ['Trading 212', 'XP', 'Amazon', 'Green Gold Farms', 'Monzo'];
    const brokerGroups = {};
    brokers.forEach(b => { brokerGroups[b] = activeHoldings.filter(h => h.broker === b); });

    const getLivePrice = (ticker, assetName) => {
        // Cash is always worth 1.00 in its currency
        if (assetName === 'Cash') return 1.0;
        // Monzo is private equity, updated manually
        if (assetName === 'Monzo - Equity') return 14.41;
        if (!ticker || !marketData[ticker]) return null;
        return marketData[ticker].price;
    };

    const renderBrokerTable = (brokerName, items) => {
        if (items.length === 0 && (!lockedPnL[brokerName] || lockedPnL[brokerName] === 0)) return null;
        const cur = BROKER_CURRENCY[brokerName] || 'GBP';

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
                            <th style={thStyle}>Ticker</th>
                            <th style={thStyle}>Asset</th>
                            <th style={thStyle}>Shares</th>
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
                                <tr key={r.asset} style={rowStyle}>
                                    <td style={{ padding: '14px 24px', fontWeight: 600, color: 'var(--fg-secondary)', fontSize: '0.8rem' }}>
                                        {r.ticker || '-'}
                                    </td>
                                    <td style={{ padding: '14px 24px', fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>
                                        {r.asset}
                                    </td>
                                    <td style={{ padding: '14px 24px' }}>{Math.abs(r.qty).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                    <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                                        {r.livePrice ? formatCurrency(r.livePrice, cur) : <span style={{ color: 'var(--fg-secondary)', fontSize: '0.8rem' }}>N/A</span>}
                                    </td>
                                    <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 600 }}>
                                        {formatCurrency(r.currentValue, cur)}
                                    </td>
                                    <td style={{ padding: '14px 24px', textAlign: 'right', color: 'var(--fg-secondary)' }}>
                                        {formatCurrency(r.totalCost, cur)}
                                    </td>
                                    <td style={{ padding: '14px 24px', textAlign: 'right', color: r.pnl >= 0 ? 'var(--accent-color)' : 'var(--error)' }}>
                                        {r.pnl >= 0 ? '+' : ''}{formatCurrency(r.pnl, cur)}
                                    </td>
                                    <td style={{ padding: '14px 24px', textAlign: 'right', color: r.roi >= 0 ? 'var(--accent-color)' : 'var(--error)' }}>
                                        {r.roi >= 0 ? '+' : ''}{r.roi.toFixed(1)}%
                                    </td>
                                    <td style={{ padding: '14px 24px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <button
                                                onClick={() => handleBuyClick(r)}
                                                className="btn-icon"
                                                style={{
                                                    background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
                                                    color: 'var(--accent-color)', fontWeight: 600
                                                }}
                                            >Buy</button>
                                            <button
                                                onClick={() => handleSellClick(r)}
                                                className="btn-icon"
                                                style={{
                                                    background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                                                    color: 'var(--error)', fontWeight: 600
                                                }}
                                            >Sell</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {lockedPnL[brokerName] && lockedPnL[brokerName] !== 0 ? (
                            <>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                    <td colSpan={4} style={{ padding: '14px 24px', fontWeight: 600, color: 'var(--fg-secondary)', textAlign: 'right', fontStyle: 'italic' }}>
                                        Current Holdings Subtotal
                                    </td>
                                    <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 600, fontSize: '0.9rem' }}>
                                        {formatCurrency(totalCurrentValue, cur)}
                                    </td>
                                    <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 600, fontSize: '0.9rem', color: 'var(--fg-secondary)' }}>
                                        {formatCurrency(totalPurchasePrice, cur)}
                                    </td>
                                    <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 600, fontSize: '0.9rem', color: (totalCurrentValue - totalPurchasePrice) >= 0 ? 'var(--accent-color)' : 'var(--error)' }}>
                                        {(totalCurrentValue - totalPurchasePrice) >= 0 ? '+' : ''}{formatCurrency(totalCurrentValue - totalPurchasePrice, cur)}
                                    </td>
                                    <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 600, fontSize: '0.9rem', color: (totalPurchasePrice !== 0 ? ((totalCurrentValue - totalPurchasePrice) / totalPurchasePrice * 100) : 0) >= 0 ? 'var(--accent-color)' : 'var(--error)' }}>
                                        {(totalPurchasePrice !== 0 ? ((totalCurrentValue - totalPurchasePrice) / totalPurchasePrice * 100) : 0) >= 0 ? '+' : ''}{(totalPurchasePrice !== 0 ? ((totalCurrentValue - totalPurchasePrice) / totalPurchasePrice * 100) : 0).toFixed(1)}%
                                    </td>
                                    <td></td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                    <td colSpan={6} style={{ padding: '14px 24px', fontStyle: 'italic', color: 'var(--fg-secondary)', textAlign: 'right' }}>
                                        Realised P&L
                                    </td>
                                    <td style={{ padding: '14px 24px', textAlign: 'right', color: lockedPnL[brokerName] >= 0 ? 'var(--accent-color)' : 'var(--error)', fontWeight: 600 }}>
                                        {lockedPnL[brokerName] >= 0 ? '+' : ''}{formatCurrency(lockedPnL[brokerName], cur)}
                                    </td>
                                    <td colSpan={2}></td>
                                </tr>
                            </>
                        ) : null}
                        <tr style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                            <td colSpan={4} style={{ padding: '14px 24px', fontWeight: 700, textAlign: 'right' }}>Total</td>
                            <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 700 }}>
                                {formatCurrency(totalCurrentValue, cur)}
                            </td>
                            <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 600, color: 'var(--fg-secondary)' }}>
                                {formatCurrency(totalPurchasePrice, cur)}
                            </td>
                            <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 700, color: totalPnL >= 0 ? 'var(--accent-color)' : 'var(--error)' }}>
                                {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL, cur)}
                            </td>
                            <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 700, color: totalROI >= 0 ? 'var(--accent-color)' : 'var(--error)' }}>
                                {totalROI >= 0 ? '+' : ''}{totalROI.toFixed(1)}%
                            </td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    };

    // Consolidated total across all brokers (in GBP)
    const renderConsolidated = () => {
        let totalGBP = 0;
        let totalCostGBP = 0;
        let totalLockedGBP = 0;

        const brokerSummaries = brokers.map(b => {
            const items = brokerGroups[b];
            const cur = BROKER_CURRENCY[b] || 'GBP';
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

            // Convert to GBP
            const toGBP = (amount, currency) => {
                if (currency === 'GBP') return amount;
                if (currency === 'BRL') return amount / rates.BRL;
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
                            <th style={thStyle}>Broker</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Current Value</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Purchase Price</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>P&L</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>ROI %</th>
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

    // Transaction ledger
    const sortedTr = [...transactions].sort((a, b) => {
        const da = a.date.split('/').reverse().join('');
        const db = b.date.split('/').reverse().join('');
        return db.localeCompare(da);
    });

    if (isLoading) {
        return <div style={{ textAlign: 'center', padding: '80px', color: 'var(--fg-secondary)' }}>Loading equity data...</div>;
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 className="text-gradient" style={{ fontSize: '2.2rem', marginBottom: '32px', textAlign: 'center' }}>Equity Portfolio</h2>

            {renderConsolidated()}

            {brokers.map(b => renderBrokerTable(b, brokerGroups[b]))}

            {/* Transaction Ledger */}
            <section style={{ marginTop: '48px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        Transaction Ledger
                        <button
                            onClick={() => setLedgerOpen(!ledgerOpen)}
                            style={{
                                background: 'transparent', border: 'none', color: 'var(--fg-secondary)',
                                cursor: 'pointer', fontSize: '0.9rem', padding: '4px 8px', borderRadius: '4px',
                                transition: 'all 0.2s'
                            }}
                        >
                            {ledgerOpen ? '▲ Hide' : '▼ Show'} ({transactions.length})
                        </button>
                    </h3>
                </div>

                {ledgerOpen && (
                    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                    <th style={thStyle}>Date</th>
                                    <th style={thStyle}>Broker</th>
                                    <th style={thStyle}>Asset</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Investment</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Quantity</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Cost/Share</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>P&L</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>ROI %</th>
                                    <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedTr.map(tr => {
                                    const isSell = tr.investment < 0;
                                    const cur = tr.currency || 'GBP';
                                    return (
                                        <tr key={tr.id} className="ledger-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '12px 16px', fontSize: '0.9rem', color: 'var(--fg-secondary)' }}>{tr.date}</td>
                                            <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--fg-secondary)' }}>{tr.broker}</td>
                                            <td style={{ padding: '12px 16px', fontWeight: 600, color: isSell ? 'var(--error)' : 'var(--accent-color)', fontSize: '0.9rem' }}>
                                                {isSell ? '↓ ' : '↑ '}{tr.asset}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right', color: isSell ? 'var(--error)' : 'inherit' }}>
                                                {formatCurrency(tr.investment, cur)}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                {tr.quantity?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>
                                                {tr.costPerShare ? formatCurrency(tr.costPerShare, cur) : '-'}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right', color: tr.pnl ? (tr.pnl >= 0 ? 'var(--accent-color)' : 'var(--error)') : 'var(--fg-secondary)' }}>
                                                {tr.pnl !== null && tr.pnl !== undefined ? formatCurrency(tr.pnl, cur) : '-'}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right', color: tr.roiPercent ? (tr.roiPercent >= 0 ? 'var(--accent-color)' : 'var(--error)') : 'var(--fg-secondary)' }}>
                                                {tr.roiPercent !== null && tr.roiPercent !== undefined ? `${tr.roiPercent.toFixed(1)}%` : '-'}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    <button
                                                        onClick={() => handleEditClick(tr)}
                                                        className="btn-icon btn-edit"
                                                    >Edit</button>
                                                    <button
                                                        onClick={() => handleDeleteClick(tr.id)}
                                                        className="btn-icon btn-delete"
                                                    >Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                title="Delete Transaction"
                message="Are you sure you want to delete this equity transaction?"
                onConfirm={handleConfirmDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
            />

            {/* Edit Modal */}
            {isEditModalOpen && editingTr && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setIsEditModalOpen(false)} />
                    <div className="glass-card" style={{ position: 'relative', zIndex: 1000, padding: '32px', width: '500px', maxWidth: '90vw' }}>
                        <h3 style={{ marginBottom: '24px', fontSize: '1.3rem' }}>Edit Transaction</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {[['date', 'Date'], ['asset', 'Asset'], ['broker', 'Broker'], ['investment', 'Investment'], ['quantity', 'Quantity'], ['costPerShare', 'Cost/Share'], ['currency', 'Currency'], ['pnl', 'P&L'], ['roiPercent', 'ROI %']].map(([field, label]) => (
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
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
            )}

            {/* Sell Modal */}
            {isSellModalOpen && sellData && (
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
                                <span style={{ color: 'var(--fg-secondary)' }}>{formatCurrency(sellData.avgCost * (parseFloat(sellData.qtyToSell) || 0), sellData.currency)}</span>
                            </div>
                            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 600 }}>P&L</span>
                                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: sellData.pnl >= 0 ? 'var(--accent-color)' : 'var(--error)' }}>
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
            )}

            {/* Buy Modal */}
            {isBuyModalOpen && buyData && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setIsBuyModalOpen(false)} />
                    <div className="glass-card" style={{ position: 'relative', zIndex: 1000, padding: '32px', width: '520px', maxWidth: '90vw' }}>
                        <h3 style={{ marginBottom: '8px', fontSize: '1.3rem', color: 'var(--accent-color)' }}>
                            {buyData.asset ? `Buy More ${buyData.asset}` : 'New Asset Purchase'}
                        </h3>
                        <p style={{ margin: '0 0 24px', color: 'var(--fg-secondary)', fontSize: '0.9rem' }}>
                            {buyData.broker} · {buyData.currency}
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Date</label>
                                    <input type="text" value={buyData.date} onChange={e => setBuyData(prev => ({ ...prev, date: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Asset</label>
                                    {buyData.ticker ? (
                                        <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{buyData.ticker}</span>
                                            <span style={{ color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>{buyData.asset}</span>
                                        </div>
                                    ) : (
                                        <AssetSearch onSelect={(selectedAsset) => {
                                            const lp = marketData[selectedAsset.symbol]?.price || '';
                                            setBuyData(prev => ({
                                                ...prev,
                                                asset: selectedAsset.name,
                                                ticker: selectedAsset.symbol,
                                                buyPricePerShare: lp,
                                                totalInvestment: lp ? (parseFloat(prev.qtyToBuy) || 0) * lp : 0,
                                            }));
                                        }} />
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Quantity</label>
                                    <input type="number" value={buyData.qtyToBuy} onChange={e => updateBuyCalc('qtyToBuy', e.target.value)}
                                        placeholder="0" step="any"
                                        style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Buy Price / Share</label>
                                    <input type="number" value={buyData.buyPricePerShare} onChange={e => updateBuyCalc('buyPricePerShare', e.target.value)}
                                        placeholder="0.00" step="any"
                                        style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                        </div>

                        {/* Total card */}
                        <div style={{ background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--fg-secondary)', fontWeight: 500 }}>Total Investment</span>
                                <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--accent-color)' }}>
                                    {formatCurrency(buyData.totalInvestment, buyData.currency)}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setIsBuyModalOpen(false)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--fg-secondary)', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleBuyConfirm} className="btn-primary" style={{ padding: '10px 20px', borderRadius: '8px' }}>Confirm Purchase</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const thStyle = { padding: '14px 24px', color: 'var(--fg-secondary)', fontSize: '0.85rem', fontWeight: 500 };
