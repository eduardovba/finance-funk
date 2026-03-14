import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/currency';
import { normalizeTransactions, parseLedgerCSV, calculateMonthlyIncome, calculateMonthlyInvestments } from '@/lib/ledgerUtils';
import { calculateTWRHistory } from '@/lib/roiUtils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ComposedChart, ReferenceLine, ReferenceArea } from 'recharts';
import ConfirmationModal from './ConfirmationModal';
import GlowingIncomePods from './GlowingIncomePods';
import GlowingInvestmentPods from './GlowingInvestmentPods';
import LedgerHeroPods from './LedgerHeroPods';
import forecastActuals from '../data/forecast_actuals.json';
import PageTutorialOverlay from './ftue/PageTutorialOverlay';

const LEDGER_TUTORIAL_STEPS = [
    { type: 'spotlight', targetId: 'ftue-ledger-container', title: 'Income & Investments', message: "The Ledger tracks your monthly income (salary, dividends, rent) and investment flows. They are calculated automatically from transactions.", position: 'bottom' },
    { type: 'spotlight', targetId: 'ftue-ledger-container', title: 'Automatic Tracking', message: "Income from dividends, interest, and rent is calculated automatically from your asset pages \u2014 no double entry needed!", position: 'bottom' },
    { type: 'spotlight', targetId: 'ftue-ledger-container', title: 'Monthly Snapshots', message: "The Totals tab lets you record monthly snapshots and track net worth growth, TWR returns, and MoM changes over time.", position: 'bottom' },
];

