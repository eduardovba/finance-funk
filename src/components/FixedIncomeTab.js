import React, { useState, useEffect, useRef } from 'react';
import { formatCurrency, convertCurrency } from '@/lib/currency';
import ConfirmationModal from './ConfirmationModal';
import { X } from 'lucide-react';
import AssetCard from './AssetCard';
import TransactionTimeline from './TransactionTimeline';
import FloatingActionButton from './FloatingActionButton';
import EmptyState from './EmptyState';
import PullToRefresh from './PullToRefresh';


import ContextPane from './ContextPane';
import useContextPaneHeight from '@/hooks/useContextPaneHeight';
import BrokerForm from './BrokerForm';
import { usePortfolio } from '@/context/PortfolioContext';
import DisplayCurrencyPicker from './DisplayCurrencyPicker';
import PageTutorialOverlay from './ftue/PageTutorialOverlay';
import HeroDetailDrawer from './HeroDetailDrawer';

const FIXEDINCOME_TUTORIAL_STEPS = [
    { type: 'spotlight', targetId: 'ftue-fi-header', title: 'Portfolio Overview', message: "Your total fixed income value, deposits, interest earned, and a breakdown by account. Switch display currency with the picker.", position: 'bottom' },
    { type: 'spotlight', targetId: 'ftue-fi-account-section', title: 'Account Details', message: "Expand each account to see holdings, maturity dates, and interest earned. Every deposit and interest payment is tracked.", position: 'bottom' },
    { type: 'spotlight', targetId: 'ftue-fi-ledger', title: 'Activity History', message: "Deposits, withdrawals, and interest payments are all logged here. Interest is tracked automatically.", position: 'top' },
    // Empty state
    { type: 'spotlight', targetId: 'ftue-fi-empty', title: 'Get Started', message: "No fixed income accounts yet. Use the + button to add a savings account, bond, or treasury product.", position: 'top' },
    // Always visible
    { type: 'spotlight', targetId: 'global-fab', title: 'Add Account', message: "Use the + button to create a new account and start tracking deposits and interest.", position: 'top', shape: 'circle', padding: 8 },
];

const BASE_BROKER_CURRENCY = {
    'XP': 'BRL', 'NuBank': 'BRL', 'Inter': 'BRL', 'Santander': 'BRL', 'Monzo': 'GBP', 'Fidelity': 'GBP'
};

const CATEGORIES = [
    { id: 'Investment', label: 'Deposit' },
    { id: 'Interest', label: 'Interest' },
    { id: 'Withdrawal', label: 'Withdrawal' },
];

