import React, { useState, useEffect, useRef } from 'react';
import ConfirmationModal from './ConfirmationModal';
import { formatCurrency } from '@/lib/currency';
import { convertCurrency } from '@/lib/currency';
import CurrencySelector from './CurrencySelector';
import TransactionTimeline from './TransactionTimeline';
import FloatingActionButton from './FloatingActionButton';
import EmptyState from './EmptyState';
import PullToRefresh from './PullToRefresh';

import ContextPane from './ContextPane';
import useContextPaneHeight from '@/hooks/useContextPaneHeight';
import BrokerForm from './BrokerForm';
import { usePortfolio } from '@/context/PortfolioContext';
import DisplayCurrencyPicker from './DisplayCurrencyPicker';
import { X } from 'lucide-react';
import PageTutorialOverlay from './ftue/PageTutorialOverlay';
import HeroDetailDrawer from './HeroDetailDrawer';

const DEBT_TUTORIAL_STEPS = [
    // Populated state
    { type: 'spotlight', targetId: 'ftue-debt-header', title: 'Debt Overview', message: "Your total outstanding debt across all lenders, with a breakdown by lender. Track mortgages, personal loans, and credit lines.", position: 'bottom' },
    { type: 'spotlight', targetId: 'ftue-debt-lender-section', title: 'Lender Details', message: "Expand each lender to see individual debt lines, balances, and repayment schedules.", position: 'bottom' },
    { type: 'spotlight', targetId: 'ftue-debt-ledger', title: 'Repayment History', message: "Every payment is logged here. Track how your debt reduces over time.", position: 'top' },
    // Empty state
    { type: 'spotlight', targetId: 'ftue-debt-empty', title: 'Debt Free!', message: "No debts tracked yet. Use the + button to add a lender if you want to track mortgages, loans, or credit.", position: 'top' },
    // Always visible
    { type: 'spotlight', targetId: 'global-fab', title: 'Add a Lender', message: "Use the + button to add a lender and start logging debts and repayments.", position: 'top', shape: 'circle', padding: 8 },
];

const BASE_LENDER_CURRENCY = {};

