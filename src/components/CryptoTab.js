import { useState, useEffect } from 'react';
import AssetSearch from './AssetSearch';

export default function CryptoTab({ marketData, rates }) {
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal states
    const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
    const [isSellModalOpen, setIsSellModalOpen] = useState(false);
    const [buyData, setBuyData] = useState(null);
    const [sellData, setSellData] = useState(null);
    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);

    // Ledger toggle
    const [ledgerOpen, setLedgerOpen] = useState(false);

    useEffect(() => {
        fetch('/api/crypto-transactions')
            .then(res => res.json())
            .then(data => {
                setTransactions(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error('Failed to load crypto transactions:', err);
                setIsLoading(false);
            });
    }, []);

    const formatCurrency = (val, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(val);
    };

    // Calculate Holdings
    const computeHoldings = () => {
        const holdings = {}; // "ticker" -> { qty, totalCost, netInvestment }
        const lockedPnL = 0; // Aggregate P&L from sells

        // Sort chronologically
        const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

        sorted.forEach(tr => {
            const key = tr.ticker;
            if (!holdings[key]) {
                holdings[key] = {
                    asset: tr.asset || tr.ticker,
                    ticker: tr.ticker,
                    qty: 0,
                    netInvestment: 0,
                    realizedPnL: 0
                };
            }

            // Logic:
            // Buy: +Qty, +Investment
            // Sell: -Qty, -Investment (Proceeds are negative investment)
            // But for P&L tracking, we need Cost Basis.
            // Net Investment approach: 
            // Buy $1000 BTC. Net Inv = 1000. Qty = 0.1.
            // Sell 0.05 BTC for $600. Qty = 0.05. Net Inv = 1000 - 600 = 400.
            // P&L?
            // CSV has explicit "P&L" on Sell rows.
            // If explicit P&L provided, we use it for realized P&L?
            // And we adjust Net Investment?
            // User requested "Equity Tab" logic. 
            // Equity Tab uses Net Investment on the fly.
            // And explicit P&L is summed separately? 
            // Let's stick to Net Investment for Cost Basis display.

            holdings[key].qty += (tr.quantity || 0);
            holdings[key].netInvestment += tr.investment;

            if (tr.pnl) {
                holdings[key].realizedPnL += tr.pnl;
            }

            // Reset if fully sold
            if (Math.abs(holdings[key].qty) < 0.000001) {
                holdings[key].netInvestment = 0;
                holdings[key].qty = 0;
            }
        });

        // Filter active
        // const activeHoldings = Object.values(holdings).filter(h => Math.abs(h.qty) > 0.000001);
        return { holdings };
    };

    const { holdings } = computeHoldings();

    // Calculate Rows with Market Data
    const calculateRows = () => {
        let totalCurrentValue = 0;
        let totalNetInvestment = 0;
        let totalPnL = 0; // Combined Realized + Unrealized

        const allRows = Object.values(holdings).map(h => {
            // Market Data Lookup
            const marketKey = h.ticker.endsWith('-USD') ? h.ticker : h.ticker + '-USD';
            const quote = marketData[marketKey] || marketData[h.ticker];

            let price = 0;
            if (quote) {
                price = quote.price;
            }

            const isClosed = Math.abs(h.qty) < 0.000001;

            const currentValue = price * h.qty;

            // P&L Logic:
            // If Closed: Use accumulated realizedPnL.
            // If Active: Use (CurrentValue - NetInvestment).
            // Note: For active assets, (CV - NetInv) mathematically equals (Unrealized + Realized on those assets).
            const rowPnL = isClosed ? h.realizedPnL : (currentValue - h.netInvestment);

            // ROI
            // If Active: on NetInvestment.
            // If Closed: on what? Maybe 0 or on Cost? (NetInv is 0).
            const roi = (!isClosed && h.netInvestment !== 0) ? (rowPnL / h.netInvestment * 100) : 0;

            // Totals
            if (!isClosed) {
                totalCurrentValue += currentValue;
                totalNetInvestment += h.netInvestment;
            }
            totalPnL += rowPnL;

            return {
                ...h,
                price,
                currentValue,
                pnl: rowPnL,
                roi
            };
        });

        // Filter active for Table
        const rows = allRows.filter(r => Math.abs(r.qty) > 0.000001);

        // Sort by Current Value Descending
        rows.sort((a, b) => b.currentValue - a.currentValue);

        return { rows, totalCurrentValue, totalNetInvestment, totalPnL };
    };

    const { rows, totalCurrentValue, totalNetInvestment, totalPnL } = calculateRows();

    // Remove separate totalUnrealizedPnL logic as calculateRows handles it
    // const totalUnrealizedPnL = ...

    const totalROI = totalNetInvestment !== 0 ? (totalPnL / totalNetInvestment * 100) : 0;


    // --- Handlers ---

    const handleNewBuyClick = () => {
        setBuyData({
            date: new Date().toLocaleDateString('en-GB'),
            ticker: '',
            asset: '',
            currency: 'USD',
            qtyToBuy: '',
            buyPricePerShare: '',
            totalInvestment: 0
        });
        setIsBuyModalOpen(true);
    };

    const handleBuyMore = (item) => {
        setBuyData({
            date: new Date().toLocaleDateString('en-GB'),
            ticker: item.ticker,
            asset: item.asset,
            currency: 'USD',
            qtyToBuy: '',
            buyPricePerShare: item.price || '',
            totalInvestment: 0
        });
        setIsBuyModalOpen(true);
    };

    const handleSellClick = (item) => {
        setSellData({
            ...item,
            date: new Date().toLocaleDateString('en-GB'),
            currency: 'USD',
            qtyToSell: '',
            sellPricePerShare: item.price || '',
            totalProceeds: 0,
            pnl: 0,
            roi: 0
        });
        setIsSellModalOpen(true);
    };

    const handleEditClick = (tr) => {
        setEditData({
            ...tr,
            // Convert YYYY-MM-DD back to DD/MM/YYYY for input
            date: tr.date.split('-').reverse().join('/'),
            // Ensure numbers are strings for inputs if needed, or keep as numbers
            quantity: Math.abs(tr.quantity), // localized? No, raw number
            investment: Math.abs(tr.investment),
            pnl: tr.pnl || 0
        });
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = async (id) => {
        if (!confirm('Are you sure you want to delete this transaction?')) return;
        try {
            const res = await fetch(`/api/crypto-transactions?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setTransactions(prev => prev.filter(t => t.id !== id));
            } else {
                console.error('Failed to delete');
            }
        } catch (e) {
            console.error('Error deleting transaction:', e);
        }
    };

    const updateBuyCalc = (field, val) => {
        setBuyData(prev => {
            const next = { ...prev, [field]: val };
            const q = parseFloat(next.qtyToBuy) || 0;
            const p = parseFloat(next.buyPricePerShare) || 0;
            next.totalInvestment = q * p;
            return next;
        });
    };

    const updateSellCalc = (field, val) => {
        setSellData(prev => {
            const next = { ...prev, [field]: val };
            const q = parseFloat(next.qtyToSell) || 0;
            const p = parseFloat(next.sellPricePerShare) || 0;
            next.totalProceeds = q * p;

            // Est P&L (for this trade)
            // Cost basis per share?
            // Net Investment / Qty? No, that's avg net cost.
            // If we use Avg Net Cost, it might be weird if I took profits earlier.
            // But for simple display:
            const avgCost = prev.qty > 0 ? prev.netInvestment / prev.qty : 0;
            const costBasis = q * avgCost;
            next.pnl = next.totalProceeds - costBasis;
            next.roi = costBasis !== 0 ? (next.pnl / costBasis * 100) : 0;

            return next;
        });
    };

    const handleBuyConfirm = async () => {
        if (!buyData.ticker || !buyData.qtyToBuy || !buyData.totalInvestment) return;

        const newTr = {
            id: `crypto-new-${Date.now()}`,
            date: buyData.date.split('/').reverse().join('-'), // DD/MM/YYYY -> YYYY-MM-DD
            ticker: buyData.ticker,
            asset: buyData.asset,
            type: 'Buy',
            quantity: parseFloat(buyData.qtyToBuy),
            investment: parseFloat(buyData.totalInvestment), // + for Buy
            platform: 'Crypto Wallet',
            pnl: 0,
            isSalaryContribution: buyData.isSalaryContribution || false
        };

        try {
            const res = await fetch('/api/crypto-transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTr)
            });
            if (res.ok) {
                const savedTr = await res.json();
                setTransactions(prev => [...prev, savedTr]);
                setIsBuyModalOpen(false);
            }
        } catch (e) {
            console.error('Failed to save buy:', e);
        }
    };

    const handleSellConfirm = async () => {
        if (!sellData.qtyToSell || !sellData.totalProceeds) return;

        const newTr = {
            id: `crypto-new-${Date.now()}`,
            date: sellData.date.split('/').reverse().join('-'),
            ticker: sellData.ticker,
            asset: sellData.asset,
            type: 'Sell',
            quantity: -Math.abs(parseFloat(sellData.qtyToSell)), // - for Sell
            investment: -Math.abs(parseFloat(sellData.totalProceeds)), // - for Sell (Proceeds)
            platform: 'Crypto Wallet',
            pnl: sellData.pnl // Capture Estimated P&L? Or 0? 
            // CSV has explicit P&L. We should probably store it if possible.
        };

        try {
            const res = await fetch('/api/crypto-transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTr)
            });
            if (res.ok) {
                const savedTr = await res.json();
                setTransactions(prev => [...prev, savedTr]);
                setIsSellModalOpen(false);
            }
        } catch (e) {
            console.error('Failed to save sell:', e);
        }
    };

    const handleEditConfirm = async () => {
        if (!editData) return;

        // Reconstruct transaction object
        // For Edit, user modifies Quantity (Mag), Investment (Mag), P&L.
        // We need to respect Type (Buy/Sell) sign convention when saving.
        // Assuming user edits Magnitude (Positive numbers).

        const type = editData.type;
        const qMag = Math.abs(parseFloat(editData.quantity));
        const iMag = Math.abs(parseFloat(editData.investment));

        const updatedTr = {
            ...editData,
            date: editData.date.split('/').reverse().join('-'),
            quantity: type === 'Sell' ? -qMag : qMag,
            investment: type === 'Sell' ? -iMag : iMag, // Keep logic consistent: Sell has negative investment (proceeds)
            pnl: parseFloat(editData.pnl) || 0
        };

        try {
            const res = await fetch('/api/crypto-transactions', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedTr)
            });

            if (res.ok) {
                setTransactions(prev => prev.map(t => t.id === updatedTr.id ? updatedTr : t));
                setIsEditModalOpen(false);
            }
        } catch (e) {
            console.error('Failed to update transaction:', e);
        }
    };

    // Styling helpers
    const thStyle = { padding: '12px 24px', textAlign: 'left', color: 'var(--fg-secondary)', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.05)' };

    if (isLoading) {
        return <div style={{ textAlign: 'center', padding: '80px', color: 'var(--fg-secondary)' }}>Loading crypto data...</div>;
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 className="text-gradient" style={{ fontSize: '2.2rem', marginBottom: '32px', textAlign: 'center' }}>Crypto Portfolio</h2>

            {/* Consolidated Summary */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '48px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{
                    padding: '20px 24px', borderBottom: '1px solid var(--glass-border)',
                    background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, rgba(255,255,255,0) 100%)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1.5rem' }}>💎</span> Total Portfolio
                    </h3>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--fg-secondary)', marginBottom: '4px' }}>Unrealized Return</div>
                        <div style={{ color: totalPnL >= 0 ? 'var(--accent-color)' : 'var(--error)', fontWeight: 600 }}>
                            {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)} ({totalROI.toFixed(1)}%)
                        </div>
                    </div>
                </div>
                <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
                    <div>
                        <div style={{ color: 'var(--fg-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>Current Value</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>{formatCurrency(totalCurrentValue)}</div>
                    </div>
                    <div>
                        <div style={{ color: 'var(--fg-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>Net Cost Basis</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>{formatCurrency(totalNetInvestment)}</div>
                    </div>
                    <div>
                        <div style={{ color: 'var(--fg-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>Total P&L</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 700, color: totalPnL >= 0 ? 'var(--accent-color)' : 'var(--error)' }}>
                            {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Asset Table */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '24px' }}>
                <div style={{
                    padding: '20px 24px', borderBottom: '1px solid var(--glass-border)',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Assets</h3>
                    <button
                        onClick={handleNewBuyClick}
                        className="btn-primary"
                        style={{ fontSize: '0.8rem', padding: '6px 14px', borderRadius: '6px' }}
                    >+ New Asset</button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                            <th style={thStyle}>Ticker</th>
                            <th style={thStyle}>Asset</th>
                            <th style={thStyle}>Quantity</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Price</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Value</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Net Cost</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>P&L</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>ROI</th>
                            <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(r => (
                            <tr key={r.ticker} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '14px 24px', fontWeight: 600, color: 'var(--fg-secondary)', fontSize: '0.8rem' }}>{r.ticker}</td>
                                <td style={{ padding: '14px 24px', fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{r.asset}</td>
                                <td style={{ padding: '14px 24px' }}>{r.qty.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                                <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                                    {r.price ? formatCurrency(r.price) : <span style={{ color: 'var(--fg-secondary)', fontSize: '0.8rem' }}>N/A</span>}
                                </td>
                                <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(r.currentValue)}</td>
                                <td style={{ padding: '14px 24px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(r.netInvestment)}</td>
                                <td style={{ padding: '14px 24px', textAlign: 'right', color: r.pnl >= 0 ? 'var(--accent-color)' : 'var(--error)' }}>
                                    {r.pnl >= 0 ? '+' : ''}{formatCurrency(r.pnl)}
                                </td>
                                <td style={{ padding: '14px 24px', textAlign: 'right', color: r.roi >= 0 ? 'var(--accent-color)' : 'var(--error)' }}>
                                    {r.roi >= 0 ? '+' : ''}{r.roi.toFixed(1)}%
                                </td>
                                <td style={{ padding: '14px 24px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                        <button onClick={() => handleBuyMore(r)} className="btn-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-color)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>Buy</button>
                                        <button onClick={() => handleSellClick(r)} className="btn-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>Sell</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            {/* Buy Modal */}
            {isBuyModalOpen && buyData && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setIsBuyModalOpen(false)} />
                    <div className="glass-card" style={{ position: 'relative', zIndex: 1000, padding: '32px', width: '520px', maxWidth: '90vw' }}>
                        <h3 style={{ marginBottom: '8px', fontSize: '1.3rem', color: 'var(--accent-color)' }}>
                            {buyData.asset ? `Buy More ${buyData.asset}` : 'New Crypto Purchase'}
                        </h3>
                        {/* Inputs... */}
                        {/* For simplicity, I'm reusing the structure but I'll implement basic inputs here */}
                        <div style={{ display: 'grid', gap: '16px', marginTop: '16px' }}>
                            {!buyData.ticker && (
                                <AssetSearch onSelect={(a) => setBuyData(p => ({ ...p, ticker: a.symbol, asset: a.name }))} />
                            )}
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px' }}>Quantity</label>
                                <input type="number" value={buyData.qtyToBuy} onChange={e => updateBuyCalc('qtyToBuy', e.target.value)} style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px' }}>Price per Coin ($)</label>
                                <input type="number" value={buyData.buyPricePerShare} onChange={e => updateBuyCalc('buyPricePerShare', e.target.value)} style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} />
                            </div>
                            <div>Total: {formatCurrency(buyData.totalInvestment)}</div>
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
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                            <button onClick={() => setIsBuyModalOpen(false)} style={{ padding: '8px 16px', background: 'transparent', color: 'gray', border: 'none', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleBuyConfirm} className="btn-primary" style={{ padding: '8px 16px', borderRadius: '4px' }}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sell Modal */}
            {isSellModalOpen && sellData && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setIsSellModalOpen(false)} />
                    <div className="glass-card" style={{ position: 'relative', zIndex: 1000, padding: '32px', width: '520px', maxWidth: '90vw' }}>
                        <h3 style={{ marginBottom: '8px', fontSize: '1.3rem', color: 'var(--error)' }}>
                            Sell {sellData.asset}
                        </h3>
                        <div style={{ display: 'grid', gap: '16px', marginTop: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px' }}>Quantity to Sell (Max: {sellData.qty})</label>
                                <input type="number" value={sellData.qtyToSell} onChange={e => updateSellCalc('qtyToSell', e.target.value)} style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px' }}>Price per Coin ($)</label>
                                <input type="number" value={sellData.sellPricePerShare} onChange={e => updateSellCalc('sellPricePerShare', e.target.value)} style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} />
                            </div>
                            <div>Proceeds: {formatCurrency(sellData.totalProceeds)}</div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                            <button onClick={() => setIsSellModalOpen(false)} style={{ padding: '8px 16px', background: 'transparent', color: 'gray', border: 'none', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleSellConfirm} style={{ padding: '8px 16px', background: 'var(--error)', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Confirm Sell</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && editData && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setIsEditModalOpen(false)} />
                    <div className="glass-card" style={{ position: 'relative', zIndex: 1000, padding: '32px', width: '520px', maxWidth: '90vw' }}>
                        <h3 style={{ marginBottom: '8px', fontSize: '1.3rem', color: 'var(--fg-primary)' }}>
                            Edit Transaction
                        </h3>
                        <div style={{ display: 'grid', gap: '16px', marginTop: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px' }}>Date (DD/MM/YYYY)</label>
                                <input type="text" value={editData.date} onChange={e => setEditData({ ...editData, date: e.target.value })}
                                    style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px' }}>Ticker</label>
                                <input type="text" value={editData.ticker} readOnly
                                    style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', color: 'var(--fg-secondary)', cursor: 'not-allowed' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px' }}>Type</label>
                                <select value={editData.type} onChange={e => setEditData({ ...editData, type: e.target.value })}
                                    style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}>
                                    <option value="Buy">Buy</option>
                                    <option value="Sell">Sell</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px' }}>Quantity</label>
                                <input type="number" value={editData.quantity} onChange={e => setEditData({ ...editData, quantity: e.target.value })}
                                    style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px' }}>Investment / Proceeds ($)</label>
                                <input type="number" value={editData.investment} onChange={e => setEditData({ ...editData, investment: e.target.value })}
                                    style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px' }}>Realized P&L ($)</label>
                                <input type="number" value={editData.pnl} onChange={e => setEditData({ ...editData, pnl: e.target.value })}
                                    style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} />
                                <small style={{ color: 'var(--fg-secondary)' }}>Leave 0 for Buy unless explicit fee/adjustment</small>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="checkbox"
                                    checked={editData.isSalaryContribution || false}
                                    onChange={e => setEditData({ ...editData, isSalaryContribution: e.target.checked })}
                                    id="edit-salary-contribution"
                                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)' }}
                                />
                                <label htmlFor="edit-salary-contribution" style={{ color: '#fff', fontSize: '0.9rem', cursor: 'pointer' }}>
                                    Funded by Salary Contribution
                                </label>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                            <button onClick={() => setIsEditModalOpen(false)} style={{ padding: '8px 16px', background: 'transparent', color: 'gray', border: 'none', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleEditConfirm} className="btn-primary" style={{ padding: '8px 16px', borderRadius: '4px' }}>Update</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Transaction Ledger */}
            <section style={{ marginTop: '48px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        Transaction Ledger
                        <button onClick={() => setLedgerOpen(!ledgerOpen)} style={{ background: 'transparent', border: 'none', color: 'var(--fg-secondary)', cursor: 'pointer', fontSize: '0.9rem', padding: '4px 8px' }}>
                            {ledgerOpen ? 'Hide' : 'Show'}
                        </button>
                    </h3>
                </div>
                {ledgerOpen && (
                    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                    <th style={thStyle}>Date</th>
                                    <th style={thStyle}>Asset</th>
                                    <th style={thStyle}>Type</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Quantity</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Value ($)</th>
                                    <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...transactions].reverse().map(tr => (
                                    <tr key={tr.id} className="ledger-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '12px 24px', color: 'var(--fg-secondary)' }}>{tr.date}</td>
                                        <td style={{ padding: '12px 24px', fontWeight: 600, color: '#fff' }}>{tr.ticker}</td>
                                        <td style={{ padding: '12px 24px' }}>
                                            <span style={{
                                                padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600,
                                                background: tr.type === 'Buy' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                color: tr.type === 'Buy' ? 'var(--accent-color)' : 'var(--error)'
                                            }}>
                                                {tr.type}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 24px', textAlign: 'right' }}>{Math.abs(tr.quantity)}</td>
                                        <td style={{ padding: '12px 24px', textAlign: 'right' }}>{formatCurrency(Math.abs(tr.investment))}</td>
                                        <td style={{ padding: '12px 24px', textAlign: 'center' }}>
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
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
