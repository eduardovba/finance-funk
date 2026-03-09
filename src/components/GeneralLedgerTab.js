import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/currency';
import { normalizeTransactions, parseLedgerCSV, calculateMonthlyIncome, calculateMonthlyInvestments } from '@/lib/ledgerUtils';
import { calculateTWRHistory } from '@/lib/roiUtils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ComposedChart, ReferenceLine, ReferenceArea } from 'recharts';
import ConfirmationModal from './ConfirmationModal';

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
    onRecordSnapshot,
    onRefreshLedger,
    onDeleteSnapshot,
    // Raw data for retroactive calculation
    marketData,
    pensionPrices,
    ledgerData,
    fxHistory: fxHistoryProp,
    assetClasses,
    onSaveAssetClasses,
    appSettings,
    onUpdateAppSettings,
    setIsMonthlyCloseModalOpen
}) {
    const [view, setView] = useState('income'); // 'income', 'investments', 'historicals'
    const [showExtraordinary, setShowExtraordinary] = useState(false);
    const [incomeData, setIncomeData] = useState([]);
    const [investmentData, setInvestmentData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fxHistory, setFxHistory] = useState({});
    const [isSnapshotting, setIsSnapshotting] = useState(false);
    const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);

    // Edit/Delete state
    const [editingRow, setEditingRow] = useState(null); // { type: 'income'|'investments'|'snapshot', month, data }
    const [editForm, setEditForm] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [deleteMonth, setDeleteMonth] = useState(null);
    const [deleteLedgerMonth, setDeleteLedgerMonth] = useState(null);

    const actionBtnStyle = {
        background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem',
        padding: '4px 8px', borderRadius: '6px', transition: 'all 0.2s'
    };

    // Edit handlers
    const handleEditClick = (type, month, data) => {
        setEditingRow({ type, month });
        setEditForm({ ...data });
    };

    const handleEditSave = async () => {
        if (!editingRow) return;
        setIsSaving(true);
        try {
            if (editingRow.type === 'snapshot') {
                // Edit snapshot via POST (upsert)
                const existingSnapshot = historicalSnapshots.find(s => s.month === editingRow.month);
                const updatedSnapshot = {
                    ...existingSnapshot,
                    networthBRL: editForm.networthBRL || 0,
                    networthGBP: editForm.networthGBP || 0,
                    totalminuspensionsBRL: editForm.totalminuspensionsBRL || 0,
                    totalminuspensionsGBP: editForm.totalminuspensionsGBP || 0,
                    categories: {
                        FixedIncome: editForm.FixedIncome || 0,
                        Equity: editForm.Equity || 0,
                        RealEstate: editForm.RealEstate || 0,
                        Crypto: editForm.Crypto || 0,
                        Pensions: editForm.Pensions || 0,
                        Debt: editForm.Debt || 0
                    }
                };
                await fetch('/api/snapshots', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedSnapshot)
                });
                if (onDeleteSnapshot) onDeleteSnapshot(); // triggers refresh
            } else {
                // Edit income or investments via PUT
                await fetch('/api/ledger-data', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        month: editingRow.month,
                        type: editingRow.type,
                        data: editForm
                    })
                });
                if (onRefreshLedger) onRefreshLedger();
            }
        } catch (e) {
            console.error('Failed to save edit:', e);
        } finally {
            setIsSaving(false);
            setEditingRow(null);
            setEditForm({});
        }
    };

    const handleDeleteSnapshot = async () => {
        if (!deleteMonth) return;
        try {
            await fetch(`/api/snapshots?month=${deleteMonth}`, { method: 'DELETE' });
            if (onDeleteSnapshot) onDeleteSnapshot();
        } catch (e) {
            console.error('Failed to delete snapshot:', e);
        } finally {
            setDeleteMonth(null);
        }
    };

    const handleDeleteLedgerData = async () => {
        if (!deleteLedgerMonth) return;
        try {
            await fetch(`/api/ledger-data?month=${deleteLedgerMonth}`, { method: 'DELETE' });
            if (onRefreshLedger) onRefreshLedger();
        } catch (e) {
            console.error('Failed to delete ledger data:', e);
        } finally {
            setDeleteLedgerMonth(null);
        }
    };

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

            // Always filter out current month from historical data so live calculation runs
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            // Save recorded current-month data before filtering
            const recordedCurrentIncome = historicalIncome.find(h => h.month === currentMonth);
            const recordedCurrentInvestments = historicalInvestments.find(h => h.month === currentMonth);

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

            // 4. Calculate Combined Metrics (using filtered history — always live for current month)
            let combinedIncome = calculateMonthlyIncome(allLive, realEstate, filteredHistoricalIncome, transactions);
            let combinedInvestments = calculateMonthlyInvestments(allLive, filteredHistoricalInvestments);

            // 5. If a recorded monthly close exists for current month, add it as a separate historical row
            if (recordedCurrentIncome) {
                const recordedEntry = {
                    month: currentMonth,
                    salary: recordedCurrentIncome.salarySavings || 0,
                    realEstate: recordedCurrentIncome.realEstate || 0,
                    equity: recordedCurrentIncome.equity || 0,
                    fixedIncome: recordedCurrentIncome.fixedIncome || 0,
                    extraordinary: recordedCurrentIncome.extraordinary || 0,
                    total: (recordedCurrentIncome.salarySavings || 0) + (recordedCurrentIncome.realEstate || 0) + (recordedCurrentIncome.equity || 0) + (recordedCurrentIncome.fixedIncome || 0) + (recordedCurrentIncome.extraordinary || 0),
                    isHistorical: true
                };
                // Insert recorded row AFTER the live row for same month (live stays on top)
                const liveIdx = combinedIncome.findIndex(d => d.month === currentMonth);
                if (liveIdx >= 0) {
                    combinedIncome.splice(liveIdx + 1, 0, recordedEntry);
                } else {
                    combinedIncome.unshift(recordedEntry);
                }
            }

            if (recordedCurrentInvestments) {
                const recordedEntry = {
                    month: currentMonth,
                    equity: recordedCurrentInvestments.equity || 0,
                    fixedIncome: recordedCurrentInvestments.fixedIncome || 0,
                    realEstate: recordedCurrentInvestments.realEstate || 0,
                    pensions: recordedCurrentInvestments.pensions || 0,
                    crypto: recordedCurrentInvestments.crypto || 0,
                    debt: recordedCurrentInvestments.debt || 0,
                    total: (recordedCurrentInvestments.equity || 0) + (recordedCurrentInvestments.fixedIncome || 0) + (recordedCurrentInvestments.realEstate || 0) + (recordedCurrentInvestments.pensions || 0) + (recordedCurrentInvestments.crypto || 0) + (recordedCurrentInvestments.debt || 0),
                    isHistorical: true
                };
                // Insert recorded row AFTER the live row for same month (live stays on top)
                const invLiveIdx = combinedInvestments.findIndex(d => d.month === currentMonth);
                if (invLiveIdx >= 0) {
                    combinedInvestments.splice(invLiveIdx + 1, 0, recordedEntry);
                } else {
                    combinedInvestments.unshift(recordedEntry);
                }
            }

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

        // Keep all recorded snapshots (including current month) and always append the live row
        const hasRecordedCurrentMonth = historicalSnapshots.some(s => s.month === currentMonth);
        const allSnapshots = [...historicalSnapshots, liveSnapshot];

        // Recalculate TWR for ALL snapshots to ensure consistency
        const twrMap = calculateTWRHistory(allSnapshots, investmentData, rates);

        return allSnapshots.map(s => ({
            ...s,
            roi: twrMap[s.month] ?? s.roi
        })).sort((a, b) => a.month.localeCompare(b.month));
    };

    const combinedSnapshots = getCombinedSnapshots();
    const twrMapForInvestments = calculateTWRHistory(combinedSnapshots, investmentData, rates);
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const highlightStyle = { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderBottom: '1px solid rgba(16, 185, 129, 0.2)' };

    if (loading) return <div style={{ padding: '32px', color: 'var(--fg-secondary)' }}>Loading ledger data...</div>;

    // Display-only formatters (never touches DB data)
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formatMonthLabel = (isoMonth) => {
        if (!isoMonth || !isoMonth.includes('-')) return isoMonth;
        const [yyyy, mm] = isoMonth.split('-');
        return `${MONTH_NAMES[parseInt(mm, 10) - 1]}/${yyyy.slice(2)}`;
    };
    const formatYAxis = (value) => {
        const rounded = Math.round(value / 5000) * 5000;
        return rounded.toLocaleString('en-GB');
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="glass-card" style={{ padding: '12px', border: '1px solid var(--glass-border)' }}>
                    <p style={{ fontWeight: 600, color: 'var(--fg-primary)', marginBottom: '8px' }}>{formatMonthLabel(label)}</p>
                    {payload.map((p, index) => (
                        <div key={index} style={{ color: p.color, fontSize: '0.9rem', marginBottom: '4px' }}>
                            {p.name}: {p.name === 'Net Monthly Investments' ? formatCurrency(p.value, 'GBP') : formatCurrency(p.value, 'GBP')}
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full max-w-[1800px] mx-auto pb-12">
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
                            onClick={() => setIsMonthlyCloseModalOpen(true)}
                            className="btn-primary"
                            style={{ padding: '8px 16px', fontSize: '0.9rem', height: '44px', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <span>📷</span> Record Monthly Close
                        </button>
                    )}

                    {/* Auto-Close Toggle */}
                    <div className="glass-card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid var(--glass-border)', height: '44px', background: 'rgba(255,255,255,0.02)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Auto Close</span>
                        <div
                            onClick={() => onUpdateAppSettings({ ...appSettings, autoMonthlyCloseEnabled: !appSettings?.autoMonthlyCloseEnabled })}
                            style={{
                                width: '40px',
                                height: '20px',
                                background: appSettings?.autoMonthlyCloseEnabled ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)',
                                borderRadius: '10px',
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <div style={{
                                width: '16px',
                                height: '16px',
                                background: appSettings?.autoMonthlyCloseEnabled ? '#fff' : 'var(--fg-secondary)',
                                borderRadius: '50%',
                                position: 'absolute',
                                top: '2px',
                                left: appSettings?.autoMonthlyCloseEnabled ? '22px' : '2px',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }} />
                        </div>
                    </div>
                </div>
            </header>

            {view === 'income' && (
                <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:items-start w-full">

                    {/* Chart */}
                    <div className="glass-card lg:sticky lg:top-24">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Monthly Income (Salary, Real Estate, Equity, Interest)</h3>

                            {/* Toggle for Extraordinary Income */}
                            <div className="flex items-center gap-3">
                                <span style={{ fontSize: '0.8rem', color: 'var(--fg-secondary)' }}>Include Extraordinary Income</span>
                                <div
                                    onClick={() => setShowExtraordinary(!showExtraordinary)}
                                    style={{
                                        width: '40px',
                                        height: '20px',
                                        background: showExtraordinary ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)',
                                        borderRadius: '10px',
                                        position: 'relative',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <div style={{
                                        width: '16px',
                                        height: '16px',
                                        background: showExtraordinary ? '#fff' : 'var(--fg-secondary)',
                                        borderRadius: '50%',
                                        position: 'absolute',
                                        top: '2px',
                                        left: showExtraordinary ? '22px' : '2px',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }} />
                                </div>
                            </div>
                        </div>
                        <div style={{ height: '400px', width: '100%' }}>
                            <ResponsiveContainer>
                                <BarChart data={[...incomeData].reverse()}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                    <XAxis dataKey="month" stroke="var(--fg-secondary)" tick={{ fill: 'var(--fg-secondary)' }} tickFormatter={formatMonthLabel} />
                                    <YAxis stroke="var(--fg-secondary)" tick={{ fill: 'var(--fg-secondary)' }} tickFormatter={formatYAxis} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                    <Legend />
                                    <Bar dataKey="salary" name="Salary Contributions" stackId="a" fill="#3b82f6" radius={showExtraordinary ? [0, 0, 4, 4] : [0, 0, 4, 4]} />
                                    <Bar dataKey="realEstate" name="Real Estate" stackId="a" fill="#ef4444" />
                                    <Bar dataKey="equity" name="Equity" stackId="a" fill="#8b5cf6" />
                                    <Bar dataKey="fixedIncome" name="Fixed Income Interest" stackId="a" fill="#10b981" radius={showExtraordinary ? [0, 0, 0, 0] : [4, 4, 0, 0]} />
                                    {showExtraordinary && (
                                        <Bar dataKey="extraordinary" name="Extraordinary Income" stackId="a" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                                    )}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="glass-card" style={{ padding: 0, overflowY: 'auto', maxHeight: 'calc(100vh - 12rem)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead className="sticky top-0 z-10" style={{ background: '#121418', backdropFilter: 'blur(10px)' }}>
                                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                    <th style={{ padding: '16px', textAlign: 'left', color: 'var(--fg-secondary)' }}>Month</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>Salary Con.</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>Extraordinary</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>Real Estate</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>Equity</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>FI Interest</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: '#fff', fontWeight: 700 }}>Total</th>
                                    <th style={{ padding: '16px', textAlign: 'center', color: 'var(--fg-secondary)', width: '60px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {incomeData.map(d => {
                                    const total = d.salary + d.extraordinary + d.realEstate + d.equity + d.fixedIncome;
                                    const isLiveRow = d.month === currentMonth && !d.isHistorical;
                                    return (
                                        <tr key={`${d.month}-${d.isHistorical ? 'rec' : 'live'}`} style={isLiveRow ? highlightStyle : { borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '14px 16px', color: 'var(--fg-primary)', fontWeight: isLiveRow ? 700 : 400 }}>
                                                {formatMonthLabel(d.month)} {isLiveRow && <span style={{ fontSize: '0.7rem', background: 'var(--accent-color)', color: '#000', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>LIVE</span>}
                                            </td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(d.salary, 'GBP')}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(d.extraordinary, 'GBP')}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(d.realEstate, 'GBP')}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(d.equity, 'GBP')}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(d.fixedIncome, 'GBP')}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: total >= 0 ? 'var(--vu-green)' : '#ef4444', fontWeight: 600 }}>{formatCurrency(total, 'GBP')}</td>
                                            <td style={{ padding: '14px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                {!isLiveRow && d.isHistorical && (
                                                    <>
                                                        <button onClick={() => handleEditClick('income', d.month, { salarySavings: d.salary, extraordinary: d.extraordinary, realEstate: d.realEstate, equity: d.equity, fixedIncome: d.fixedIncome })} style={{ ...actionBtnStyle, color: 'var(--accent-color)' }} title="Edit">✏️</button>
                                                        <button onClick={() => setDeleteLedgerMonth(d.month)} style={{ ...actionBtnStyle, color: '#ef4444' }} title="Delete">🗑️</button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: 'rgba(255,255,255,0.05)', fontWeight: 700 }}>
                                    <td style={{ padding: '16px' }}>TOTAL</td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>{formatCurrency(incomeData.reduce((acc, d) => acc + d.salary, 0), 'GBP')}</td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>{formatCurrency(incomeData.reduce((acc, d) => acc + (d.extraordinary || 0), 0), 'GBP')}</td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>{formatCurrency(incomeData.reduce((acc, d) => acc + d.realEstate, 0), 'GBP')}</td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>{formatCurrency(incomeData.reduce((acc, d) => acc + d.equity, 0), 'GBP')}</td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>{formatCurrency(incomeData.reduce((acc, d) => acc + d.fixedIncome, 0), 'GBP')}</td>
                                    <td style={{ padding: '16px', textAlign: 'right', color: incomeData.reduce((acc, d) => acc + d.salary + (d.extraordinary || 0) + d.realEstate + d.equity + d.fixedIncome, 0) >= 0 ? 'var(--vu-green)' : '#ef4444' }}>
                                        {formatCurrency(incomeData.reduce((acc, d) => acc + d.salary + (d.extraordinary || 0) + d.realEstate + d.equity + d.fixedIncome, 0), 'GBP')}
                                    </td>
                                    <td style={{ padding: '16px' }}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {view === 'historicals' && (
                <div className="glass-card" style={{ padding: 0, overflowY: 'auto', overflowX: 'auto', maxHeight: 'calc(100vh - 12rem)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead className="sticky top-0 z-10" style={{ background: '#121418', backdropFilter: 'blur(10px)' }}>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
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
                                <th style={{ padding: '16px', textAlign: 'center', color: 'var(--fg-secondary)', width: '80px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...combinedSnapshots].reverse().map((d, i) => {
                                const impliedRate = d.totalminuspensionsGBP ? d.totalminuspensionsBRL / d.totalminuspensionsGBP : 0;
                                const isLiveRow = !!d.isLive;
                                const totalDebt = d.categories?.Debt || 0;
                                return (
                                    <tr key={i} style={isLiveRow ? highlightStyle : { borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '14px 16px', color: 'var(--fg-primary)', fontWeight: isLiveRow ? 700 : 400 }}>
                                            {formatMonthLabel(d.month)} {isLiveRow && <span style={{ fontSize: '0.7rem', background: 'var(--accent-color)', color: '#000', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>LIVE</span>}
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

                                        <td style={{ padding: '14px 16px', textAlign: 'right', color: d.roi >= 0 ? 'var(--vu-green)' : '#ef4444' }}>{d.roi ? `${d.roi.toFixed(2)}%` : '-'}</td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{impliedRate ? `R$ ${impliedRate.toFixed(2)}` : '-'}</td>
                                        <td style={{ padding: '14px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                            {!isLiveRow && !d.isLive && (
                                                <>
                                                    <button onClick={() => handleEditClick('snapshot', d.month, { networthBRL: d.networthBRL || 0, networthGBP: d.networthGBP || 0, totalminuspensionsBRL: d.totalminuspensionsBRL || 0, totalminuspensionsGBP: d.totalminuspensionsGBP || 0, FixedIncome: d.categories?.FixedIncome || 0, Equity: d.categories?.Equity || 0, RealEstate: d.categories?.RealEstate || 0, Crypto: d.categories?.Crypto || 0, Pensions: d.categories?.Pensions || 0, Debt: d.categories?.Debt || 0 })} style={{ ...actionBtnStyle, color: 'var(--accent-color)' }} title="Edit">✏️</button>
                                                    <button onClick={() => setDeleteMonth(d.month)} style={{ ...actionBtnStyle, color: '#ef4444' }} title="Delete">🗑️</button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>

                    </table>
                </div>
            )}

            {view === 'investments' && (
                <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:items-start w-full">

                    {/* Chart */}
                    <div className="glass-card lg:sticky lg:top-24">
                        <h3 style={{ marginBottom: '24px', fontSize: '1.2rem' }}>Monthly Investments (Capital Injection)</h3>
                        <div style={{ height: '400px', width: '100%' }}>
                            <ResponsiveContainer>
                                <ComposedChart data={[...investmentData].reverse()}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                    <XAxis dataKey="month" stroke="var(--fg-secondary)" tick={{ fill: 'var(--fg-secondary)' }} tickFormatter={formatMonthLabel} />
                                    <YAxis stroke="var(--fg-secondary)" tick={{ fill: 'var(--fg-secondary)' }} tickFormatter={formatYAxis} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                    <Legend />
                                    <Bar dataKey="equity" name="Equity" stackId="a" fill="#3b82f6" />
                                    <Bar dataKey="pensions" name="Pensions" stackId="a" fill="#8b5cf6" />
                                    <Bar dataKey="realEstate" name="Real Estate" stackId="a" fill="#ef4444" />
                                    <Bar dataKey="crypto" name="Crypto" stackId="a" fill="#f59e0b" />
                                    <Bar dataKey="fixedIncome" name="Fixed Income" stackId="a" fill="#10b981" />
                                    <Bar dataKey="debt" name="Debt Repayment" stackId="a" fill="#ec4899" radius={[4, 4, 0, 0]} />
                                    <ReferenceArea y1={0} y2={Infinity} fill="rgba(16, 185, 129, 0.15)" />
                                    <ReferenceArea y2={0} y1={-Infinity} fill="rgba(239, 68, 68, 0.15)" />
                                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.4)" strokeWidth={1} />
                                    <Line type="monotone" dataKey="total" name="Net Monthly Investments" stroke="#fff" strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="glass-card" style={{ padding: 0, overflowY: 'auto', maxHeight: 'calc(100vh - 12rem)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead className="sticky top-0 z-10" style={{ background: '#121418', backdropFilter: 'blur(10px)' }}>
                                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                    <th style={{ padding: '16px', textAlign: 'left', color: 'var(--fg-secondary)' }}>Month</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>Equity</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>Pensions</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>Real Estate</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>Crypto</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>Fixed Inc.</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>Debt</th>

                                    <th style={{ padding: '16px', textAlign: 'right', color: '#fff', fontWeight: 700 }}>Total</th>
                                    <th style={{ padding: '16px', textAlign: 'center', color: 'var(--fg-secondary)', width: '60px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {investmentData.map(d => {
                                    const total = d.equity + d.pensions + d.realEstate + d.crypto + d.fixedIncome + d.debt;
                                    const isLiveRow = d.month === currentMonth && !d.isHistorical;
                                    const roi = twrMapForInvestments[d.month];
                                    return (
                                        <tr key={`${d.month}-${d.isHistorical ? 'rec' : 'live'}`} style={isLiveRow ? highlightStyle : { borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '14px 16px', color: 'var(--fg-primary)', fontWeight: isLiveRow ? 700 : 400 }}>
                                                {formatMonthLabel(d.month)} {isLiveRow && <span style={{ fontSize: '0.7rem', background: 'var(--accent-color)', color: '#000', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>LIVE</span>}
                                            </td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(d.equity, 'GBP')}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(d.pensions, 'GBP')}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(d.realEstate, 'GBP')}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(d.crypto, 'GBP')}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(d.fixedIncome, 'GBP')}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(d.debt, 'GBP')}</td>

                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: total >= 0 ? 'var(--vu-green)' : '#ef4444', fontWeight: 600 }}>{formatCurrency(total, 'GBP')}</td>
                                            <td style={{ padding: '14px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                {!isLiveRow && d.isHistorical && (
                                                    <>
                                                        <button onClick={() => handleEditClick('investments', d.month, { equity: d.equity, pensions: d.pensions, realEstate: d.realEstate, crypto: d.crypto, fixedIncome: d.fixedIncome, debt: d.debt })} style={{ ...actionBtnStyle, color: 'var(--accent-color)' }} title="Edit">✏️</button>
                                                        <button onClick={() => setDeleteLedgerMonth(d.month)} style={{ ...actionBtnStyle, color: '#ef4444' }} title="Delete">🗑️</button>
                                                    </>
                                                )}
                                            </td>
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

                                    <td style={{ padding: '16px', textAlign: 'right', color: investmentData.reduce((acc, d) => acc + d.equity + d.pensions + d.realEstate + d.crypto + d.fixedIncome + d.debt, 0) >= 0 ? 'var(--vu-green)' : '#ef4444' }}>
                                        {formatCurrency(investmentData.reduce((acc, d) => acc + d.equity + d.pensions + d.realEstate + d.crypto + d.fixedIncome + d.debt, 0), 'GBP')}
                                    </td>
                                    <td style={{ padding: '16px' }}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}



            {/* Edit Modal */}
            {editingRow && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setEditingRow(null)} />
                    <div className="glass-card" style={{ position: 'relative', zIndex: 1, padding: '32px', width: '90%', maxWidth: '500px', border: '1px solid var(--glass-border)' }}>
                        <h3 className="text-gradient" style={{ marginBottom: '24px' }}>
                            Edit {editingRow.type === 'income' ? 'Income' : editingRow.type === 'investments' ? 'Investments' : 'Snapshot'} — {editingRow.month}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {Object.entries(editForm).map(([key, value]) => (
                                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <label style={{ color: 'var(--fg-secondary)', flex: '0 0 140px', fontSize: '0.9rem', textTransform: 'capitalize' }}>
                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={value}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                                        style={{
                                            flex: 1, padding: '10px 12px', borderRadius: '8px',
                                            border: '1px solid var(--glass-border)',
                                            background: 'rgba(255,255,255,0.05)',
                                            color: 'var(--fg-primary)', fontSize: '0.95rem'
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                            <button onClick={() => setEditingRow(null)} className="btn-secondary" style={{ padding: '10px 20px' }}>Cancel</button>
                            <button onClick={handleEditSave} className="btn-primary" style={{ padding: '10px 20px' }} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal (Snapshots) */}
            <ConfirmationModal
                isOpen={!!deleteMonth}
                title="Delete Snapshot"
                message={`Are you sure you want to delete the snapshot for ${deleteMonth}? This action cannot be undone.`}
                onConfirm={handleDeleteSnapshot}
                onCancel={() => setDeleteMonth(null)}
            />

            {/* Delete Confirmation Modal (Ledger Data) */}
            <ConfirmationModal
                isOpen={!!deleteLedgerMonth}
                title="Delete Ledger Record"
                message={`Are you sure you want to delete the recorded income/investment data for ${deleteLedgerMonth}? This action cannot be undone.`}
                onConfirm={handleDeleteLedgerData}
                onCancel={() => setDeleteLedgerMonth(null)}
            />
        </div>
    );
}