export default function DebtTab({ transactions = [], rates = { GBP: 1, BRL: 7.20 }, onRefresh }) {
    const { primaryCurrency, displayCurrencyOverrides } = usePortfolio();

    const [isLoading, setIsLoading] = useState(false);
    const [ledgerOpen, setLedgerOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleteLenderModalOpen, setIsDeleteLenderModalOpen] = useState(false);
    const [lenderToDelete, setLenderToDelete] = useState(null);
    const [trToDelete, setTrToDelete] = useState(null);
    const [editingTr, setEditingTr] = useState(null);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const contextPaneMaxHeight = useContextPaneHeight('ftue-debt-lender-section', 'ftue-debt-header');

    // Dynamic Lenders
    const [lenderDict, setLenderDict] = useState({ ...BASE_LENDER_CURRENCY });
    const [explicitDbLenders, setExplicitDbLenders] = useState([]);
    const [deletedLenderNames, setDeletedLenderNames] = useState([]);
    const [showEmptyLenders, setShowEmptyLenders] = useState(false);

    // Expand states
    const [expandedLenders, setExpandedLenders] = useState(() => {
        const init = {};
        return init;
    });
    const toggleLender = (b) => setExpandedLenders(prev => ({ ...prev, [b]: !prev[b] }));
    const [newlyAddedLenders, setNewlyAddedLenders] = useState([]);
    const isInitialFetch = useRef(true);

    // Right Pane
    const [rightPaneMode, setRightPaneMode] = useState('default');

    // Add transaction form
    const [addFormData, setAddFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        lender: '',
        amount: '',
        currency: primaryCurrency || 'BRL',
        obs: '',
        isSalaryContribution: false
    });

    const fetchLenders = async () => {
        try {
            const res = await fetch('/api/brokers?assetClass=Debt');
            const data = await res.json();
            if (data.brokers) {
                const debtLenders = data.brokers.filter(b => b.asset_class === 'Debt' || b.asset_class === null);
                const fetchedNames = debtLenders.map(b => b.name);

                if (!isInitialFetch.current) {
                    const newNames = fetchedNames.filter(name => !explicitDbLenders.includes(name) && !deletedLenderNames.includes(name));
                    if (newNames.length > 0) {
                        setNewlyAddedLenders(prev => [...new Set([...prev, ...newNames])]);
                        const expansions = {};
                        newNames.forEach(n => expansions[n] = true);
                        setExpandedLenders(prev => ({ ...prev, ...expansions }));
                    }
                }

                if (isInitialFetch.current) {
                    setExpandedLenders(prev => {
                        const init = { ...prev };
                        const allLenders = [...new Set([...transactions.map(t => t.lender), ...fetchedNames, ...Object.keys(BASE_LENDER_CURRENCY)])];
                        allLenders.forEach(b => { if (init[b] === undefined) init[b] = false; });
                        return init;
                    });
                }

                const dict = { ...BASE_LENDER_CURRENCY };
                // Apply null asset_class brokers first, then Debt-specific ones overwrite (priority)
                debtLenders.filter(b => b.asset_class === null).forEach(b => { if (!dict[b.name]) dict[b.name] = b.currency || 'BRL'; });
                debtLenders.filter(b => b.asset_class === 'Debt').forEach(b => dict[b.name] = b.currency || 'BRL');
                deletedLenderNames.forEach(name => delete dict[name]);
                setLenderDict(dict);
                setExplicitDbLenders(fetchedNames);
                isInitialFetch.current = false;
            }
        } catch (e) { console.error('Failed to fetch lenders', e); }
    };

    useEffect(() => { fetchLenders(); }, []);
    useEffect(() => { fetchLenders(); }, [deletedLenderNames]);

    // Auto-expand lenders when searching
    useEffect(() => {
        if (searchTerm) {
            const matching = {};
            transactions.forEach(t => {
                if ((t.lender || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (t.obs || '').toLowerCase().includes(searchTerm.toLowerCase())) {
                    matching[t.lender] = true;
                }
            });
            setExpandedLenders(matching);
        }
    }, [searchTerm, transactions]);

    // Transaction handlers
    const handleDeleteClick = (id) => { setTrToDelete(id); setIsDeleteModalOpen(true); };
    const handleConfirmDelete = async () => {
        if (!trToDelete) return;
        try {
            await fetch(`/api/debt-transactions?id=${trToDelete}`, { method: 'DELETE' });
            if (onRefresh) onRefresh();
            setIsDeleteModalOpen(false); setTrToDelete(null);
        } catch (e) { console.error(e); }
    };

    const handleDeleteLenderClick = (lenderName) => {
        setLenderToDelete(lenderName);
        setIsDeleteLenderModalOpen(true);
    };

    const handleConfirmDeleteLender = async () => {
        if (!lenderToDelete) return;
        try {
            await fetch(`/api/brokers?name=${encodeURIComponent(lenderToDelete)}`, { method: 'DELETE' });
            setDeletedLenderNames(prev => [...prev, lenderToDelete]);
            setIsDeleteLenderModalOpen(false);
            setLenderToDelete(null);
            if (onRefresh) onRefresh();
        } catch (e) { console.error(e); }
    };

    // Edit transaction handlers
    const handleEditClick = (tr) => {
        setEditingTr({ ...tr });
        setRightPaneMode('edit-transaction');
        setSelectedAsset(null);
    };

    const handleEditChange = (field, value) => {
        setEditingTr(prev => ({ ...prev, [field]: value }));
    };

    const handleEditSave = async () => {
        if (!editingTr) return;
        try {
            const res = await fetch('/api/debt-transactions', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingTr)
            });
            if (res.ok) {
                if (onRefresh) onRefresh();
                setRightPaneMode('default');
                setEditingTr(null);
            }
        } catch (e) { console.error(e); }
    };

    // Add transaction
    const handleNewDebtClick = (lenderName) => {
        const lenderCur = lenderName ? (lenderDict[lenderName] || 'BRL') : (primaryCurrency || 'BRL');
        setAddFormData({
            date: new Date().toISOString().split('T')[0],
            lender: lenderName || '',
            amount: '',
            currency: lenderCur,
            obs: '',
            isSalaryContribution: false,
            transactionType: 'borrow'
        });
        setRightPaneMode('add-transaction');
        setSelectedAsset(null);
    };

    const handleSaveNewDebt = async () => {
        if (!addFormData.lender.trim()) return;
        const amount = parseFloat(addFormData.amount) || 0;
        if (amount === 0) return;
        const sign = addFormData.transactionType === 'payback' ? -1 : 1;
        const val_brl = convertCurrency(amount, addFormData.currency, 'BRL', rates) * sign;
        const val_gbp = convertCurrency(amount, addFormData.currency, 'GBP', rates) * sign;

        try {
            const res = await fetch('/api/debt-transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: addFormData.date,
                    lender: addFormData.lender.trim(),
                    value_brl: val_brl,
                    value_gbp: val_gbp,
                    obs: addFormData.obs || (addFormData.transactionType === 'payback' ? 'Payback' : ''),
                    isSalaryContribution: addFormData.isSalaryContribution
                })
            });
            if (res.ok) {
                if (onRefresh) onRefresh();
                setRightPaneMode('default');
            } else {
                const err = await res.json();
                console.error('Failed to save debt transaction:', err);
            }
        } catch (e) { console.error('Error saving debt:', e); }
    };

    // Compute holdings grouped by lender
    const sortedTransactions = [...transactions].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const lenderSummary = {};
    sortedTransactions.forEach(t => {
        const lender = t.lender || 'Unknown';
        if (!lenderSummary[lender]) {
            lenderSummary[lender] = { lender, total: 0, transactions: [] };
        }
        // Each transaction amount stored as value_brl - convert to lender's currency
        const lenderCur = lenderDict[lender] || 'BRL';
        const amountInLenderCur = convertCurrency(t.value_brl || 0, 'BRL', lenderCur, rates);
        lenderSummary[lender].total += amountInLenderCur;
        lenderSummary[lender].transactions.push(t);
    });

    // Filter by search
    const filteredLenders = Object.keys(lenderSummary).filter(lender =>
        lender.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const lendersFromTransactions = [...new Set(transactions.map(t => t.lender))].filter(Boolean);
    const combinedLenders = [...new Set([...lendersFromTransactions, ...explicitDbLenders, ...Object.keys(lenderDict)])]
        .filter(b => !deletedLenderNames.includes(b))
        .sort((a, b) => {
            const totalA = Math.abs((lenderSummary[a]?.total) || 0);
            const totalB = Math.abs((lenderSummary[b]?.total) || 0);
            const curA = lenderDict[a] || 'BRL';
            const curB = lenderDict[b] || 'BRL';
            const gbpA = convertCurrency(totalA, curA, 'GBP', rates);
            const gbpB = convertCurrency(totalB, curB, 'GBP', rates);
            if (gbpA !== gbpB) return gbpB - gbpA;
            return a.localeCompare(b);
        });

    // Filtered combined lenders based on search
    const displayLenders = searchTerm
        ? combinedLenders.filter(l => l.toLowerCase().includes(searchTerm.toLowerCase()))
        : combinedLenders;

    // Determine topCurrency from lender totals
    const currencyTotals = {};
    combinedLenders.forEach(l => {
        const cur = lenderDict[l] || 'BRL';
        const data = lenderSummary[l];
        if (!data) return;
        const totalGbp = convertCurrency(Math.abs(data.total), cur, 'GBP', rates);
        if (!currencyTotals[cur]) currencyTotals[cur] = 0;
        currencyTotals[cur] += totalGbp;
    });

    let topCurrency = 'BRL';
    let maxAmt = -1;
    Object.entries(currencyTotals).forEach(([cur, amt]) => {
        if (amt > maxAmt) {
            maxAmt = amt;
            topCurrency = cur;
        }
    });
    if (Object.keys(currencyTotals).length === 0) topCurrency = 'BRL';

    // Apply display currency override if set by the user
    const effectiveCurrency = displayCurrencyOverrides?.debt || topCurrency;

    // Compute grand totals in effectiveCurrency
    let grandTotal = 0;
    combinedLenders.forEach(l => {
        const cur = lenderDict[l] || 'BRL';
        const data = lenderSummary[l];
        if (!data) return;
        grandTotal += convertCurrency(data.total, cur, effectiveCurrency, rates);
    });

    const handleRenameAsset = async (oldName, newName, broker) => {
        try {
            const res = await fetch('/api/assets/rename', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldName, newName, broker: broker || oldName, assetClass: 'Debt' })
            });
            const data = await res.json();
            if (!res.ok) return { error: data.error || 'Failed to rename' };
            onRefresh();
            setSelectedAsset(null);
            return { success: true };
        } catch (e) {
            console.error('Rename failed:', e);
            return { error: 'Network error' };
        }
    };

    // Render consolidated hero card
    const renderConsolidated = () => {
        const lenderCards = combinedLenders
            .filter(l => lenderSummary[l])
            .map(l => {
                const s = lenderSummary[l];
                const cur = lenderDict[l] || 'BRL';
                const totalInTop = convertCurrency(s.total, cur, effectiveCurrency, rates);
                return { lender: l, totalInTop, cur, rawTotal: s.total };
            })
            .sort((a, b) => Math.abs(b.totalInTop) - Math.abs(a.totalInTop));

        return (
            <div id="ftue-debt-header" className="glass-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '48px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                <div id="ftue-debt-hero" style={{
                    padding: '24px',
                    background: 'linear-gradient(180deg, rgba(244, 63, 94, 0.08) 0%, rgba(255,255,255,0) 100%)',
                    borderBottom: '1px solid var(--glass-border)',
                    textAlign: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--fg-secondary)', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        💳 Debt Portfolio
                        <DisplayCurrencyPicker topCurrency={topCurrency} category="debt" />
                    </div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>{formatCurrency(grandTotal, effectiveCurrency)}</div>
                </div>

                {lenderCards.length > 0 && (
                    <div id="ftue-debt-lenders" style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                        {lenderCards.map(item => (
                            <div key={item.lender} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 hover:bg-white/[0.06] transition-colors cursor-pointer"
                                onClick={() => {
                                    const el = document.getElementById(encodeURIComponent(item.lender));
                                    if (el) {
                                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        setExpandedLenders(prev => ({ ...prev, [item.lender]: true }));
                                    }
                                }}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-white/80 text-sm font-semibold">{item.lender}</span>
                                    <span className="text-rose-400 text-sm font-bold">{formatCurrency(item.totalInTop, effectiveCurrency)}</span>
                                </div>
                                {item.cur !== effectiveCurrency && (
                                    <div className="text-white/40 text-xs">≈ {formatCurrency(item.rawTotal, item.cur)}</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <HeroDetailDrawer categoryId="debt" effectiveCurrency={effectiveCurrency} totalCurrentValue={grandTotal} />
            </div>
        );
    };

    // Render lender accordion
    const renderLenderTable = (lenderName) => {
        const data = lenderSummary[lenderName] || { total: 0, transactions: [] };
        const lenderCur = lenderDict[lenderName] || 'BRL';
        const totalInTop = convertCurrency(data.total, lenderCur, effectiveCurrency, rates);
        const isNewlyAdded = newlyAddedLenders.includes(lenderName);

        if (!showEmptyLenders && !isNewlyAdded && data.transactions.length === 0) return null;

        const isOpen = expandedLenders[lenderName] || isNewlyAdded;
        const glowClass = isNewlyAdded ? 'shadow-[0_0_25px_rgba(212,175,55,0.4)] border-[#D4AF37] ring-1 ring-[#D4AF37]/50' : '';

        return (
            <div key={lenderName} id={encodeURIComponent(lenderName)} className={`mb-8 rounded-2xl transition-all duration-1000 ${glowClass}`}>
                <div
                    onClick={() => toggleLender(lenderName)}
                    className="flex justify-between items-center mb-4 px-4 py-3 cursor-pointer bg-white/5 hover:bg-white/10 rounded-2xl transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-lg shrink-0">
                            🏦
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white font-semibold">{lenderName}</span>
                            <span className={`text-xs font-medium ${data.total !== 0 ? 'text-rose-400' : 'text-white/40'}`}>
                                {formatCurrency(data.total, lenderCur)}{lenderCur !== effectiveCurrency ? ` · ≈ ${formatCurrency(totalInTop, effectiveCurrency)}` : ''}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                            <span className="text-xl font-bold text-white tracking-tight">{formatCurrency(data.total, lenderCur)}</span>
                            {lenderCur !== effectiveCurrency && <span className="text-xs text-white/40 mt-0.5">≈ {formatCurrency(totalInTop, effectiveCurrency)}</span>}
                        </div>

                        <div className="flex items-center gap-2">
                            {(explicitDbLenders.includes(lenderName) || data.transactions.length === 0) && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteLenderClick(lenderName); }}
                                    className="w-8 h-8 rounded-full bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center transition-colors shrink-0 text-sm"
                                    title="Delete Lender"
                                >
                                    🗑️
                                </button>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); handleNewDebtClick(lenderName); }}
                                className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex items-center justify-center text-lg font-bold transition-colors shrink-0"
                                title="Add Transaction"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>

                {isOpen && data.transactions.length > 0 && (
                    <div className="px-4 pb-4">
                        <div className="bg-white/[0.02] rounded-xl border border-white/5 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="text-left px-4 py-3 text-white/40 text-xs font-medium uppercase tracking-wider">Date</th>
                                        <th className="text-right px-4 py-3 text-white/40 text-xs font-medium uppercase tracking-wider">Amount ({lenderCur})</th>
                                        <th className="text-right px-4 py-3 text-white/40 text-xs font-medium uppercase tracking-wider hidden sm:table-cell">Original (BRL)</th>
                                        <th className="text-left px-4 py-3 text-white/40 text-xs font-medium uppercase tracking-wider hidden md:table-cell">Notes</th>
                                        <th className="px-4 py-3 text-white/40 text-xs font-medium uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.transactions.map((tr, idx) => (
                                        <tr key={tr.id || idx} className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors cursor-pointer"
                                            onClick={() => {
                                                setSelectedAsset({ ...tr, lenderName: lenderName });
                                                setRightPaneMode('default');
                                            }}>
                                            <td className="px-4 py-3 text-white/70 font-mono text-xs">{tr.date}</td>
                                            <td className="px-4 py-3 text-right text-rose-400 font-bold font-mono">{formatCurrency(convertCurrency(tr.value_brl || 0, 'BRL', lenderCur, rates), lenderCur)}</td>
                                            <td className="px-4 py-3 text-right text-white/60 font-mono hidden sm:table-cell">{lenderCur !== 'BRL' ? formatCurrency(tr.value_brl, 'BRL') : '—'}</td>
                                            <td className="px-4 py-3 text-white/50 text-xs hidden md:table-cell max-w-[200px] truncate">{tr.obs || '—'}</td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center gap-1 justify-end">
                                                    <button onClick={(e) => { e.stopPropagation(); handleEditClick(tr); }}
                                                        className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs transition-colors" title="Edit">✏️</button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(tr.id); }}
                                                        className="w-7 h-7 rounded-full bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center text-xs transition-colors" title="Delete">🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {isOpen && data.transactions.length === 0 && (
                    <div className="px-4 pb-4">
                        <div className="bg-white/[0.02] rounded-xl border border-white/5 p-6 text-center">
                            <p className="text-white/40 text-sm">No transactions for this lender yet.</p>
                            <button onClick={() => handleNewDebtClick(lenderName)}
                                className="mt-3 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm font-medium transition-colors text-white/70">
                                Log a Debt
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Render add transaction form in ContextPane
    const renderAddForm = () => (
        <div className="w-full h-full p-6 text-left relative flex flex-col z-10 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <h3 className="font-bebas text-xl tracking-widest text-[#D4AF37] uppercase">
                    {addFormData.transactionType === 'payback' ? 'Log Payback' : 'Log New Debt'}
                </h3>
                <button onClick={() => setRightPaneMode('default')} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors ml-auto"><X size={16} /></button>
            </div>

            <div className="flex flex-col gap-5 flex-1 pb-4">
                {/* Borrow / Payback toggle */}
                <div className="flex rounded-xl border border-white/10 overflow-hidden">
                    <button
                        onClick={() => setAddFormData(prev => ({ ...prev, transactionType: 'borrow' }))}
                        className={`flex-1 py-2.5 text-sm font-semibold tracking-wide transition-all ${addFormData.transactionType === 'borrow'
                            ? 'bg-rose-500/20 text-rose-400 border-r border-white/10'
                            : 'bg-white/[0.02] text-white/40 hover:bg-white/5 border-r border-white/10'
                            }`}
                    >
                        📉 Borrow
                    </button>
                    <button
                        onClick={() => setAddFormData(prev => ({ ...prev, transactionType: 'payback' }))}
                        className={`flex-1 py-2.5 text-sm font-semibold tracking-wide transition-all ${addFormData.transactionType === 'payback'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-white/[0.02] text-white/40 hover:bg-white/5'
                            }`}
                    >
                        📈 Payback
                    </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-white/60 text-xs mb-1">Lender</label>
                        <input type="text" value={addFormData.lender}
                            onChange={e => setAddFormData(prev => ({ ...prev, lender: e.target.value }))}
                            placeholder="e.g. Dad"
                            list="debt-lenders-list"
                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all" />
                        <datalist id="debt-lenders-list">
                            {combinedLenders.map(l => <option key={l} value={l} />)}
                        </datalist>
                    </div>
                    <div className="flex-1">
                        <label className="block text-white/60 text-xs mb-1">Currency</label>
                        <CurrencySelector value={addFormData.currency} onChange={val => setAddFormData(prev => ({ ...prev, currency: val }))} />
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-white/60 text-xs mb-1">Date</label>
                        <input type="date" value={addFormData.date} onChange={e => setAddFormData(prev => ({ ...prev, date: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all [color-scheme:dark]" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-white/60 text-xs mb-1">Amount</label>
                        <input type="number" step="0.01" value={addFormData.amount} onChange={e => setAddFormData(prev => ({ ...prev, amount: e.target.value }))}
                            placeholder="0.00"
                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all font-mono" />
                    </div>
                </div>

                <div>
                    <label className="block text-white/60 text-xs mb-1">Notes</label>
                    <input type="text" value={addFormData.obs} onChange={e => setAddFormData(prev => ({ ...prev, obs: e.target.value }))}
                        placeholder="Optional notes..."
                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all" />
                </div>

                <div className="flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={addFormData.isSalaryContribution || false}
                        onChange={e => setAddFormData(prev => ({ ...prev, isSalaryContribution: e.target.checked }))}
                        id="debt-salary-contribution-pane" className="w-4 h-4 accent-[#D4AF37]" />
                    <label htmlFor="debt-salary-contribution-pane" className="text-white text-sm cursor-pointer">Funded by Salary Contribution</label>
                </div>
            </div>

            <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-white/10 shrink-0">
                <button onClick={() => setRightPaneMode('default')} className="px-5 py-2.5 bg-transparent border border-white/10 rounded-xl text-white/50 text-sm hover:bg-white/5 transition-colors">Cancel</button>
                <button onClick={handleSaveNewDebt} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#1A0F2E] transition-colors" style={{
                    background: addFormData.transactionType === 'payback'
                        ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                        : 'linear-gradient(135deg, #CC5500 0%, #D4AF37 100%)'
                }}>
                    {addFormData.transactionType === 'payback' ? 'Confirm Payback' : 'Confirm'}
                </button>
            </div>
        </div>
    );

    return (
        <PullToRefresh onRefresh={onRefresh} disabledOnDesktop={true}>
            <div className="max-w-[1800px] mx-auto w-full pt-4 lg:pt-8">
                {/* Mobile Search Bar */}
                <div className="mb-8 w-full block lg:hidden relative px-4">
                    <input type="text" placeholder="Search lenders..." value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-12 text-white/90 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all placeholder:text-white/30 backdrop-blur-md shadow-lg" />
                    <span className="absolute left-8 lg:left-4 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
                </div>

                <div className="lg:flex lg:gap-8 lg:items-start">
                    <div className="flex-1 min-w-0">
                    {combinedLenders.length > 0 ? (
                        <>
                            {renderConsolidated()}

                            <div id="ftue-debt-lender-section">
                            {/* Lenders Header & Toggle */}
                            <div className="flex justify-between items-center mb-4 px-2">
                                <h2 className="text-xl font-bold font-bebas tracking-widest text-white/90">Lenders</h2>
                                <button
                                    onClick={() => setShowEmptyLenders(!showEmptyLenders)}
                                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 transition-colors border border-white/5"
                                >
                                    {showEmptyLenders ? 'Hide Empty' : 'Show Empty'}
                                </button>
                            </div>

                            {displayLenders.map(l => renderLenderTable(l))}
                            </div>
                        </>
                    ) : (
                        <div id="ftue-debt-empty">
                        <EmptyState
                            icon="🪶"
                            title="Debt Free"
                            message="You have no outstanding debts tracked. Add a lender to start tracking mortgages, loans, or credit."
                            actionLabel="Add Lender"
                            onAction={() => setRightPaneMode('add-lender')}
                        />
                        </div>
                    )}
                    </div>

                        <div className={`${(selectedAsset || rightPaneMode !== 'default') ? 'block fixed inset-0 z-50 bg-[#0A0612] lg:bg-transparent lg:static lg:block' : 'hidden lg:block'} lg:sticky top-8 h-[100dvh] lg:h-fit overflow-hidden`}>
                            <ContextPane
                                selectedAsset={selectedAsset}
                                rightPaneMode={rightPaneMode}
                                onClose={() => { setSelectedAsset(null); setRightPaneMode('default'); }}
                                onRename={handleRenameAsset}
                                maxHeight={contextPaneMaxHeight}
                                renderHeader={(asset, nameHandledByContextPane) => (
                                    <div className="flex flex-col">
                                        {!nameHandledByContextPane && <h3 className="text-xl font-bold text-white/90 tracking-tight">{asset.lenderName || asset.lender}</h3>}
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] uppercase font-mono tracking-wider">Debt</span>
                                            <span className="text-white/40 text-[10px] font-mono">{asset.date}</span>
                                        </div>
                                    </div>
                                )}
                                renderDetails={(asset) => {
                                    const detailCur = lenderDict[asset.lenderName || asset.lender] || 'BRL';
                                    return (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3">
                                                <span className="block text-[10px] text-rose-400/60 uppercase tracking-widest mb-1.5">Amount ({detailCur})</span>
                                                <span className="text-sm font-bold text-rose-400 font-mono drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]">{formatCurrency(convertCurrency(asset.value_brl || 0, 'BRL', detailCur, rates), detailCur)}</span>
                                            </div>
                                            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                                <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5">Original (BRL)</span>
                                                <span className="text-sm font-medium text-white/90 font-mono">{formatCurrency(asset.value_brl, 'BRL')}</span>
                                            </div>
                                            {asset.obs && (
                                                <div className="col-span-2 bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                                    <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5">Notes</span>
                                                    <span className="text-sm text-white/70">{asset.obs}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }}
                                renderActions={(asset) => (
                                    <div className="flex gap-3">
                                        <button onClick={() => handleEditClick(asset)}
                                            className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors">
                                            Edit
                                        </button>
                                        <button onClick={() => handleDeleteClick(asset.id)}
                                            className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors border border-rose-500/20">
                                            Delete
                                        </button>
                                    </div>
                                )}
                                renderEmptyState={() => {
                                    if (rightPaneMode === 'add-lender') {
                                        return (
                                            <div className="w-full h-full text-left relative flex flex-col z-10">
                                                <div className="flex justify-between items-center mb-6 p-8 pb-0">
                                                    <h3 className="text-lg font-bold text-white">Add Lender</h3>
                                                    <button onClick={() => setRightPaneMode('default')} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors"><span className="text-sm font-bold">✕</span></button>
                                                </div>
                                                <div className="flex-1 overflow-y-auto px-8 pb-8">
                                                    <BrokerForm assetClass="Debt" label="Lender" onSave={() => { setRightPaneMode('default'); fetchLenders(); }} onCancel={() => setRightPaneMode('default')} />
                                                </div>
                                            </div>
                                        );
                                    }

                                    if (rightPaneMode === 'add-transaction') {
                                        return renderAddForm();
                                    }

                                    if (rightPaneMode === 'edit-transaction' && editingTr) {
                                        return (
                                            <div className="w-full h-full p-8 text-left relative flex flex-col z-10">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h3 className="text-lg font-bold text-white">Edit Transaction</h3>
                                                    <button onClick={() => { setRightPaneMode('default'); setEditingTr(null); }} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors"><span className="text-sm font-bold">✕</span></button>
                                                </div>
                                                <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 pb-4">
                                                    {[['date', 'Date'], ['lender', 'Lender'], ['value_brl', 'Amount (BRL)'], ['obs', 'Notes']].map(([field, label]) => (
                                                        <div key={field}>
                                                            <label className="block mb-1 text-white/50 text-xs font-medium uppercase tracking-wider">{label}</label>
                                                            <input type="text" value={editingTr[field] ?? ''}
                                                                onChange={e => handleEditChange(field, e.target.value)}
                                                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all font-mono" />
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-white/10 shrink-0">
                                                    <button onClick={() => { setRightPaneMode('default'); setEditingTr(null); }} className="px-5 py-2.5 bg-transparent border border-white/10 rounded-xl text-white/50 text-sm hover:bg-white/5 transition-colors">Cancel</button>
                                                    <button onClick={handleEditSave} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#1A0F2E] transition-colors" style={{ background: 'linear-gradient(135deg, #CC5500 0%, #D4AF37 100%)' }}>Save</button>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="p-8 pb-4 h-full flex flex-col items-center justify-center text-center relative z-10 space-y-8">
                                            {/* Desktop Search */}
                                            <div className="w-full max-w-md relative">
                                                <input type="text" placeholder="Search lenders..." value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-12 text-white border-none focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all placeholder:text-white/30 backdrop-blur-md shadow-2xl" />
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
                                            </div>
                                            <div className="flex-1 flex flex-col items-center justify-center -mt-16 w-full max-w-[280px] mx-auto opacity-60">
                                                <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center mb-6 ring-1 ring-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.1)]">
                                                    <span className="text-3xl filter grayscale opacity-70">💳</span>
                                                </div>
                                                <h3 className="text-xl font-bold text-white tracking-tight font-bebas tracking-widest mb-3">Select a Debt</h3>
                                                <p className="text-sm text-parchment/60 leading-relaxed max-w-[250px] mx-auto">
                                                    Click on any transaction from a lender to view details and edit or delete entries.
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }}
                            />
                        </div>
                    </div>

                {/* Transaction Ledger / Activity History */}
                <section id="ftue-debt-ledger" className="max-w-3xl mx-auto mb-10 mt-12">
                    <div className="flex justify-between items-center mb-6 px-1">
                        <h3 className="text-lg font-medium text-white/90 flex items-center gap-2">
                            Activity History
                        </h3>
                        <button
                            onClick={() => setLedgerOpen(!ledgerOpen)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm font-medium transition-colors"
                        >
                            {ledgerOpen ? 'Hide' : 'Show'} ({sortedTransactions.length})
                        </button>
                    </div>

                    {ledgerOpen && (
                        <div className="bg-white/5 backdrop-blur-md border border-white/5 rounded-3xl p-4 sm:p-6 mb-24">
                            <TransactionTimeline
                                transactions={sortedTransactions}
                                onEdit={handleEditClick}
                                onDelete={handleDeleteClick}
                                renderItem={(tr) => (
                                    <>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-2 h-2 rounded-full bg-rose-500" />
                                            <span className="font-semibold text-sm text-white/90">
                                                Payment <span className="text-white/60">{tr.lender}</span>
                                            </span>
                                            <span className="text-xs text-white/40 ml-auto">{tr.date}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-white tracking-tight">
                                                {formatCurrency(tr.value_brl, 'BRL')}
                                            </span>
                                            <span className="text-xs text-white/40">• {tr.obs || 'No notes'}</span>
                                        </div>
                                    </>
                                )}
                            />
                        </div>
                    )}
                </section>

                <FloatingActionButton
                    onAddBroker={() => {
                        setRightPaneMode('add-lender');
                        setSelectedAsset(null);
                    }}
                    onAddTransaction={() => {
                        handleNewDebtClick('');
                    }}
                    brokerLabel="Add Lender"
                />

                <ConfirmationModal
                    isOpen={isDeleteModalOpen}
                    title="Delete Transaction"
                    message="Are you sure you want to delete this debt entry? This action cannot be undone."
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setIsDeleteModalOpen(false)}
                />
                <ConfirmationModal
                    isOpen={isDeleteLenderModalOpen}
                    title="Delete Lender"
                    message={`Are you sure you want to delete ${lenderToDelete}? All transactions for this lender will also be deleted.`}
                    onCancel={() => setIsDeleteLenderModalOpen(false)}
                    onConfirm={handleConfirmDeleteLender}
                />
            </div>
            <PageTutorialOverlay pageId="debt" steps={DEBT_TUTORIAL_STEPS} />
        </PullToRefresh>
    );
}