export default function FixedIncomeTab({ transactions = [], rates, onRefresh }) {
    const { displayCurrencyOverrides } = usePortfolio();

    const [ledgerOpen, setLedgerOpen] = useState(false);
    const [expandedBrokers, setExpandedBrokers] = useState({});
    const toggleBroker = (b) => setExpandedBrokers(prev => ({ ...prev, [b]: !prev[b] }));

    const [selectedAsset, setSelectedAsset] = useState(null);
    const [rightPaneMode, setRightPaneMode] = useState('default');
    const [searchTerm, setSearchTerm] = useState('');
    const contextPaneMaxHeight = useContextPaneHeight('ftue-fi-account-section', 'ftue-fi-header');
    const [showEmptyBrokers, setShowEmptyBrokers] = useState(false);

    // Dynamic broker management
    const [brokerDict, setBrokerDict] = useState({ ...BASE_BROKER_CURRENCY });
    const [explicitDbBrokers, setExplicitDbBrokers] = useState([]);
    const [deletedBrokerNames, setDeletedBrokerNames] = useState([]);
    const [newlyAddedBrokers, setNewlyAddedBrokers] = useState([]);
    const isInitialFetch = useRef(true);

    // Add/Edit/Update form state
    const [addData, setAddData] = useState(null);
    const [editingTr, setEditingTr] = useState(null);
    const [updateTarget, setUpdateTarget] = useState(null);
    const [updateNewValue, setUpdateNewValue] = useState('');
    const [updateSaving, setUpdateSaving] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [trToDelete, setTrToDelete] = useState(null);

    // Fetch brokers
    const fetchBrokers = async () => {
        try {
            const res = await fetch('/api/brokers?assetClass=FixedIncome');
            const data = await res.json();
            if (data.brokers) {
                const fiBrokers = data.brokers.filter(b => b.asset_class === 'FixedIncome' || b.asset_class === null);
                const fetchedNames = fiBrokers.map(b => b.name);

                if (!isInitialFetch.current) {
                    const newNames = fetchedNames.filter(name => !explicitDbBrokers.includes(name) && !deletedBrokerNames.includes(name));
                    if (newNames.length > 0) {
                        setNewlyAddedBrokers(prev => [...new Set([...prev, ...newNames])]);
                        const expansions = {};
                        newNames.forEach(n => expansions[n] = true);
                        setExpandedBrokers(prev => ({ ...prev, ...expansions }));
                    }
                }

                const dict = { ...BASE_BROKER_CURRENCY };
                fiBrokers.filter(b => b.asset_class === null).forEach(b => { if (!dict[b.name]) dict[b.name] = b.currency || 'BRL'; });
                fiBrokers.filter(b => b.asset_class === 'FixedIncome').forEach(b => dict[b.name] = b.currency || 'BRL');
                deletedBrokerNames.forEach(name => delete dict[name]);
                setBrokerDict(dict);
                setExplicitDbBrokers(fetchedNames);
                isInitialFetch.current = false;
            }
        } catch (e) { console.error('Failed to fetch brokers', e); }
    };

    useEffect(() => { fetchBrokers(); }, []);
    useEffect(() => { fetchBrokers(); }, [deletedBrokerNames]);

    // Auto-expand brokers when searching
    useEffect(() => {
        if (searchTerm) {
            const expanded = {};
            Object.keys(brokerDict).forEach(b => { expanded[b] = true; });
            setExpandedBrokers(prev => ({ ...prev, ...expanded }));
        }
    }, [searchTerm]);

    const normalizedBroker = (name) => {
        if (!name) return 'Unknown';
        const lower = name.toLowerCase();
        if (lower.includes('nubank')) return 'NuBank';
        if (lower.includes('xp')) return 'XP';
        if (lower.includes('inter')) return 'Inter';
        if (lower.includes('santander')) return 'Santander';
        if (lower.includes('monzo')) return 'Monzo';
        if (lower.includes('fidelity')) return 'Fidelity';
        return name;
    };

    // 1. Group by Broker & Calculate Holdings
    const computeHoldings = () => {
        const holdings = {};
        const brokerListFromTx = new Set();

        transactions.forEach(tr => {
            const broker = normalizedBroker(tr.broker);
            const key = `${tr.asset}|${broker}`;
            if (!holdings[key]) {
                holdings[key] = { name: tr.asset, broker, currency: tr.currency, investment: 0, interest: 0, syncValue: null };
            }
            brokerListFromTx.add(broker);
            if (tr.notes === 'Pluggy Sync') {
                holdings[key].syncValue = (holdings[key].syncValue || 0) + (tr.investment || 0);
            }
        });

        transactions.forEach(tr => {
            const broker = normalizedBroker(tr.broker);
            const key = `${tr.asset}|${broker}`;
            const h = holdings[key];
            if (tr.type === 'Interest') {
                h.interest += (tr.investment || 0) + (tr.interest || 0);
            } else if (tr.notes !== 'Pluggy Sync') {
                if (h.syncValue === null) {
                    h.investment += (tr.investment || 0);
                }
            }
        });

        let activeList = Object.values(holdings).map(h => {
            let currentValue, investment;
            if (h.syncValue !== null) {
                investment = h.syncValue;
                currentValue = h.syncValue + h.interest;
            } else {
                investment = h.investment;
                currentValue = investment + h.interest;
            }
            return {
                ...h, currentValue, investment,
                roi: Math.abs(investment) > 0.1 ? (h.interest / Math.abs(investment) * 100) : 0
            };
        }).filter(h => Math.abs(h.currentValue) >= 10);

        // --- XP Custom Split Logic ---
        const xpCoreItems = activeList.filter(a => a.broker === 'XP' && !['Post-fixated', 'Inflation', 'Pre-fixated'].includes(a.name));
        const xpManualItems = activeList.filter(a => a.broker === 'XP' && ['Post-fixated', 'Inflation', 'Pre-fixated'].includes(a.name));
        if (xpCoreItems.length > 0) {
            const xpTotalVal = xpCoreItems.reduce((sum, item) => sum + item.currentValue, 0);
            const xpTotalInv = xpCoreItems.reduce((sum, item) => sum + item.investment, 0);
            const postVal = 182532.02, infVal = 96098.50, preVal = 91647.14;
            const totalValScr = postVal + infVal + preVal;
            const postValRatio = postVal / totalValScr, infValRatio = infVal / totalValScr, preValRatio = preVal / totalValScr;
            const postInv = postVal / 1.1824, infInv = infVal / 1.1545, preInv = preVal / 1.1523;
            const totalInvScr = postInv + infInv + preInv;
            const postInvRatio = postInv / totalInvScr, infInvRatio = infInv / totalInvScr, preInvRatio = preInv / totalInvScr;

            const makeSubAsset = (subName, valRatio, invRatio) => {
                const subCurVal = xpTotalVal * valRatio, subInv = xpTotalInv * invRatio, subInt = subCurVal - subInv;
                const manual = xpManualItems.find(m => m.name === subName);
                const finalCurVal = subCurVal + (manual ? manual.currentValue : 0);
                const finalInv = subInv + (manual ? manual.investment : 0);
                const finalInt = subInt + (manual ? manual.interest : 0);
                return {
                    name: subName, isXPSubAccount: true, broker: 'XP', currency: xpCoreItems[0].currency,
                    currentValue: finalCurVal, investment: finalInv, interest: finalInt,
                    roi: Math.abs(finalInv) > 0.1 ? (finalInt / Math.abs(finalInv) * 100) : 0
                };
            };
            activeList = activeList.filter(a => a.broker !== 'XP');
            activeList.push(makeSubAsset('Post-fixated', postValRatio, postInvRatio), makeSubAsset('Inflation', infValRatio, infInvRatio), makeSubAsset('Pre-fixated', preValRatio, preInvRatio));
        }

        return activeList;
    };

    const activeHoldings = computeHoldings();

    // Dynamic broker list
    const brokers_from_transactions = [...new Set(activeHoldings.map(h => h.broker))];
    const combined_brokers = [...new Set([...brokers_from_transactions, ...explicitDbBrokers])]
        .filter(b => !deletedBrokerNames.includes(b));
    // Sort by total value (largest first)
    const brokerValueMap = {};
    combined_brokers.forEach(b => {
        const cur = brokerDict[b] || BASE_BROKER_CURRENCY[b] || 'BRL';
        const items = activeHoldings.filter(h => h.broker === b);
        let total = items.reduce((acc, h) => acc + Math.abs(h.currentValue), 0);
        if (cur !== 'GBP' && rates) {
            if (cur === 'USD') total = total / rates.USD;
            if (cur === 'BRL') total = total / rates.BRL;
        }
        brokerValueMap[b] = total;
    });
    combined_brokers.sort((a, b) => (brokerValueMap[b] || 0) - (brokerValueMap[a] || 0) || a.localeCompare(b));
    const brokers_list = combined_brokers;

    // TopCurrency
    const currencyTotals = {};
    brokers_list.forEach(b => {
        const cur = brokerDict[b] || BASE_BROKER_CURRENCY[b] || 'BRL';
        const items = activeHoldings.filter(h => h.broker === b);
        const totalVal = items.reduce((acc, h) => acc + Math.abs(h.currentValue), 0);
        let totalValGBP = totalVal;
        if (cur !== 'GBP' && rates) {
            if (cur === 'USD') totalValGBP = totalVal / rates.USD;
            if (cur === 'BRL') totalValGBP = totalVal / rates.BRL;
        }
        if (!currencyTotals[cur]) currencyTotals[cur] = 0;
        currencyTotals[cur] += totalValGBP;
    });
    let topCurrency = 'BRL';
    let maxCurrAmt = -1;
    Object.entries(currencyTotals).forEach(([cur, amt]) => {
        if (amt > maxCurrAmt) { maxCurrAmt = amt; topCurrency = cur; }
    });
    if (Object.keys(currencyTotals).length === 0) topCurrency = 'BRL';

    // Apply display currency override if set by the user
    const effectiveCurrency = displayCurrencyOverrides?.fixedIncome || topCurrency;

    const toBase = (amount, currency) => {
        if (!rates) return amount;
        return convertCurrency(amount, currency, effectiveCurrency, rates);
    };

    // 2. Actions
    const handleAddClick = (brokerName, assetName) => {
        const cur = brokerDict[brokerName] || BASE_BROKER_CURRENCY[brokerName] || 'BRL';
        setAddData({
            date: new Date().toISOString().split('T')[0],
            asset: assetName || '', broker: brokerName, investment: '', interest: '',
            type: 'Investment', currency: cur, notes: ''
        });
        setRightPaneMode('add-transaction');
    };

    const handleSaveAdd = async () => {
        if (!addData.asset || (!addData.investment && !addData.interest)) return;
        try {
            await fetch('/api/fixed-income', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(addData)
            });
            onRefresh();
            setRightPaneMode('default');
        } catch (e) { console.error(e); }
    };

    const handleEditClick = (tr) => {
        setEditingTr({ ...tr });
        setRightPaneMode('edit-transaction');
    };

    const handleSaveEdit = async () => {
        try {
            await fetch('/api/fixed-income', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingTr)
            });
            onRefresh();
            setRightPaneMode('default');
        } catch (e) { console.error(e); }
    };

    const handleDeleteClick = (id) => {
        setTrToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        try {
            await fetch(`/api/fixed-income?id=${trToDelete}`, { method: 'DELETE' });
            onRefresh();
            setIsDeleteModalOpen(false);
        } catch (e) { console.error(e); }
    };

    const handleUpdateClick = (item) => {
        setUpdateTarget(item);
        setUpdateNewValue('');
        setRightPaneMode('update-value');
    };

    const handleSaveUpdate = async () => {
        if (!updateTarget || !updateNewValue) return;
        const newVal = parseFloat(updateNewValue);
        if (isNaN(newVal) || newVal <= 0) return;
        const interestAmount = newVal - updateTarget.currentValue;
        if (Math.abs(interestAmount) < 0.01) { setRightPaneMode('default'); return; }
        setUpdateSaving(true);
        try {
            await fetch('/api/fixed-income', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: new Date().toISOString().split('T')[0],
                    asset: updateTarget.name, broker: updateTarget.broker,
                    interest: interestAmount, investment: 0, type: 'Interest',
                    currency: updateTarget.currency || 'BRL',
                    notes: `Value Update: ${updateTarget.name}`
                })
            });
            onRefresh();
            setRightPaneMode('default');
        } catch (e) { console.error(e); }
        setUpdateSaving(false);
    };

    const handleDeleteBroker = async (brokerName) => {
        if (!confirm(`Delete broker "${brokerName}" and all its data?`)) return;
        try {
            const broker = explicitDbBrokers.includes(brokerName);
            if (broker) {
                const brokersRes = await fetch('/api/brokers?assetClass=FixedIncome');
                const brokersData = await brokersRes.json();
                const b = brokersData.brokers?.find(bb => bb.name === brokerName);
                if (b) await fetch(`/api/brokers?id=${b.id}`, { method: 'DELETE' });
            }
            setDeletedBrokerNames(prev => [...prev, brokerName]);
            setNewlyAddedBrokers(prev => prev.filter(n => n !== brokerName));
        } catch (e) { console.error('Failed to delete broker:', e); }
    };

    // 3. Render Helpers
    const renderBrokerTable = (brokerName) => {
        const items = activeHoldings.filter(h => h.broker === brokerName)
            .filter(h => !searchTerm || h.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => b.currentValue - a.currentValue);
        const isNewlyAdded = newlyAddedBrokers.includes(brokerName);
        if (!showEmptyBrokers && !isNewlyAdded && items.length === 0) return null;

        const cur = brokerDict[brokerName] || BASE_BROKER_CURRENCY[brokerName] || 'BRL';
        const totalValue = items.reduce((sum, i) => sum + i.currentValue, 0);
        const totalInv = items.reduce((sum, i) => sum + i.investment, 0);
        const totalInt = items.reduce((sum, i) => sum + i.interest, 0);
        const totalROI = Math.abs(totalInv) > 0.1 ? (totalInt / Math.abs(totalInv) * 100) : 0;

        const isOpen = expandedBrokers[brokerName] || isNewlyAdded;
        const glowClass = isNewlyAdded ? 'shadow-[0_0_25px_rgba(212,175,55,0.4)] border-[#D4AF37] ring-1 ring-[#D4AF37]/50' : '';

        return (
            <div key={brokerName} id={encodeURIComponent(brokerName)} className={`mb-8 rounded-2xl transition-all duration-1000 ${glowClass}`}>
                <div
                    onClick={() => toggleBroker(brokerName)}
                    className="flex justify-between items-center mb-4 px-4 py-3 cursor-pointer bg-white/5 hover:bg-white/10 rounded-2xl transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <span className="text-white/40 transform transition-transform duration-300 text-xs" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                        <div className="flex flex-col">
                            <h3 className="text-lg font-semibold text-white/90 m-0">{brokerName}</h3>
                            <span className={`text-xs font-semibold mt-0.5 ${totalInt >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {totalInt >= 0 ? '+' : ''}{formatCurrency(totalInt, cur)} ({totalROI >= 0 ? '+' : ''}{totalROI.toFixed(1)}%)
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                            <span className="text-xl font-bold text-white tracking-tight">{formatCurrency(totalValue, cur)}</span>
                            <span className="text-xs text-white/40 mt-0.5">Principal: {formatCurrency(totalInv, cur)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            {(explicitDbBrokers.includes(brokerName) || items.length === 0) && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteBroker(brokerName); }}
                                    className="w-8 h-8 rounded-full bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center transition-colors shrink-0 text-sm"
                                    title="Delete Broker"
                                >
                                    🗑️
                                </button>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); handleAddClick(brokerName); }}
                                className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex items-center justify-center text-lg font-bold transition-colors shrink-0"
                                title="Add Transaction"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>

                {isOpen && items.length > 0 && (
                    <>
                        {/* Mobile & Tablet Card Grid View */}
                        <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {items.map(item => (
                                <AssetCard
                                    key={item.name}
                                    title={item.name}
                                    subtitle={item.broker}
                                    value={formatCurrency(item.currentValue, cur)}
                                    performance={`${item.interest >= 0 ? '+' : ''}${formatCurrency(item.interest, cur)} (${item.roi >= 0 ? '+' : ''}${item.roi.toFixed(1)}%)`}
                                    isPositive={item.interest >= 0}
                                    icon={item.name.substring(0, 1)}
                                    expandedContent={
                                        <div className="flex flex-col gap-3 py-2">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <span className="block text-xs text-white/40 mb-1">Principal</span>
                                                    <span className="text-sm font-medium text-white/90">{formatCurrency(item.investment, cur)}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-xs text-white/40 mb-1">Accrued Interest</span>
                                                    <span className="text-sm font-medium text-[#10b981]">{formatCurrency(item.interest, cur)}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleUpdateClick(item); }}
                                                    className="flex-1 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-semibold transition-colors"
                                                >
                                                    Update Value
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleAddClick(brokerName); }}
                                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-sm font-semibold transition-colors"
                                                >
                                                    Add Transaction
                                                </button>
                                            </div>
                                        </div>
                                    }
                                />
                            ))}
                        </div>

                        {/* Desktop List View — Trading 212 Style */}
                        <div className="hidden lg:block">
                            <div className="overflow-hidden rounded-xl border border-white/5 bg-black/40 backdrop-blur-sm shadow-xl divide-y divide-white/[0.04]">
                                {items.map(item => {
                                    const isSelected = selectedAsset && selectedAsset.name === item.name;
                                    const displayName = item.name.length > 25 ? item.name.substring(0, 24) + '…' : item.name;

                                    return (
                                        <div
                                            key={item.name}
                                            onClick={() => { setSelectedAsset(item); setRightPaneMode('default'); }}
                                            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 group ${isSelected
                                                ? 'bg-white/[0.08] border-l-2 border-l-[#D4AF37]'
                                                : 'hover:bg-white/[0.04] border-l-2 border-l-transparent'
                                                }`}
                                        >
                                            {/* Icon */}
                                            <div className="w-9 h-9 min-w-[36px] rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-400 shrink-0">
                                                {item.name.substring(0, 2)}
                                            </div>

                                            {/* Name & Subtitle */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-white/90 truncate leading-tight">{displayName}</p>
                                                <p className="text-[11px] text-white/40 mt-0.5 font-mono">
                                                    Principal: {formatCurrency(item.investment, cur)}
                                                </p>
                                            </div>

                                            {/* Value & Interest */}
                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-bold text-white tracking-tight leading-tight">{formatCurrency(item.currentValue, cur)}</p>
                                                <p className={`text-[11px] mt-0.5 font-semibold ${item.interest >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {item.interest >= 0 ? '+' : ''}{formatCurrency(item.interest, cur)} ({item.roi >= 0 ? '+' : ''}{item.roi.toFixed(1)}%)
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                {isOpen && items.length === 0 && (
                    <div className="px-4 pb-4">
                        <div className="bg-white/[0.02] rounded-xl border border-white/5 p-6 text-center">
                            <p className="text-white/40 text-sm">No holdings in this broker yet.</p>
                            <button onClick={() => handleAddClick(brokerName)}
                                className="mt-3 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm font-medium transition-colors text-white/70">
                                Add a Transaction
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Consolidated Hero
    const renderConsolidated = () => {
        let grandTotal = 0, grandInv = 0;
        const brokerSummaries = brokers_list.map(b => {
            const items = activeHoldings.filter(h => h.broker === b);
            const cur = brokerDict[b] || BASE_BROKER_CURRENCY[b] || 'BRL';
            const val = items.reduce((sum, i) => sum + i.currentValue, 0);
            const inv = items.reduce((sum, i) => sum + i.investment, 0);
            const interest = items.reduce((sum, i) => sum + i.interest, 0);
            const valInTop = toBase(val, cur);
            const invInTop = toBase(inv, cur);
            grandTotal += valInTop;
            grandInv += invInTop;
            const roi = Math.abs(invInTop) > 0.1 ? ((valInTop - invInTop) / Math.abs(invInTop) * 100) : 0;
            return { broker: b, currentValue: valInTop, investment: invInTop, pnl: valInTop - invInTop, roi, nativeVal: val, nativeCur: cur };
        }).filter(s => s.currentValue > 0.01 || s.investment > 0.01);

        const grandPnL = grandTotal - grandInv;
        const grandROI = Math.abs(grandInv) > 0.1 ? (grandPnL / Math.abs(grandInv) * 100) : 0;

        return (
            <div id="ftue-fi-header" className="glass-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '48px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div id="ftue-fi-hero" style={{
                    padding: '24px',
                    background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(255,255,255,0) 100%)',
                    borderBottom: '1px solid var(--glass-border)',
                    textAlign: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--fg-secondary)', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        📊 Fixed Income Portfolio
                        <DisplayCurrencyPicker topCurrency={topCurrency} category="fixedIncome" />
                    </div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>{formatCurrency(grandTotal, effectiveCurrency)}</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--fg-secondary)' }}>Invested: {formatCurrency(grandInv, effectiveCurrency)}</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: grandPnL >= 0 ? 'var(--vu-green)' : 'var(--error)' }}>
                            {grandPnL >= 0 ? '+' : ''}{formatCurrency(grandPnL, effectiveCurrency)} ({grandROI >= 0 ? '+' : ''}{grandROI.toFixed(1)}%)
                        </span>
                    </div>
                </div>

                <div id="ftue-fi-accounts" style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    {brokerSummaries.map(s => (
                        <div key={s.broker}
                            onClick={() => {
                                const el = document.getElementById(encodeURIComponent(s.broker));
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className="cursor-pointer hover:bg-white/5 transition-colors"
                            style={{ padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}
                        >
                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: s.pnl >= 0 ? '#10b981' : '#ef4444', borderRadius: '3px 0 0 3px' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff', marginBottom: '4px' }}>{s.broker}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--fg-secondary)' }}>{formatCurrency(s.nativeVal, s.nativeCur)}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>{formatCurrency(s.currentValue, effectiveCurrency)}</div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: s.pnl >= 0 ? 'var(--vu-green)' : 'var(--error)', marginTop: '2px' }}>
                                        {s.pnl >= 0 ? '+' : ''}{formatCurrency(s.pnl, effectiveCurrency)} ({s.roi >= 0 ? '+' : ''}{s.roi.toFixed(1)}%)
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <HeroDetailDrawer categoryId="fixed-income" effectiveCurrency={effectiveCurrency} totalCurrentValue={grandTotal} />
            </div>
        );
    };

    // Add Transaction Form (ContextPane)
    const handleRenameAsset = async (oldName, newName, broker) => {
        try {
            const res = await fetch('/api/assets/rename', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldName, newName, broker, assetClass: 'Fixed Income' })
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

    const renderAddForm = () => (
        <div className="w-full h-full p-6 text-left relative flex flex-col z-10 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <h3 className="font-bebas text-xl tracking-widest text-[#D4AF37] uppercase">Add Transaction</h3>
                <button onClick={() => setRightPaneMode('default')} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors ml-auto"><X size={16} /></button>
            </div>
            <div className="flex flex-col gap-5 flex-1 pb-4">
                {/* Type toggle */}
                <div className="flex rounded-xl border border-white/10 overflow-hidden">
                    {CATEGORIES.map(c => (
                        <button key={c.id}
                            onClick={() => setAddData(prev => ({ ...prev, type: c.id }))}
                            className={`flex-1 py-2.5 text-xs font-semibold tracking-wide transition-all ${addData?.type === c.id
                                ? c.id === 'Interest' ? 'bg-emerald-500/20 text-emerald-400' : c.id === 'Withdrawal' ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'
                                : 'bg-white/[0.02] text-white/40 hover:bg-white/5'
                                }`}
                        >{c.label}</button>
                    ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-white/60 text-xs mb-1">Asset Name</label>
                        <input type="text" value={addData?.asset || ''} onChange={e => setAddData(prev => ({ ...prev, asset: e.target.value }))}
                            placeholder="e.g. CDB Banco C6" className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-white/60 text-xs mb-1">Broker</label>
                        <input type="text" value={addData?.broker || ''} onChange={e => setAddData(prev => ({ ...prev, broker: e.target.value }))}
                            placeholder="e.g. XP" list="fi-brokers-list"
                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all" />
                        <datalist id="fi-brokers-list">
                            {brokers_list.map(b => <option key={b} value={b} />)}
                        </datalist>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-white/60 text-xs mb-1">Date</label>
                        <input type="date" value={addData?.date || ''} onChange={e => setAddData(prev => ({ ...prev, date: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all [color-scheme:dark]" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-white/60 text-xs mb-1">{addData?.type === 'Interest' ? 'Interest Amount' : 'Amount'}</label>
                        <input type="number" step="0.01"
                            value={addData?.type === 'Interest' ? (addData?.interest || '') : (addData?.investment || '')}
                            onChange={e => {
                                if (addData?.type === 'Interest') setAddData(prev => ({ ...prev, interest: e.target.value }));
                                else setAddData(prev => ({ ...prev, investment: e.target.value }));
                            }}
                            placeholder="0.00" className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all font-mono" />
                    </div>
                </div>

                <div>
                    <label className="block text-white/60 text-xs mb-1">Notes</label>
                    <input type="text" value={addData?.notes || ''} onChange={e => setAddData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Optional notes..." className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all" />
                </div>
            </div>
            <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-white/10 shrink-0">
                <button onClick={() => setRightPaneMode('default')} className="px-5 py-2.5 bg-transparent border border-white/10 rounded-xl text-white/50 text-sm hover:bg-white/5 transition-colors">Cancel</button>
                <button onClick={handleSaveAdd} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#1A0F2E] transition-colors" style={{ background: 'linear-gradient(135deg, #CC5500 0%, #D4AF37 100%)' }}>Confirm</button>
            </div>
        </div>
    );

    // Edit Transaction Form (ContextPane)
    const renderEditForm = () => (
        <div className="w-full h-full p-6 text-left relative flex flex-col z-10 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <h3 className="font-bebas text-xl tracking-widest text-[#D4AF37] uppercase">Edit Transaction</h3>
                <button onClick={() => setRightPaneMode('default')} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors ml-auto"><X size={16} /></button>
            </div>
            <div className="flex flex-col gap-5 flex-1 pb-4">
                <div className="flex rounded-xl border border-white/10 overflow-hidden">
                    {CATEGORIES.map(c => (
                        <button key={c.id}
                            onClick={() => setEditingTr(prev => ({ ...prev, type: c.id }))}
                            className={`flex-1 py-2.5 text-xs font-semibold tracking-wide transition-all ${editingTr?.type === c.id
                                ? c.id === 'Interest' ? 'bg-emerald-500/20 text-emerald-400' : c.id === 'Withdrawal' ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'
                                : 'bg-white/[0.02] text-white/40 hover:bg-white/5'
                                }`}
                        >{c.label}</button>
                    ))}
                </div>

                <div>
                    <label className="block text-white/60 text-xs mb-1">Date</label>
                    <input type="date" value={editingTr?.date || ''} onChange={e => setEditingTr(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all [color-scheme:dark]" />
                </div>

                <div>
                    <label className="block text-white/60 text-xs mb-1">{editingTr?.type === 'Interest' ? 'Interest Amount' : 'Amount'}</label>
                    <input type="number" step="0.01"
                        value={editingTr?.type === 'Interest' ? (editingTr?.interest || '') : (editingTr?.investment || '')}
                        onChange={e => {
                            if (editingTr?.type === 'Interest') setEditingTr(prev => ({ ...prev, interest: e.target.value }));
                            else setEditingTr(prev => ({ ...prev, investment: e.target.value }));
                        }}
                        placeholder="0.00" className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all font-mono" />
                </div>

                <div>
                    <label className="block text-white/60 text-xs mb-1">Notes</label>
                    <input type="text" value={editingTr?.notes || ''} onChange={e => setEditingTr(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Optional notes..." className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all" />
                </div>
            </div>
            <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-white/10 shrink-0">
                <button onClick={() => setRightPaneMode('default')} className="px-5 py-2.5 bg-transparent border border-white/10 rounded-xl text-white/50 text-sm hover:bg-white/5 transition-colors">Cancel</button>
                <button onClick={handleSaveEdit} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#1A0F2E] transition-colors" style={{ background: 'linear-gradient(135deg, #CC5500 0%, #D4AF37 100%)' }}>Save Changes</button>
            </div>
        </div>
    );

    // Update Value Form (ContextPane)
    const renderUpdateForm = () => {
        if (!updateTarget) return null;
        const newVal = parseFloat(updateNewValue);
        const isValid = !isNaN(newVal) && newVal > 0;
        const interestCalc = isValid ? (newVal - updateTarget.currentValue) : 0;
        const cur = updateTarget.currency || 'BRL';

        return (
            <div className="w-full h-full p-6 text-left relative flex flex-col z-10 overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h3 className="font-bebas text-xl tracking-widest text-[#D4AF37] uppercase">Update Value</h3>
                    <button onClick={() => setRightPaneMode('default')} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors ml-auto"><X size={16} /></button>
                </div>

                <div className="flex flex-col gap-5 flex-1 pb-4">
                    {/* Asset info */}
                    <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4">
                        <div className="text-sm font-semibold text-white/90 mb-1">{updateTarget.name}</div>
                        <div className="text-xs text-white/40">{updateTarget.broker}</div>
                    </div>

                    {/* Current stats */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between">
                            <span className="text-white/50 text-xs">Current Tracked Value</span>
                            <span className="text-sm font-semibold text-white/90 font-mono">{formatCurrency(updateTarget.currentValue, cur)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-white/50 text-xs">Accrued Interest (so far)</span>
                            <span className="text-sm font-semibold text-emerald-400 font-mono">+{formatCurrency(updateTarget.interest || 0, cur)}</span>
                        </div>
                    </div>

                    {/* New value input */}
                    <div>
                        <label className="block text-white/60 text-xs mb-1">Enter current value from your broker</label>
                        <input type="number" step="0.01" autoFocus
                            placeholder={`e.g. ${(updateTarget.currentValue * 1.01).toFixed(2)}`}
                            value={updateNewValue}
                            onChange={e => setUpdateNewValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && isValid) handleSaveUpdate(); }}
                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all" />
                    </div>

                    {/* Interest preview */}
                    {isValid && (
                        <div className={`rounded-xl p-4 flex justify-between items-center ${interestCalc >= 0 ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-rose-500/5 border border-rose-500/20'}`}>
                            <span className="text-xs text-white/60">{interestCalc >= 0 ? '📈 Interest to record' : '📉 Adjustment to record'}</span>
                            <span className={`text-lg font-bold font-mono ${interestCalc >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {interestCalc >= 0 ? '+' : ''}{formatCurrency(interestCalc, cur)}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-white/10 shrink-0">
                    <button onClick={() => setRightPaneMode('default')} className="px-5 py-2.5 bg-transparent border border-white/10 rounded-xl text-white/50 text-sm hover:bg-white/5 transition-colors">Cancel</button>
                    <button onClick={handleSaveUpdate} disabled={!isValid || updateSaving}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#1A0F2E] transition-colors disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}>
                        {updateSaving ? 'Saving...' : 'Save Update'}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <PullToRefresh onRefresh={onRefresh} disabledOnDesktop={true}>
            <div className="max-w-[1800px] mx-auto w-full pt-4 lg:pt-8">
                {/* Mobile Search Bar */}
                <div className="mb-8 w-full block lg:hidden relative px-4">
                    <input type="text" placeholder="Search holdings..."
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-12 text-white/90 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all placeholder:text-white/30 backdrop-blur-md shadow-lg" />
                    <span className="absolute left-8 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
                </div>

                <div className="lg:flex lg:gap-8 lg:items-start">
                    <div className="flex-1 min-w-0">
                    {(activeHoldings.length > 0 || transactions.length > 0) ? (
                        <>
                            {renderConsolidated()}

                            <div id="ftue-fi-account-section">
                            <div className="flex justify-between items-center mb-4 px-2">
                                <h2 className="text-xl font-bold font-bebas tracking-widest text-white/90">Brokers</h2>
                                <button onClick={() => setShowEmptyBrokers(!showEmptyBrokers)}
                                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm font-medium transition-colors">
                                    {showEmptyBrokers ? 'Hide Empty' : 'Show Empty'}
                                </button>
                            </div>

                            {brokers_list.map(b => renderBrokerTable(b))}
                            </div>
                        </>
                    ) : (
                        <div id="ftue-fi-empty">
                        <EmptyState
                            icon="🏦"
                            title="No Fixed Income Assets"
                            message="You have no fixed income accounts yet. Add an account to start tracking deposits, bonds, and interest."
                            actionLabel="Add Account"
                            onAction={() => setRightPaneMode('add-broker')}
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
                                        {!nameHandledByContextPane && <h3 className="text-xl font-bold text-white/90 tracking-tight">{asset.name}</h3>}
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="px-2 py-0.5 rounded bg-white/10 text-white/70 text-[10px] font-mono tracking-wider">{asset.broker}</span>
                                        </div>
                                    </div>
                                )}
                                renderDetails={(asset) => {
                                    if (rightPaneMode === 'add-transaction' && addData) return renderAddForm();
                                    if (rightPaneMode === 'edit-transaction' && editingTr) return renderEditForm();
                                    if (rightPaneMode === 'update-value' && updateTarget) return renderUpdateForm();
                                    return (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                                <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5">Principal</span>
                                                <span className="text-sm font-medium text-white/90 font-mono">{formatCurrency(asset.investment, asset.currency || 'BRL')}</span>
                                            </div>
                                            <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl p-3">
                                                <span className="block text-[10px] text-[#D4AF37]/60 uppercase tracking-widest mb-1.5">Current Value</span>
                                                <span className="text-sm font-bold text-[#D4AF37] font-mono drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">{formatCurrency(asset.currentValue, asset.currency || 'BRL')}</span>
                                            </div>
                                            <div className="col-span-2 bg-white/[0.02] border border-white/5 rounded-xl p-3 flex justify-between items-center">
                                                <span className="text-[10px] text-white/40 uppercase tracking-widest">Accrued Interest</span>
                                                <span className={`text-sm font-bold tracking-wider rounded-md font-mono ${asset.interest >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {asset.interest >= 0 ? '+' : ''}{formatCurrency(asset.interest, asset.currency || 'BRL')} ({asset.roi >= 0 ? '+' : ''}{asset.roi.toFixed(1)}%)
                                                </span>
                                            </div>
                                        </div>
                                    );
                                }}
                                renderActions={(asset) => {
                                    if (rightPaneMode !== 'default') return null;
                                    return (
                                    <div className="flex gap-3">
                                        <button onClick={() => handleUpdateClick(asset)}
                                            className="flex-1 py-3 bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/20 rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors">
                                            Update Value
                                        </button>
                                        <button onClick={() => handleAddClick(asset.broker, asset.name)}
                                            className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors">
                                            Add Transaction
                                        </button>
                                    </div>
                                    );
                                }}
                                renderTimeline={(asset) => {
                                    if (rightPaneMode !== 'default') return null;
                                    const assetHistory = transactions.filter(t => t.asset === asset.name && t.broker === asset.broker).sort((a, b) => b.date.localeCompare(a.date));
                                    return (
                                        <TransactionTimeline
                                            transactions={assetHistory}
                                            onEdit={handleEditClick}
                                            onDelete={handleDeleteClick}
                                            renderItem={(tr) => {
                                                const isInterest = tr.type === 'Interest';
                                                const isWithdrawal = tr.type === 'Withdrawal';
                                                const amount = tr.investment + (tr.interest || 0);
                                                return (
                                                    <>
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${isInterest ? 'bg-emerald-500' : isWithdrawal ? 'bg-rose-500' : 'bg-blue-400'}`} />
                                                            <span className="font-medium text-[10px] text-white/90 uppercase tracking-wider font-space">{tr.type}</span>
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-sm font-bold text-white tracking-tight font-mono">{formatCurrency(amount, asset.currency || 'BRL')}</span>
                                                            <span className="text-[10px] text-white/40 font-mono tracking-tight leading-relaxed">{tr.date}</span>
                                                        </div>
                                                    </>
                                                )
                                            }}
                                        />
                                    );
                                }}
                                renderEmptyState={() => {
                                    if (rightPaneMode === 'add-broker') {
                                        return (
                                            <div className="w-full h-full text-left relative flex flex-col z-10">
                                                <div className="flex justify-between items-center mb-6 p-8 pb-0">
                                                    <h3 className="text-lg font-bold text-white">Add Broker</h3>
                                                    <button onClick={() => setRightPaneMode('default')} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors"><span className="text-sm font-bold">✕</span></button>
                                                </div>
                                                <div className="flex-1 overflow-y-auto px-8 pb-8">
                                                    <BrokerForm assetClass="FixedIncome" onSave={() => { setRightPaneMode('default'); fetchBrokers(); }} onCancel={() => setRightPaneMode('default')} />
                                                </div>
                                            </div>
                                        );
                                    }
                                    if (rightPaneMode === 'add-transaction' && addData) return renderAddForm();
                                    if (rightPaneMode === 'edit-transaction' && editingTr) return renderEditForm();
                                    if (rightPaneMode === 'update-value' && updateTarget) return renderUpdateForm();

                                    return (
                                        <div className="p-8 pb-4 h-full flex flex-col items-center justify-center text-center relative z-10 space-y-8">
                                            {/* Desktop Search */}
                                            <div className="w-full max-w-md relative">
                                                <input type="text" placeholder="Search holdings..."
                                                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-12 text-white border-none focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all placeholder:text-white/30 backdrop-blur-md shadow-2xl" />
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
                                            </div>
                                            <div className="flex-1 flex flex-col items-center justify-center -mt-16 w-full max-w-[280px] mx-auto opacity-60">
                                                <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 ring-1 ring-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                                                    <span className="text-3xl filter grayscale opacity-70">📊</span>
                                                </div>
                                                <h3 className="text-xl font-bold text-white tracking-tight font-bebas tracking-widest mb-3">Select an Asset</h3>
                                                <p className="text-sm text-parchment/60 leading-relaxed max-w-[250px] mx-auto">
                                                    Click on any holding to view detailed metrics and transaction history.
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }}
                            />
                        </div>
                    </div>

                {/* Transaction Ledger */}
                <section id="ftue-fi-ledger" className="max-w-3xl mx-auto mb-10 mt-12">
                    <div className="flex justify-between items-center mb-6 px-1">
                        <h3 className="text-lg font-medium text-white/90 flex items-center gap-2">
                            Activity History
                        </h3>
                        <button
                            onClick={() => setLedgerOpen(!ledgerOpen)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm font-medium transition-colors"
                        >
                            {ledgerOpen ? 'Hide' : 'Show'} ({transactions.length})
                        </button>
                    </div>

                    {ledgerOpen && (
                        <div className="bg-white/5 backdrop-blur-md border border-white/5 rounded-3xl p-4 sm:p-6 mb-24">
                            <TransactionTimeline
                                transactions={[...transactions].sort((a, b) => b.date.localeCompare(a.date))}
                                onEdit={handleEditClick}
                                onDelete={handleDeleteClick}
                                renderItem={(tr) => {
                                    const isInterest = tr.type === 'Interest';
                                    const isWithdrawal = tr.type === 'Withdrawal';
                                    const cur = tr.currency || 'BRL';
                                    const amount = tr.investment + (tr.interest || 0);
                                    return (
                                        <>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className={`w-2 h-2 rounded-full ${isInterest ? 'bg-emerald-500' : isWithdrawal ? 'bg-rose-500' : 'bg-blue-400'}`} />
                                                <span className="font-semibold text-sm text-white/90">
                                                    {tr.type} <span className="text-white/60">{tr.asset}</span>
                                                </span>
                                                <span className="text-xs text-white/40 ml-auto">{tr.broker}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-white tracking-tight">{formatCurrency(amount, cur)}</span>
                                                <span className="text-xs text-white/40">• {tr.date}</span>
                                            </div>
                                        </>
                                    )
                                }}
                            />
                        </div>
                    )}
                </section>

                <FloatingActionButton
                    onAddBroker={() => { setRightPaneMode('add-broker'); setSelectedAsset(null); }}
                    onAddTransaction={() => { handleAddClick(brokers_list[0] || ''); }}
                />

                <ConfirmationModal
                    isOpen={isDeleteModalOpen}
                    title="Delete Fixed Income Record"
                    message="Are you sure? This will remove the transaction from your ledger."
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setIsDeleteModalOpen(false)}
                />
            </div>
            <PageTutorialOverlay pageId="fixed-income" steps={FIXEDINCOME_TUTORIAL_STEPS} />
        </PullToRefresh>
    );
}
