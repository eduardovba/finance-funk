import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/currency';
import { normalizeTransactions, parseLedgerCSV, calculateMonthlyIncome, calculateMonthlyInvestments } from '@/lib/ledgerUtils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function GeneralLedgerTab({
    equityTransactions,
    cryptoTransactions,
    pensionTransactions,
    debtTransactions,
    transactions, // Fixed Income
    realEstate,
    rates,
    historicalSnapshots,
    dashboardData,
    onRecordSnapshot
}) {
    const [view, setView] = useState('income'); // 'income', 'investments', 'historicals'
    const [incomeData, setIncomeData] = useState([]);
    const [investmentData, setInvestmentData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fxHistory, setFxHistory] = useState({});
    const [isSnapshotting, setIsSnapshotting] = useState(false);

    useEffect(() => {
        const load = async () => {
            // 1. Load Ledger Data (JSON)
            let historicalIncome = [];
            let historicalInvestments = [];
            try {
                const res = await fetch('/api/ledger-data');
                if (res.ok) {
                    const json = await res.json();
                    if (json.content && json.content.income) {
                        historicalIncome = json.content.income;
                        historicalInvestments = json.content.investments;
                    }
                }
            } catch (e) {
                console.error("Failed to load ledger data", e);
            }

            // 1b. Load FX History
            // ... (keep FX loading)
            let history = {};
            try {
                const fxRes = await fetch('/api/fx-rates');
                if (fxRes.ok) {
                    history = await fxRes.json();
                    setFxHistory(history);
                }
            } catch (e) {
                console.error("Failed to load FX rates", e);
            }

            // 2. Parse CSV - SKIPPED (Data loaded as JSON)
            // const { income: historicalIncome, investments: historicalInvestments } = parseLedgerCSV(csvText);

            // Filter out current month from historical data to force live calculation
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            const filteredHistoricalIncome = historicalIncome.filter(h => h.month !== currentMonth);
            const filteredHistoricalInvestments = historicalInvestments.filter(h => h.month !== currentMonth);

            // 3. Normalize Live Transactions
            const allLive = normalizeTransactions({
                equity: equityTransactions,
                crypto: cryptoTransactions,
                pensions: pensionTransactions,
                debt: debtTransactions,
                fixedIncome: transactions,
                realEstate: realEstate
            }, rates, history); // Pass history here

            // 4. Calculate Combined Metrics (using filtered history)
            // 4. Calculate Combined Metrics (using filtered history)
            const combinedIncome = calculateMonthlyIncome(allLive, realEstate, filteredHistoricalIncome, transactions);
            const combinedInvestments = calculateMonthlyInvestments(allLive, filteredHistoricalInvestments);

            setIncomeData(combinedIncome);
            setInvestmentData(combinedInvestments);
            setLoading(false);
        };

        load();
    }, [equityTransactions, cryptoTransactions, pensionTransactions, debtTransactions, transactions, realEstate]);

    const handleSnapshotClick = async () => {
        if (confirm('Are you sure you want to record a snapshot for the current month? This will overwrite any existing snapshot for this month.')) {
            setIsSnapshotting(true);
            await onRecordSnapshot();
            setIsSnapshotting(false);
        }
    };

    // Prepare Live Snapshot for Historicals View
    const getCombinedSnapshots = () => {
        if (!dashboardData) return historicalSnapshots;

        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Create Live Snapshot Object
        const liveSnapshot = {
            month: currentMonth,
            totalminuspensionsBRL: dashboardData.netWorth.amount - (dashboardData.categories.find(c => c.id === 'pensions')?.assets.find(a => a.isTotal)?.brl || 0),
            totalminuspensionsGBP: (dashboardData.netWorth.amount - (dashboardData.categories.find(c => c.id === 'pensions')?.assets.find(a => a.isTotal)?.brl || 0)) / rates.BRL,
            totalminuspensionsUSD: ((dashboardData.netWorth.amount - (dashboardData.categories.find(c => c.id === 'pensions')?.assets.find(a => a.isTotal)?.brl || 0)) / rates.BRL) * rates.USD,
            networthBRL: dashboardData.netWorth.amount,
            networthGBP: dashboardData.netWorth.amount / rates.BRL,
            roi: dashboardData.netWorth.percentage,
            categories: {
                FixedIncome: dashboardData.categories.find(c => c.id === 'fixed-income')?.assets.find(a => a.isTotal)?.brl || 0,
                Equity: dashboardData.categories.find(c => c.id === 'equity')?.assets.find(a => a.isTotal)?.brl || 0,
                RealEstate: dashboardData.categories.find(c => c.id === 'real-estate')?.assets.find(a => a.isTotal)?.brl || 0,
                Crypto: dashboardData.categories.find(c => c.id === 'crypto')?.assets.find(a => a.isTotal)?.brl || 0,
                Pensions: dashboardData.categories.find(c => c.id === 'pensions')?.assets.find(a => a.isTotal)?.brl || 0,
                Debt: dashboardData.categories.find(c => c.id === 'debt')?.assets.find(a => a.isTotal)?.brl || 0
            },
            isLive: true
        };

        // Filter out existing partial snapshot for current month and append live one
        const filtered = historicalSnapshots.filter(s => s.month !== currentMonth);
        return [...filtered, liveSnapshot].sort((a, b) => a.month.localeCompare(b.month)); // Sort might be redundant if we just append to end, but safer
    };

    const combinedSnapshots = getCombinedSnapshots();
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const highlightStyle = { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderBottom: '1px solid rgba(16, 185, 129, 0.2)' };

    if (loading) return <div style={{ padding: '32px', color: 'var(--fg-secondary)' }}>Loading ledger data...</div>;

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="glass-card" style={{ padding: '12px', border: '1px solid var(--glass-border)' }}>
                    <p style={{ fontWeight: 600, color: 'var(--fg-primary)', marginBottom: '8px' }}>{label}</p>
                    {payload.map((p, index) => (
                        <div key={index} style={{ color: p.color, fontSize: '0.9rem', marginBottom: '4px' }}>
                            {p.name}: {formatCurrency(p.value, 'GBP')}
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h2 className="text-gradient" style={{ fontSize: '2rem' }}>General Ledger</h2>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div className="glass-card" style={{ padding: '4px', display: 'flex', gap: '4px', borderRadius: '12px' }}>
                        <button
                            onClick={() => setView('income')}
                            style={{
                                padding: '8px 24px',
                                borderRadius: '8px',
                                border: 'none',
                                background: view === 'income' ? 'var(--accent-color)' : 'transparent',
                                color: view === 'income' ? '#fff' : 'var(--fg-secondary)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Income
                        </button>
                        <button
                            onClick={() => setView('investments')}
                            style={{
                                padding: '8px 24px',
                                borderRadius: '8px',
                                border: 'none',
                                background: view === 'investments' ? 'var(--accent-color)' : 'transparent',
                                color: view === 'investments' ? '#fff' : 'var(--fg-secondary)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Investments
                        </button>
                        <button
                            onClick={() => setView('historicals')}
                            style={{
                                padding: '8px 24px',
                                borderRadius: '8px',
                                border: 'none',
                                background: view === 'historicals' ? 'var(--accent-color)' : 'transparent',
                                color: view === 'historicals' ? '#fff' : 'var(--fg-secondary)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Totals
                        </button>
                    </div>

                    {onRecordSnapshot && (
                        <button
                            onClick={handleSnapshotClick}
                            className="btn-primary"
                            disabled={isSnapshotting}
                            style={{ padding: '8px 16px', fontSize: '0.9rem', height: '44px', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <span>📷</span> {isSnapshotting ? 'Saving...' : 'Record Snapshot'}
                        </button>
                    )}
                </div>
            </header>

            {view === 'income' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                    {/* Chart */}
                    <div className="glass-card">
                        <h3 style={{ marginBottom: '24px', fontSize: '1.2rem' }}>Monthly Income (Salary, Real Estate, Equity, Interest)</h3>
                        <div style={{ height: '400px', width: '100%' }}>
                            <ResponsiveContainer>
                                <BarChart data={[...incomeData].reverse()}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                    <XAxis dataKey="month" stroke="var(--fg-secondary)" tick={{ fill: 'var(--fg-secondary)' }} />
                                    <YAxis stroke="var(--fg-secondary)" tick={{ fill: 'var(--fg-secondary)' }} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                    <Legend />
                                    <Bar dataKey="salary" name="Salary Contributions" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                                    <Bar dataKey="realEstate" name="Real Estate" stackId="a" fill="#ef4444" />
                                    <Bar dataKey="equity" name="Equity" stackId="a" fill="#8b5cf6" />
                                    <Bar dataKey="fixedIncome" name="Fixed Income Interest" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="glass-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
                                    <th style={{ padding: '16px', textAlign: 'left', color: 'var(--fg-secondary)' }}>Month</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>Salary Con.</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>Real Estate</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>Equity</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>FI Interest</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: '#fff', fontWeight: 700 }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {incomeData.map(d => {
                                    const total = d.salary + d.realEstate + d.equity + d.fixedIncome;
                                    const isLiveRow = d.month === currentMonth;
                                    return (
                                        <tr key={d.month} style={isLiveRow ? highlightStyle : { borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '14px 16px', color: 'var(--fg-primary)', fontWeight: isLiveRow ? 700 : 400 }}>
                                                {d.month} {isLiveRow && <span style={{ fontSize: '0.7rem', background: 'var(--accent-color)', color: '#000', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>LIVE</span>}
                                            </td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(d.salary, 'GBP')}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(d.realEstate, 'GBP')}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(d.equity, 'GBP')}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(d.fixedIncome, 'GBP')}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--accent-color)', fontWeight: 600 }}>{formatCurrency(total, 'GBP')}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: 'rgba(255,255,255,0.05)', fontWeight: 700 }}>
                                    <td style={{ padding: '16px' }}>TOTAL</td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>{formatCurrency(incomeData.reduce((acc, d) => acc + d.salary, 0), 'GBP')}</td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>{formatCurrency(incomeData.reduce((acc, d) => acc + d.realEstate, 0), 'GBP')}</td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>{formatCurrency(incomeData.reduce((acc, d) => acc + d.equity, 0), 'GBP')}</td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>{formatCurrency(incomeData.reduce((acc, d) => acc + d.fixedIncome, 0), 'GBP')}</td>
                                    <td style={{ padding: '16px', textAlign: 'right', color: 'var(--accent-color)' }}>
                                        {formatCurrency(incomeData.reduce((acc, d) => acc + d.salary + d.realEstate + d.equity + d.fixedIncome, 0), 'GBP')}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {view === 'historicals' && (
                <div className="glass-card" style={{ padding: 0, overflowX: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
                                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--fg-secondary)' }}>Month</th>
                                <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>Net Worth (BRL)</th>
                                <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>Net Worth (GBP)</th>
                                <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>Fixed Income</th>
                                <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>Equity</th>
                                <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>Real Estate</th>
                                <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>Crypto</th>
                                <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>Pensions</th>
                                <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>Debt</th>
                                <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>ROI</th>
                                <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>FX GBP BRL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...combinedSnapshots].reverse().map((d, i) => {
                                const impliedRate = d.totalminuspensionsGBP ? d.totalminuspensionsBRL / d.totalminuspensionsGBP : 0;
                                const isLiveRow = d.month === currentMonth;
                                const totalDebt = d.categories?.Debt || 0;
                                return (
                                    <tr key={i} style={isLiveRow ? highlightStyle : { borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '14px 16px', color: 'var(--fg-primary)', fontWeight: isLiveRow ? 700 : 400 }}>
                                            {d.month} {isLiveRow && <span style={{ fontSize: '0.7rem', background: 'var(--accent-color)', color: '#000', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>LIVE</span>}
                                        </td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--accent-color)' }}>{(d.networthBRL || d.totalBRL) ? formatCurrency(d.networthBRL || d.totalBRL, 'BRL') : '-'}</td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', color: '#8b5cf6' }}>{(d.networthGBP || d.totalGBP) ? formatCurrency(d.networthGBP || d.totalGBP, 'GBP') : '-'}</td>

                                        {/* Breakdowns */}
                                        <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(d.categories?.FixedIncome || 0, 'BRL')}</td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(d.categories?.Equity || 0, 'BRL')}</td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(d.categories?.RealEstate || 0, 'BRL')}</td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(d.categories?.Crypto || 0, 'BRL')}</td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(d.categories?.Pensions || 0, 'BRL')}</td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', color: '#ec4899' }}>{formatCurrency(-totalDebt, 'BRL')}</td>

                                        <td style={{ padding: '14px 16px', textAlign: 'right', color: d.roi >= 0 ? 'var(--accent-color)' : '#ef4444' }}>{d.roi ? `${d.roi.toFixed(2)}%` : '-'}</td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{impliedRate ? `R$ ${impliedRate.toFixed(2)}` : '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: 'rgba(255,255,255,0.05)', fontWeight: 700 }}>
                                <td style={{ padding: '16px' }}>AVERAGE</td>
                                <td style={{ padding: '16px', textAlign: 'right' }}>{formatCurrency(combinedSnapshots.reduce((acc, d) => acc + (d.networthBRL || 0), 0) / combinedSnapshots.length, 'BRL')}</td>
                                <td style={{ padding: '16px', textAlign: 'right' }}>{formatCurrency(combinedSnapshots.reduce((acc, d) => acc + (d.networthGBP || 0), 0) / combinedSnapshots.length, 'GBP')}</td>
                                <td style={{ padding: '16px', textAlign: 'right' }}>{formatCurrency(combinedSnapshots.reduce((acc, d) => acc + (d.categories?.FixedIncome || 0), 0) / combinedSnapshots.length, 'BRL')}</td>
                                <td style={{ padding: '16px', textAlign: 'right' }}>{formatCurrency(combinedSnapshots.reduce((acc, d) => acc + (d.categories?.Equity || 0), 0) / combinedSnapshots.length, 'BRL')}</td>
                                <td style={{ padding: '16px', textAlign: 'right' }}>{formatCurrency(combinedSnapshots.reduce((acc, d) => acc + (d.categories?.RealEstate || 0), 0) / combinedSnapshots.length, 'BRL')}</td>
                                <td style={{ padding: '16px', textAlign: 'right' }}>{formatCurrency(combinedSnapshots.reduce((acc, d) => acc + (d.categories?.Crypto || 0), 0) / combinedSnapshots.length, 'BRL')}</td>
                                <td style={{ padding: '16px', textAlign: 'right' }}>{formatCurrency(combinedSnapshots.reduce((acc, d) => acc + (d.categories?.Pensions || 0), 0) / combinedSnapshots.length, 'BRL')}</td>
                                <td style={{ padding: '16px', textAlign: 'right', color: '#ec4899' }}>{formatCurrency(-combinedSnapshots.reduce((acc, d) => acc + (d.categories?.Debt || 0), 0) / combinedSnapshots.length, 'BRL')}</td>
                                <td style={{ padding: '16px', textAlign: 'right' }}>{(combinedSnapshots.reduce((acc, d) => acc + (d.roi || 0), 0) / combinedSnapshots.filter(d => d.roi !== null).length).toFixed(2)}%</td>
                                <td style={{ padding: '16px' }}></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}

            {view === 'investments' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                    {/* Chart */}
                    <div className="glass-card">
                        <h3 style={{ marginBottom: '24px', fontSize: '1.2rem' }}>Monthly Investments (Capital Injection)</h3>
                        <div style={{ height: '400px', width: '100%' }}>
                            <ResponsiveContainer>
                                <BarChart data={[...investmentData].reverse()}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                    <XAxis dataKey="month" stroke="var(--fg-secondary)" tick={{ fill: 'var(--fg-secondary)' }} />
                                    <YAxis stroke="var(--fg-secondary)" tick={{ fill: 'var(--fg-secondary)' }} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                    <Legend />
                                    <Bar dataKey="equity" name="Equity" stackId="a" fill="#3b82f6" />
                                    <Bar dataKey="pensions" name="Pensions" stackId="a" fill="#8b5cf6" />
                                    <Bar dataKey="realEstate" name="Real Estate" stackId="a" fill="#ef4444" />
                                    <Bar dataKey="crypto" name="Crypto" stackId="a" fill="#f59e0b" />
                                    <Bar dataKey="fixedIncome" name="Fixed Income" stackId="a" fill="#10b981" />
                                    <Bar dataKey="debt" name="Debt Repayment" stackId="a" fill="#ec4899" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="glass-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
                                    <th style={{ padding: '16px', textAlign: 'left', color: 'var(--fg-secondary)' }}>Month</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>Equity</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>Pensions</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>Real Estate</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>Crypto</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>Fixed Inc.</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>Debt</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: '#fff', fontWeight: 700 }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {investmentData.map(d => {
                                    const total = d.equity + d.pensions + d.realEstate + d.crypto + d.fixedIncome + d.debt;
                                    const isLiveRow = d.month === currentMonth;
                                    return (
                                        <tr key={d.month} style={isLiveRow ? highlightStyle : { borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '14px 16px', color: 'var(--fg-primary)', fontWeight: isLiveRow ? 700 : 400 }}>
                                                {d.month} {isLiveRow && <span style={{ fontSize: '0.7rem', background: 'var(--accent-color)', color: '#000', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>LIVE</span>}
                                            </td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(d.equity, 'GBP')}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(d.pensions, 'GBP')}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(d.realEstate, 'GBP')}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(d.crypto, 'GBP')}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(d.fixedIncome, 'GBP')}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(d.debt, 'GBP')}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--accent-color)', fontWeight: 600 }}>{formatCurrency(total, 'GBP')}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: 'rgba(255,255,255,0.05)', fontWeight: 700 }}>
                                    <td style={{ padding: '16px' }}>TOTAL</td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>{formatCurrency(investmentData.reduce((acc, d) => acc + d.equity, 0), 'GBP')}</td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>{formatCurrency(investmentData.reduce((acc, d) => acc + d.pensions, 0), 'GBP')}</td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>{formatCurrency(investmentData.reduce((acc, d) => acc + d.realEstate, 0), 'GBP')}</td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>{formatCurrency(investmentData.reduce((acc, d) => acc + d.crypto, 0), 'GBP')}</td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>{formatCurrency(investmentData.reduce((acc, d) => acc + d.fixedIncome, 0), 'GBP')}</td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>{formatCurrency(investmentData.reduce((acc, d) => acc + d.debt, 0), 'GBP')}</td>
                                    <td style={{ padding: '16px', textAlign: 'right', color: 'var(--accent-color)' }}>
                                        {formatCurrency(investmentData.reduce((acc, d) => acc + d.equity + d.pensions + d.realEstate + d.crypto + d.fixedIncome + d.debt, 0), 'GBP')}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
