import { useState, useEffect } from 'react';
import { normalizeTransactions, calculateMonthlyIncome, calculateMonthlyInvestments } from '@/lib/ledgerUtils';
import { calculateTWRHistory } from '@/lib/roiUtils';
import type { GeneralLedgerTabProps, HistoricalSnapshot, IncomeRow, InvestmentRow } from './types';

export default function useGeneralLedger({
    activeTab = 'income',
    equityTransactions = [],
    cryptoTransactions = [],
    pensionTransactions = [],
    debtTransactions = [],
    transactions = [],
    realEstate = [],
    rates = {},
    historicalSnapshots = [],
    dashboardData,
    onRecordSnapshot,
    onRefreshLedger,
    onDeleteSnapshot,
    setIsMonthlyCloseModalOpen
}: GeneralLedgerTabProps) {
    const view = activeTab === 'totals' ? 'historicals' : activeTab;
    const [showExtraordinary, setShowExtraordinary] = useState(false);
    const [showLedgerTable, setShowLedgerTable] = useState(false);
    const [showInvestmentLedgerTable, setShowInvestmentLedgerTable] = useState(false);
    const [showHistoricalsLedger, setShowHistoricalsLedger] = useState(false);
    const [forecastSettings, setForecastSettings] = useState({ targetROI: 10, targetContribution: 12000 });
    const [incomeData, setIncomeData] = useState<IncomeRow[]>([]);
    const [investmentData, setInvestmentData] = useState<InvestmentRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [fxHistory, setFxHistory] = useState<Record<string, Record<string, number>>>({});
    const [isSnapshotting, setIsSnapshotting] = useState(false);
    const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);

    // Edit/Delete state
    const [editingRow, setEditingRow] = useState<{ type: string; month: string } | null>(null);
    const [editForm, setEditForm] = useState<Record<string, number>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [deleteMonth, setDeleteMonth] = useState<string | null>(null);
    const [deleteLedgerMonth, setDeleteLedgerMonth] = useState<string | null>(null);

    const actionBtnStyle: React.CSSProperties = {
        background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem',
        padding: '4px 8px', borderRadius: '6px', transition: 'all 0.2s'
    };

    // Edit handlers
    const handleEditClick = (type: string, month: string, data: Record<string, number>) => {
        setEditingRow({ type, month });
        setEditForm({ ...data });
    };

    const handleEditSave = async () => {
        if (!editingRow) return;
        setIsSaving(true);
        try {
            if (editingRow.type === 'snapshot') {
                const existingSnapshot = (historicalSnapshots as any[]).find((s: any) => s.month === editingRow.month);
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
                onDeleteSnapshot?.();
            } else {
                await fetch('/api/ledger-data', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        month: editingRow.month,
                        type: editingRow.type,
                        data: editForm
                    })
                });
                onRefreshLedger?.();
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
            onDeleteSnapshot?.();
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
            onRefreshLedger?.();
        } catch (e) {
            console.error('Failed to delete ledger data:', e);
        } finally {
            setDeleteLedgerMonth(null);
        }
    };

    // Load data
    useEffect(() => {
        const load = async () => {
            let historicalIncome: any[] = [];
            let historicalInvestments: any[] = [];
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

            let history: Record<string, Record<string, number>> = {};
            try {
                const fxRes = await fetch('/api/fx-rates');
                if (fxRes.ok) {
                    history = await fxRes.json();
                    setFxHistory(history);
                }
            } catch (e) {
                console.error("Failed to load FX rates", e);
            }

            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            const recordedCurrentIncome = historicalIncome.find((h: any) => h.month === currentMonth);
            const recordedCurrentInvestments = historicalInvestments.find((h: any) => h.month === currentMonth);

            const filteredHistoricalIncome = historicalIncome.filter((h: any) => h.month !== currentMonth);
            const filteredHistoricalInvestments = historicalInvestments.filter((h: any) => h.month !== currentMonth);

            const allLive = (normalizeTransactions as any)({
                equity: equityTransactions,
                crypto: cryptoTransactions,
                pensions: pensionTransactions,
                debt: debtTransactions,
                fixedIncome: transactions,
                realEstate: realEstate
            }, rates, history);

            let combinedIncome: any[] = (calculateMonthlyIncome as any)(allLive, realEstate, filteredHistoricalIncome, transactions);
            let combinedInvestments: any[] = (calculateMonthlyInvestments as any)(allLive, filteredHistoricalInvestments);

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
                const liveIdx = combinedIncome.findIndex((d: any) => d.month === currentMonth);
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
                const invLiveIdx = combinedInvestments.findIndex((d: any) => d.month === currentMonth);
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

    // Fetch forecast settings
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
            await onRecordSnapshot?.();
            setIsSnapshotting(false);
        }
    };

    // Prepare Live Snapshot for Historicals View
    const getCombinedSnapshots = (): HistoricalSnapshot[] => {
        if (!dashboardData) return historicalSnapshots as HistoricalSnapshot[];

        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const ratesBRL = (rates as any)?.BRL || 1;
        const ratesUSD = (rates as any)?.USD || 1;

        const liveSnapshot: HistoricalSnapshot = {
            month: currentMonth,
            totalminuspensionsBRL: dashboardData.netWorth.amount - (dashboardData.categories.find(c => c.id === 'pensions')?.assets.find(a => a.isTotal)?.brl || 0),
            totalminuspensionsGBP: (dashboardData.netWorth.amount - (dashboardData.categories.find(c => c.id === 'pensions')?.assets.find(a => a.isTotal)?.brl || 0)) / ratesBRL,
            networthBRL: dashboardData.netWorth.amount,
            networthGBP: dashboardData.netWorth.amount / ratesBRL,
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

        const _snapshots = (historicalSnapshots || []) as HistoricalSnapshot[];
        const allSnapshots = [..._snapshots, liveSnapshot];
        const twrMap = (calculateTWRHistory as any)(allSnapshots, investmentData, rates) as Record<string, number>;

        return allSnapshots.map(s => ({
            ...s,
            roi: twrMap[s.month] ?? s.roi
        })).sort((a, b) => a.month.localeCompare(b.month));
    };

    const combinedSnapshots = getCombinedSnapshots();
    const twrMapForInvestments = (calculateTWRHistory as any)(combinedSnapshots, investmentData, rates) as Record<string, number>;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const highlightStyle = { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderBottom: '1px solid rgba(16, 185, 129, 0.2)' };

    return {
        // State
        view,
        showExtraordinary, setShowExtraordinary,
        showLedgerTable, setShowLedgerTable,
        showInvestmentLedgerTable, setShowInvestmentLedgerTable,
        showHistoricalsLedger, setShowHistoricalsLedger,
        forecastSettings,
        incomeData, investmentData,
        loading,
        fxHistory,
        isSnapshotting, setIsSnapshotting,
        isSnapshotModalOpen, setIsSnapshotModalOpen,
        editingRow, setEditingRow,
        editForm, setEditForm,
        isSaving,
        deleteMonth, setDeleteMonth,
        deleteLedgerMonth, setDeleteLedgerMonth,
        actionBtnStyle,

        // Derived
        combinedSnapshots,
        twrMapForInvestments,
        currentMonth,
        highlightStyle,

        // Handlers
        handleEditClick, handleEditSave,
        handleDeleteSnapshot, handleDeleteLedgerData,
        handleSnapshotClick,
    };
}