export default function GeneralLedgerTab({
    activeTab = 'income',
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
    // Map route tab names to internal view names
    const view = activeTab === 'totals' ? 'historicals' : activeTab;
    const [showExtraordinary, setShowExtraordinary] = useState(false);
    const [showLedgerTable, setShowLedgerTable] = useState(false);
    const [showInvestmentLedgerTable, setShowInvestmentLedgerTable] = useState(false);
    const [showHistoricalsLedger, setShowHistoricalsLedger] = useState(false);
    const [forecastSettings, setForecastSettings] = useState({ targetROI: 10, targetContribution: 12000 });
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

    // Fetch forecast settings for target ROI and contribution
    useEffect(() => {
        const fetchForecastSettings = async () => {
            try {
                const res = await fetch('/api/forecast-settings');
                if (res.ok) {
                    const data = await res.json();
                    setForecastSettings({
                        targetROI: data.annualInterestRate || 10,
                        targetContribution: data.monthlyContribution || 12000,
                    });
                }
            } catch (err) {
                console.error('Failed to load forecast settings for ledger pods', err);
            }
        };
        fetchForecastSettings();
    }, []);

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

    // --- Premium Chart Tooltip (matches pod colors) ---
    const INCOME_COLORS = {
        salary: { color: '#3b82f6', label: 'Salary' },
        realEstate: { color: '#10b981', label: 'Real Estate' },
        equity: { color: '#a855f7', label: 'Equity' },
        fixedIncome: { color: '#f59e0b', label: 'Interest' },
        extraordinary: { color: '#D4AF37', label: 'Extraordinary' },
    };

    const INVESTMENT_COLORS = {
        equity: { color: '#3b82f6', label: 'Equity' },
        fixedIncome: { color: '#10b981', label: 'Fixed Income' },
        realEstate: { color: '#ef4444', label: 'Real Estate' },
        pensions: { color: '#8b5cf6', label: 'Pensions' },
        crypto: { color: '#f59e0b', label: 'Crypto' },
        debt: { color: '#ec4899', label: 'Debt' },
    };

    const GlowingChartTooltip = ({ active, payload, label }) => {
        if (!active || !payload || !payload.length) return null;
        // Use the 'total' dataKey value if present (Net Monthly line), otherwise sum bars only
        const totalEntry = payload.find(p => p.dataKey === 'total');
        const displayItems = payload.filter(p => p.dataKey !== 'total');
        const total = totalEntry ? totalEntry.value : displayItems.reduce((sum, p) => sum + (p.value || 0), 0);
        return (
            <div style={{
                background: 'rgba(18, 20, 24, 0.95)',
                border: '1px solid rgba(212, 175, 55, 0.15)',
                borderRadius: '12px',
                padding: '14px 18px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(212,175,55,0.05)',
                backdropFilter: 'blur(12px)',
                minWidth: '180px',
            }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(245,245,220,0.7)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                    {formatMonthLabel(label)}
                </p>
                {displayItems.map((p, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: p.color,
                                boxShadow: `0 0 6px ${p.color}80`,
                            }} />
                            <span style={{ fontSize: '12px', color: 'rgba(245,245,220,0.6)' }}>{p.name}</span>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: p.color, fontFamily: 'monospace' }}>
                            {formatCurrency(p.value, 'GBP')}
                        </span>
                    </div>
                ))}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(245,245,220,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#D4AF37', fontFamily: 'monospace' }}>{formatCurrency(total, 'GBP')}</span>
                </div>
            </div>
        );
    };

    // Custom legend matching pod style
    const CustomLegend = ({ payload }) => {
        if (!payload) return null;
        return (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '16px', flexWrap: 'wrap' }}>
                {payload.map((entry, index) => {
                    const resolvedColor = INCOME_COLORS[entry.dataKey]?.color || entry.color;
                    return (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{
                                width: '10px', height: '10px', borderRadius: '3px',
                                background: resolvedColor,
                                boxShadow: `0 0 8px ${resolvedColor}60`,
                            }} />
                            <span style={{ fontSize: '11px', color: 'rgba(245,245,220,0.5)', fontWeight: 500, letterSpacing: '0.3px' }}>{entry.value}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    // --- Prepare Data for Glowing Income Pods ---
    // incomeData is currently sorted descending (newest month first)
    // We want historicalData for the sparkline to be ascending (left to right = oldest to newest)
    const historicalData = [...incomeData].slice(0, 12).reverse();
    let currentMonthData = null;

    if (incomeData.length >= 1) {
        const current = incomeData[0]; // Newest
        const previous = incomeData.length >= 2 ? incomeData[1] : null;

        const calcDiff = (curr, prev) => ({
            diff: curr - prev,
            pct: prev !== 0 ? ((curr - prev) / prev) * 100 : 0
        });

        currentMonthData = {
            salary: current.salary || 0,
            realEstate: current.realEstate || 0,
            equity: current.equity || 0,
            fixedIncome: current.fixedIncome || 0,

            ...(previous ? {
                salaryDiff: calcDiff(current.salary || 0, previous.salary || 0).diff,
                salaryDiffPct: calcDiff(current.salary || 0, previous.salary || 0).pct,

                realEstateDiff: calcDiff(current.realEstate || 0, previous.realEstate || 0).diff,
                realEstateDiffPct: calcDiff(current.realEstate || 0, previous.realEstate || 0).pct,

                equityDiff: calcDiff(current.equity || 0, previous.equity || 0).diff,
                equityDiffPct: calcDiff(current.equity || 0, previous.equity || 0).pct,

                fixedIncomeDiff: calcDiff(current.fixedIncome || 0, previous.fixedIncome || 0).diff,
                fixedIncomeDiffPct: calcDiff(current.fixedIncome || 0, previous.fixedIncome || 0).pct,
            } : {
                salaryDiff: 0, salaryDiffPct: 0,
                realEstateDiff: 0, realEstateDiffPct: 0,
                equityDiff: 0, equityDiffPct: 0,
                fixedIncomeDiff: 0, fixedIncomeDiffPct: 0,
            })
        };
    }

    // --- Prepare Data for Glowing Investment Pods ---
    const investmentHistoricalData = [...investmentData].slice(0, 12).reverse();
    let currentInvestmentData = null;

    if (investmentData.length >= 1) {
        const current = investmentData[0];
        const previous = investmentData.length >= 2 ? investmentData[1] : null;

        const calcDiff2 = (curr, prev) => ({
            diff: curr - prev,
            pct: prev !== 0 ? ((curr - prev) / prev) * 100 : 0
        });

        currentInvestmentData = {
            equity: current.equity || 0,
            fixedIncome: current.fixedIncome || 0,
            realEstate: current.realEstate || 0,
            pensions: current.pensions || 0,
            crypto: current.crypto || 0,
            debt: current.debt || 0,

            ...(previous ? {
                equityDiff: calcDiff2(current.equity || 0, previous.equity || 0).diff,
                equityDiffPct: calcDiff2(current.equity || 0, previous.equity || 0).pct,
                fixedIncomeDiff: calcDiff2(current.fixedIncome || 0, previous.fixedIncome || 0).diff,
                fixedIncomeDiffPct: calcDiff2(current.fixedIncome || 0, previous.fixedIncome || 0).pct,
                realEstateDiff: calcDiff2(current.realEstate || 0, previous.realEstate || 0).diff,
                realEstateDiffPct: calcDiff2(current.realEstate || 0, previous.realEstate || 0).pct,
                pensionsDiff: calcDiff2(current.pensions || 0, previous.pensions || 0).diff,
                pensionsDiffPct: calcDiff2(current.pensions || 0, previous.pensions || 0).pct,
                cryptoDiff: calcDiff2(current.crypto || 0, previous.crypto || 0).diff,
                cryptoDiffPct: calcDiff2(current.crypto || 0, previous.crypto || 0).pct,
                debtDiff: calcDiff2(current.debt || 0, previous.debt || 0).diff,
                debtDiffPct: calcDiff2(current.debt || 0, previous.debt || 0).pct,
            } : {
                equityDiff: 0, equityDiffPct: 0,
                fixedIncomeDiff: 0, fixedIncomeDiffPct: 0,
                realEstateDiff: 0, realEstateDiffPct: 0,
                pensionsDiff: 0, pensionsDiffPct: 0,
                cryptoDiff: 0, cryptoDiffPct: 0,
                debtDiff: 0, debtDiffPct: 0,
            })
        };
    }

    return (
        <>
        <div id="ftue-ledger-container" className="w-full max-w-[1800px] mx-auto pb-4 lg:pb-0">
            {/* Toolbar: Monthly Close + Auto-Close toggle — only on General Ledger/Totals view */}
            {view === 'historicals' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
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
            )}

            {view === 'income' && (
                <div className="flex flex-col w-full">
                    {/* Glowing Pods Hero Section */}
                    <GlowingIncomePods
                        data={currentMonthData}
                        historicalData={historicalData}
                        currency="GBP"
                    />

                    <div className="flex flex-col gap-8 w-full mt-2">

                        {/* Chart — premium styled */}
                        <div className="rounded-2xl bg-[#121418]/80 backdrop-blur-xl border border-white/5 p-6" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'rgba(245,245,220,0.8)', fontWeight: 600, letterSpacing: '0.3px' }}>Monthly Income</h3>

                                {/* Toggle for Extraordinary Income */}
                                <div className="flex items-center gap-3">
                                    <span style={{ fontSize: '0.75rem', color: 'rgba(245,245,220,0.4)', letterSpacing: '0.3px' }}>Extraordinary</span>
                                    <div
                                        onClick={() => setShowExtraordinary(!showExtraordinary)}
                                        style={{
                                            width: '40px',
                                            height: '20px',
                                            background: showExtraordinary ? '#D4AF37' : 'rgba(255,255,255,0.1)',
                                            borderRadius: '10px',
                                            position: 'relative',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            boxShadow: showExtraordinary ? '0 0 12px rgba(212,175,55,0.3)' : 'none'
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
                                    <BarChart 
                                        data={[...incomeData].reverse().map(d => {
                                            let topmost = '';
                                            if (showExtraordinary && d.extraordinary > 0) topmost = 'extraordinary';
                                            else if (d.fixedIncome > 0) topmost = 'fixedIncome';
                                            else if (d.equity > 0) topmost = 'equity';
                                            else if (d.realEstate > 0) topmost = 'realEstate';
                                            else if (d.salary > 0) topmost = 'salary';
                                            return { ...d, _topmostBar: topmost };
                                        })} 
                                        barCategoryGap="25%"
                                    >
                                        <defs>
                                            {Object.entries(INCOME_COLORS).map(([key, { color }]) => (
                                                <linearGradient key={key} id={`bar-grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                                                    <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                                                </linearGradient>
                                            ))}
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                        <XAxis
                                            dataKey="month"
                                            stroke="transparent"
                                            tick={{ fill: 'rgba(245,245,220,0.35)', fontSize: 11, fontWeight: 500 }}
                                            tickFormatter={formatMonthLabel}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="transparent"
                                            tick={{ fill: 'rgba(245,245,220,0.3)', fontSize: 11 }}
                                            tickFormatter={formatYAxis}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <Tooltip content={<GlowingChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 4 }} />
                                        <Legend content={<CustomLegend />} />
                                        
                                        {[
                                            { key: 'salary', name: 'Salary' },
                                            { key: 'realEstate', name: 'Real Estate' },
                                            { key: 'equity', name: 'Equity' },
                                            { key: 'fixedIncome', name: 'Interest' },
                                            ...(showExtraordinary ? [{ key: 'extraordinary', name: 'Extraordinary' }] : [])
                                        ].map(barDef => (
                                            <Bar 
                                                key={barDef.key} 
                                                dataKey={barDef.key} 
                                                name={barDef.name} 
                                                stackId="a" 
                                                fill={`url(#bar-grad-${barDef.key})`} 
                                                shape={(props) => {
                                                    const { fill, x, y, width, height, payload } = props;
                                                    const isTop = payload._topmostBar === barDef.key;
                                                    const r = 6;
                                                    if (!width || !height || height <= 0) return null;
                                                    
                                                    if (isTop && height > r) {
                                                        return <path d={`M${x},${y+height} L${x},${y+r} A${r},${r} 0 0,1 ${x+r},${y} L${x+width-r},${y} A${r},${r} 0 0,1 ${x+width},${y+r} L${x+width},${y+height} Z`} fill={fill} />;
                                                    }
                                                    return <rect x={x} y={y} width={width} height={height} fill={fill} />;
                                                }}
                                            />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Revenue Ledger Accordion */}
                        <div className="rounded-2xl bg-[#121418]/80 backdrop-blur-xl border border-white/5" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                            {/* Accordion Header */}
                            <button
                                onClick={() => setShowLedgerTable(!showLedgerTable)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '16px 20px',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    borderBottom: showLedgerTable ? '1px solid rgba(255,255,255,0.06)' : 'none',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '14px' }}>📋</span>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(245,245,220,0.7)', letterSpacing: '0.3px' }}>Revenue Ledger</span>
                                    <span style={{ fontSize: '11px', color: 'rgba(245,245,220,0.3)', fontWeight: 400 }}>({incomeData.length} months)</span>
                                </div>
                                <span style={{
                                    fontSize: '12px',
                                    color: 'rgba(245,245,220,0.35)',
                                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    transform: showLedgerTable ? 'rotate(180deg)' : 'rotate(0deg)',
                                    display: 'inline-block',
                                }}>▼</span>
                            </button>

                            {/* Accordion Content */}
                            <div style={{
                                maxHeight: showLedgerTable ? 'calc(100vh - 12rem)' : '0',
                                overflow: showLedgerTable ? 'auto' : 'hidden',
                                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead className="sticky top-0 z-10" style={{ background: '#121418', backdropFilter: 'blur(10px)' }}>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                        <th style={{ padding: '16px', textAlign: 'left', color: 'rgba(245,245,220,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Month</th>
                                        <th style={{ padding: '16px', textAlign: 'right', color: '#3b82f6', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Salary</th>
                                        <th style={{ padding: '16px', textAlign: 'right', color: '#D4AF37', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Extraordinary</th>
                                        <th style={{ padding: '16px', textAlign: 'right', color: '#10b981', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Real Estate</th>
                                        <th style={{ padding: '16px', textAlign: 'right', color: '#a855f7', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Equity</th>
                                        <th style={{ padding: '16px', textAlign: 'right', color: '#f59e0b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Interest</th>
                                        <th style={{ padding: '16px', textAlign: 'right', color: '#fff', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Total</th>
                                        <th style={{ padding: '16px', textAlign: 'center', width: '60px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {incomeData.map(d => {
                                        const total = d.salary + d.extraordinary + d.realEstate + d.equity + d.fixedIncome;
                                        const isLiveRow = d.month === currentMonth && !d.isHistorical;
                                        return (
                                            <tr key={`${d.month}-${d.isHistorical ? 'rec' : 'live'}`} style={isLiveRow ? highlightStyle : { borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                <td style={{ padding: '14px 16px', color: 'rgba(245,245,220,0.7)', fontWeight: isLiveRow ? 700 : 400 }}>
                                                    {formatMonthLabel(d.month)} {isLiveRow && <span style={{ fontSize: '0.65rem', background: '#D4AF37', color: '#000', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', fontWeight: 700 }}>LIVE</span>}
                                                </td>
                                                <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.5)', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(d.salary, 'GBP')}</td>
                                                <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.5)', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(d.extraordinary, 'GBP')}</td>
                                                <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.5)', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(d.realEstate, 'GBP')}</td>
                                                <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.5)', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(d.equity, 'GBP')}</td>
                                                <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.5)', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(d.fixedIncome, 'GBP')}</td>
                                                <td style={{ padding: '14px 16px', textAlign: 'right', color: total >= 0 ? 'var(--vu-green)' : '#ef4444', fontWeight: 600, fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(total, 'GBP')}</td>
                                                <td style={{ padding: '14px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                    {!isLiveRow && d.isHistorical && (
                                                        <>
                                                            <button onClick={() => handleEditClick('income', d.month, { salarySavings: d.salary, extraordinary: d.extraordinary, realEstate: d.realEstate, equity: d.equity, fixedIncome: d.fixedIncome })} style={{ ...actionBtnStyle, color: '#D4AF37' }} title="Edit">✏️</button>
                                                            <button onClick={() => setDeleteLedgerMonth(d.month)} style={{ ...actionBtnStyle, color: '#ef4444' }} title="Delete">🗑️</button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: 'rgba(255,255,255,0.03)', fontWeight: 700 }}>
                                        <td style={{ padding: '16px', color: 'rgba(245,245,220,0.6)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>TOTAL</td>
                                        <td style={{ padding: '16px', textAlign: 'right', color: '#3b82f6', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(incomeData.reduce((acc, d) => acc + d.salary, 0), 'GBP')}</td>
                                        <td style={{ padding: '16px', textAlign: 'right', color: '#D4AF37', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(incomeData.reduce((acc, d) => acc + (d.extraordinary || 0), 0), 'GBP')}</td>
                                        <td style={{ padding: '16px', textAlign: 'right', color: '#10b981', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(incomeData.reduce((acc, d) => acc + d.realEstate, 0), 'GBP')}</td>
                                        <td style={{ padding: '16px', textAlign: 'right', color: '#a855f7', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(incomeData.reduce((acc, d) => acc + d.equity, 0), 'GBP')}</td>
                                        <td style={{ padding: '16px', textAlign: 'right', color: '#f59e0b', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(incomeData.reduce((acc, d) => acc + d.fixedIncome, 0), 'GBP')}</td>
                                        <td style={{ padding: '16px', textAlign: 'right', color: incomeData.reduce((acc, d) => acc + d.salary + (d.extraordinary || 0) + d.realEstate + d.equity + d.fixedIncome, 0) >= 0 ? 'var(--vu-green)' : '#ef4444', fontFamily: 'monospace', fontSize: '13px' }}>
                                            {formatCurrency(incomeData.reduce((acc, d) => acc + d.salary + (d.extraordinary || 0) + d.realEstate + d.equity + d.fixedIncome, 0), 'GBP')}
                                        </td>
                                        <td style={{ padding: '16px' }}></td>
                                    </tr>
                                </tfoot>
                            </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
                {view === 'historicals' && (
                    <div className="flex flex-col w-full">
                        {/* Hero Pods */}
                        <LedgerHeroPods
                            snapshots={combinedSnapshots}
                            forecastActuals={forecastActuals}
                            targetROI={forecastSettings.targetROI}
                            targetContribution={forecastSettings.targetContribution}
                        />

                        {/* Snapshot Ledger Accordion */}
                        <div className="rounded-2xl bg-[#121418]/80 backdrop-blur-xl border border-white/5" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                            {/* Accordion Header */}
                            <button
                                onClick={() => setShowHistoricalsLedger(!showHistoricalsLedger)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '16px 20px',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    borderBottom: showHistoricalsLedger ? '1px solid rgba(255,255,255,0.06)' : 'none',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '14px' }}>📸</span>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(245,245,220,0.7)', letterSpacing: '0.3px' }}>Monthly Snapshots</span>
                                    <span style={{ fontSize: '11px', color: 'rgba(245,245,220,0.3)', fontWeight: 400 }}>({combinedSnapshots.length} months)</span>
                                </div>
                                <span style={{
                                    fontSize: '12px',
                                    color: 'rgba(245,245,220,0.35)',
                                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    transform: showHistoricalsLedger ? 'rotate(180deg)' : 'rotate(0deg)',
                                    display: 'inline-block',
                                }}>▼</span>
                            </button>

                            {/* Accordion Content */}
                            <div style={{
                                maxHeight: showHistoricalsLedger ? 'calc(100vh - 12rem)' : '0',
                                overflow: showHistoricalsLedger ? 'auto' : 'hidden',
                                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                overflowX: 'auto',
                            }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead className="sticky top-0 z-10" style={{ background: '#121418', backdropFilter: 'blur(10px)' }}>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                        <th style={{ padding: '16px', textAlign: 'left', color: 'rgba(245,245,220,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Month</th>
                                        <th style={{ padding: '16px', textAlign: 'right', color: '#D4AF37', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>NW (BRL)</th>
                                        <th style={{ padding: '16px', textAlign: 'right', color: '#8b5cf6', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>NW (GBP)</th>
                                        <th style={{ padding: '16px', textAlign: 'right', color: '#10b981', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Fixed Inc.</th>
                                        <th style={{ padding: '16px', textAlign: 'right', color: '#3b82f6', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Equity</th>
                                        <th style={{ padding: '16px', textAlign: 'right', color: '#ef4444', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Real Estate</th>
                                        <th style={{ padding: '16px', textAlign: 'right', color: '#f59e0b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Crypto</th>
                                        <th style={{ padding: '16px', textAlign: 'right', color: '#8b5cf6', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Pensions</th>
                                        <th style={{ padding: '16px', textAlign: 'right', color: '#ec4899', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Debt</th>
                                        <th style={{ padding: '16px', textAlign: 'right', color: '#05ff9b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>ROI</th>
                                        <th style={{ padding: '16px', textAlign: 'right', color: 'rgba(245,245,220,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>FX Rate</th>
                                        <th style={{ padding: '16px', textAlign: 'center', width: '80px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...combinedSnapshots].reverse().map((d, i) => {
                                        const impliedRate = d.totalminuspensionsGBP ? d.totalminuspensionsBRL / d.totalminuspensionsGBP : 0;
                                        const isLiveRow = !!d.isLive;
                                        const totalDebt = d.categories?.Debt || 0;
                                        return (
                                            <tr key={i} style={isLiveRow ? highlightStyle : { borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                <td style={{ padding: '14px 16px', color: 'rgba(245,245,220,0.7)', fontWeight: isLiveRow ? 700 : 400 }}>
                                                    {formatMonthLabel(d.month)} {isLiveRow && <span style={{ fontSize: '0.65rem', background: '#D4AF37', color: '#000', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', fontWeight: 700 }}>LIVE</span>}
                                                </td>
                                                <td style={{ padding: '14px 16px', textAlign: 'right', color: '#D4AF37', fontFamily: 'monospace', fontSize: '13px' }}>{(d.networthBRL || d.totalBRL) ? formatCurrency(d.networthBRL || d.totalBRL, 'BRL') : '-'}</td>
                                                <td style={{ padding: '14px 16px', textAlign: 'right', color: '#8b5cf6', fontFamily: 'monospace', fontSize: '13px' }}>{(d.networthGBP || d.totalGBP) ? formatCurrency(d.networthGBP || d.totalGBP, 'GBP') : '-'}</td>
                                                <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.5)', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(d.categories?.FixedIncome || 0, 'BRL')}</td>
                                                <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.5)', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(d.categories?.Equity || 0, 'BRL')}</td>
                                                <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.5)', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(d.categories?.RealEstate || 0, 'BRL')}</td>
                                                <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.5)', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(d.categories?.Crypto || 0, 'BRL')}</td>
                                                <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.5)', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(d.categories?.Pensions || 0, 'BRL')}</td>
                                                <td style={{ padding: '14px 16px', textAlign: 'right', color: '#ec4899', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(-totalDebt, 'BRL')}</td>
                                                <td style={{ padding: '14px 16px', textAlign: 'right', color: d.roi >= 0 ? '#05ff9b' : '#ef4444', fontFamily: 'monospace', fontSize: '13px', fontWeight: 600 }}>{d.roi ? `${d.roi.toFixed(2)}%` : '-'}</td>
                                                <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.4)', fontFamily: 'monospace', fontSize: '13px' }}>{impliedRate ? `R$ ${impliedRate.toFixed(2)}` : '-'}</td>
                                                <td style={{ padding: '14px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                    {!isLiveRow && !d.isLive && (
                                                        <>
                                                            <button onClick={() => handleEditClick('snapshot', d.month, { networthBRL: d.networthBRL || 0, networthGBP: d.networthGBP || 0, totalminuspensionsBRL: d.totalminuspensionsBRL || 0, totalminuspensionsGBP: d.totalminuspensionsGBP || 0, FixedIncome: d.categories?.FixedIncome || 0, Equity: d.categories?.Equity || 0, RealEstate: d.categories?.RealEstate || 0, Crypto: d.categories?.Crypto || 0, Pensions: d.categories?.Pensions || 0, Debt: d.categories?.Debt || 0 })} style={{ ...actionBtnStyle, color: '#D4AF37' }} title="Edit">✏️</button>
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
                        </div>
                    </div>
                )}

                {view === 'investments' && (
                    <div className="flex flex-col w-full">
                        {/* Glowing Investment Pods */}
                        <GlowingInvestmentPods
                            data={currentInvestmentData}
                            historicalData={investmentHistoricalData}
                            currency="GBP"
                        />

                        <div className="flex flex-col gap-8 w-full mt-2">

                            {/* Chart — full width */}
                            <div className="rounded-2xl bg-[#121418]/80 backdrop-blur-xl border border-white/5 p-6" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                    <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'rgba(245,245,220,0.8)', fontWeight: 600 }}>Monthly Investments (Capital Injection)</h3>
                                </div>
                                <div style={{ height: '400px', width: '100%' }}>
                                    <ResponsiveContainer>
                                        <ComposedChart 
                                            data={[...investmentData].reverse().map(d => {
                                                const keys = ['equity', 'fixedIncome', 'realEstate', 'pensions', 'crypto', 'debt'];
                                                let topmost = '';
                                                for (let i = keys.length - 1; i >= 0; i--) {
                                                    if (d[keys[i]] > 0) { topmost = keys[i]; break; }
                                                }
                                                return { ...d, _topmostBar: topmost };
                                            })}
                                            barCategoryGap="25%"
                                        >
                                            <defs>
                                                {Object.entries(INVESTMENT_COLORS).map(([key, { color }]) => (
                                                    <linearGradient key={key} id={`inv-bar-grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                                                        <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                                                    </linearGradient>
                                                ))}
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                            <XAxis
                                                dataKey="month"
                                                stroke="transparent"
                                                tick={{ fill: 'rgba(245,245,220,0.35)', fontSize: 11, fontWeight: 500 }}
                                                tickFormatter={formatMonthLabel}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <YAxis
                                                stroke="transparent"
                                                tick={{ fill: 'rgba(245,245,220,0.3)', fontSize: 11 }}
                                                tickFormatter={formatYAxis}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <Tooltip content={<GlowingChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 4 }} />
                                            <Legend content={({ payload }) => {
                                                if (!payload) return null;
                                                return (
                                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '16px', flexWrap: 'wrap' }}>
                                                        {payload.filter(e => e.dataKey !== 'total').map((entry, index) => {
                                                            const resolvedColor = INVESTMENT_COLORS[entry.dataKey]?.color || entry.color;
                                                            return (
                                                                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <div style={{
                                                                        width: '10px', height: '10px', borderRadius: '3px',
                                                                        background: resolvedColor,
                                                                        boxShadow: `0 0 8px ${resolvedColor}60`,
                                                                    }} />
                                                                    <span style={{ fontSize: '11px', color: 'rgba(245,245,220,0.5)', fontWeight: 500, letterSpacing: '0.3px' }}>{entry.value}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            }} />

                                            {[
                                                { key: 'equity', name: 'Equity' },
                                                { key: 'fixedIncome', name: 'Fixed Income' },
                                                { key: 'realEstate', name: 'Real Estate' },
                                                { key: 'pensions', name: 'Pensions' },
                                                { key: 'crypto', name: 'Crypto' },
                                                { key: 'debt', name: 'Debt' },
                                            ].map(barDef => {
                                                const stackOrder = ['equity', 'fixedIncome', 'realEstate', 'pensions', 'crypto', 'debt'];
                                                return (
                                                <Bar 
                                                    key={barDef.key} 
                                                    dataKey={barDef.key} 
                                                    name={barDef.name} 
                                                    stackId="a" 
                                                    fill={`url(#inv-bar-grad-${barDef.key})`} 
                                                    shape={(props) => {
                                                        const { fill, x, y, width, height, payload } = props;
                                                        const r = 6;
                                                        if (!width || !height || height <= 0) return null;
                                                        // Determine if this segment is the topmost in the stack
                                                        let topKey = '';
                                                        for (let i = stackOrder.length - 1; i >= 0; i--) {
                                                            if ((payload[stackOrder[i]] || 0) > 0) { topKey = stackOrder[i]; break; }
                                                        }
                                                        const isTop = topKey === barDef.key;
                                                        
                                                        if (isTop && height > r) {
                                                            return <path d={`M${x},${y+height} L${x},${y+r} A${r},${r} 0 0,1 ${x+r},${y} L${x+width-r},${y} A${r},${r} 0 0,1 ${x+width},${y+r} L${x+width},${y+height} Z`} fill={fill} />;
                                                        }
                                                        return <rect x={x} y={y} width={width} height={height} fill={fill} />;
                                                    }}
                                                />
                                                );
                                            })}
                                            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
                                            <Line type="monotone" dataKey="total" name="Net Monthly" stroke="#fff" strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: '#fff', stroke: '#121418', strokeWidth: 2 }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Investment Ledger Accordion */}
                            <div className="rounded-2xl bg-[#121418]/80 backdrop-blur-xl border border-white/5" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                                {/* Accordion Header */}
                                <button
                                    onClick={() => setShowInvestmentLedgerTable(!showInvestmentLedgerTable)}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '16px 20px',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        borderBottom: showInvestmentLedgerTable ? '1px solid rgba(255,255,255,0.06)' : 'none',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '14px' }}>💰</span>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(245,245,220,0.7)', letterSpacing: '0.3px' }}>Investment Ledger</span>
                                        <span style={{ fontSize: '11px', color: 'rgba(245,245,220,0.3)', fontWeight: 400 }}>({investmentData.length} months)</span>
                                    </div>
                                    <span style={{
                                        fontSize: '12px',
                                        color: 'rgba(245,245,220,0.35)',
                                        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        transform: showInvestmentLedgerTable ? 'rotate(180deg)' : 'rotate(0deg)',
                                        display: 'inline-block',
                                    }}>▼</span>
                                </button>

                                {/* Accordion Content */}
                                <div style={{
                                    maxHeight: showInvestmentLedgerTable ? 'calc(100vh - 12rem)' : '0',
                                    overflow: showInvestmentLedgerTable ? 'auto' : 'hidden',
                                    transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead className="sticky top-0 z-10" style={{ background: '#121418', backdropFilter: 'blur(10px)' }}>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                            <th style={{ padding: '16px', textAlign: 'left', color: 'rgba(245,245,220,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Month</th>
                                            <th style={{ padding: '16px', textAlign: 'right', color: '#3b82f6', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Equity</th>
                                            <th style={{ padding: '16px', textAlign: 'right', color: '#10b981', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Fixed Inc.</th>
                                            <th style={{ padding: '16px', textAlign: 'right', color: '#ef4444', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Real Estate</th>
                                            <th style={{ padding: '16px', textAlign: 'right', color: '#8b5cf6', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Pensions</th>
                                            <th style={{ padding: '16px', textAlign: 'right', color: '#f59e0b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Crypto</th>
                                            <th style={{ padding: '16px', textAlign: 'right', color: '#ec4899', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Debt</th>
                                            <th style={{ padding: '16px', textAlign: 'right', color: '#fff', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Total</th>
                                            <th style={{ padding: '16px', textAlign: 'center', width: '60px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {investmentData.map(d => {
                                            const total = d.equity + d.pensions + d.realEstate + d.crypto + d.fixedIncome + d.debt;
                                            const isLiveRow = d.month === currentMonth && !d.isHistorical;
                                            return (
                                                <tr key={`${d.month}-${d.isHistorical ? 'rec' : 'live'}`} style={isLiveRow ? highlightStyle : { borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                    <td style={{ padding: '14px 16px', color: 'rgba(245,245,220,0.7)', fontWeight: isLiveRow ? 700 : 400 }}>
                                                        {formatMonthLabel(d.month)} {isLiveRow && <span style={{ fontSize: '0.65rem', background: '#D4AF37', color: '#000', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', fontWeight: 700 }}>LIVE</span>}
                                                    </td>
                                                    <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.5)', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(d.equity, 'GBP')}</td>
                                                    <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.5)', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(d.fixedIncome, 'GBP')}</td>
                                                    <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.5)', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(d.realEstate, 'GBP')}</td>
                                                    <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.5)', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(d.pensions, 'GBP')}</td>
                                                    <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.5)', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(d.crypto, 'GBP')}</td>
                                                    <td style={{ padding: '14px 16px', textAlign: 'right', color: 'rgba(245,245,220,0.5)', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(d.debt, 'GBP')}</td>
                                                    <td style={{ padding: '14px 16px', textAlign: 'right', color: total >= 0 ? 'var(--vu-green)' : '#ef4444', fontWeight: 600, fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(total, 'GBP')}</td>
                                                    <td style={{ padding: '14px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                        {!isLiveRow && d.isHistorical && (
                                                            <>
                                                                <button onClick={() => handleEditClick('investments', d.month, { equity: d.equity, pensions: d.pensions, realEstate: d.realEstate, crypto: d.crypto, fixedIncome: d.fixedIncome, debt: d.debt })} style={{ ...actionBtnStyle, color: '#D4AF37' }} title="Edit">✏️</button>
                                                                <button onClick={() => setDeleteLedgerMonth(d.month)} style={{ ...actionBtnStyle, color: '#ef4444' }} title="Delete">🗑️</button>
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ background: 'rgba(255,255,255,0.03)', fontWeight: 700 }}>
                                            <td style={{ padding: '16px', color: 'rgba(245,245,220,0.6)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>TOTAL</td>
                                            <td style={{ padding: '16px', textAlign: 'right', color: '#3b82f6', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(investmentData.reduce((acc, d) => acc + d.equity, 0), 'GBP')}</td>
                                            <td style={{ padding: '16px', textAlign: 'right', color: '#10b981', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(investmentData.reduce((acc, d) => acc + d.fixedIncome, 0), 'GBP')}</td>
                                            <td style={{ padding: '16px', textAlign: 'right', color: '#ef4444', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(investmentData.reduce((acc, d) => acc + d.realEstate, 0), 'GBP')}</td>
                                            <td style={{ padding: '16px', textAlign: 'right', color: '#8b5cf6', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(investmentData.reduce((acc, d) => acc + d.pensions, 0), 'GBP')}</td>
                                            <td style={{ padding: '16px', textAlign: 'right', color: '#f59e0b', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(investmentData.reduce((acc, d) => acc + d.crypto, 0), 'GBP')}</td>
                                            <td style={{ padding: '16px', textAlign: 'right', color: '#ec4899', fontFamily: 'monospace', fontSize: '13px' }}>{formatCurrency(investmentData.reduce((acc, d) => acc + d.debt, 0), 'GBP')}</td>
                                            <td style={{ padding: '16px', textAlign: 'right', color: investmentData.reduce((acc, d) => acc + d.equity + d.pensions + d.realEstate + d.crypto + d.fixedIncome + d.debt, 0) >= 0 ? 'var(--vu-green)' : '#ef4444', fontFamily: 'monospace', fontSize: '13px' }}>
                                                {formatCurrency(investmentData.reduce((acc, d) => acc + d.equity + d.pensions + d.realEstate + d.crypto + d.fixedIncome + d.debt, 0), 'GBP')}
                                            </td>
                                            <td style={{ padding: '16px' }}></td>
                                        </tr>
                                    </tfoot>
                                </table>
                                </div>
                            </div>
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
            <PageTutorialOverlay pageId="general-ledger" steps={LEDGER_TUTORIAL_STEPS} />
        </>
            );
}
