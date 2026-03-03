import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/currency';
import ConfirmationModal from './ConfirmationModal';
import CurrencySelector from './CurrencySelector';
import { Plus } from 'lucide-react';

const BROKER_CURRENCY = {
    'XP': 'BRL', 'NuBank': 'BRL', 'Inter': 'BRL', 'Santander': 'BRL', 'Monzo': 'GBP', 'Fidelity': 'GBP'
};

const CATEGORIES = [
    { id: 'Investment', label: 'Deposit/Buy' },
    { id: 'Interest', label: 'Interest/Yield' },
    { id: 'Withdrawal', label: 'Withdrawal/Sell' },
];

export default function FixedIncomeTab({ transactions = [], rates, onRefresh }) {
    const [ledgerOpen, setLedgerOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addData, setAddData] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingTr, setEditingTr] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [trToDelete, setTrToDelete] = useState(null);

    // Update Value state
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [updateTarget, setUpdateTarget] = useState(null); // { name, broker, currency, currentValue, isXPSubAccount }
    const [updateNewValue, setUpdateNewValue] = useState('');
    const [updateSaving, setUpdateSaving] = useState(false);

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
        const holdings = {}; // "key" -> { name, broker, currency, investment, interest, syncValue }
        const brokerList = new Set();

        // Pass 1: Initialize and find sync values
        transactions.forEach(tr => {
            const broker = normalizedBroker(tr.broker);
            const key = `${tr.asset}|${broker}`;
            if (!holdings[key]) {
                holdings[key] = { name: tr.asset, broker: broker, currency: tr.currency, investment: 0, interest: 0, syncValue: null };
            }
            brokerList.add(broker);

            if (tr.notes === 'Pluggy Sync') {
                holdings[key].syncValue = (holdings[key].syncValue || 0) + (tr.investment || 0);
            }
        });

        // Pass 2: Sum historical transactions
        transactions.forEach(tr => {
            const broker = normalizedBroker(tr.broker);
            const key = `${tr.asset}|${broker}`;
            const h = holdings[key];

            if (tr.type === 'Interest') {
                h.interest += (tr.investment || 0) + (tr.interest || 0);
            } else if (tr.notes !== 'Pluggy Sync') {
                // Only add to principal if it's NOT a sync entry (sync is handled as total balance)
                // and only if the asset doesn't have a sync entry (for manual assets)
                if (h.syncValue === null) {
                    h.investment += (tr.investment || 0);
                }
            }
        });

        let activeList = Object.values(holdings).map(h => {
            let currentValue, investment;
            if (h.syncValue !== null) {
                // For synced assets, syncValue is the baseline principal.
                // We add any manual interest accrued safely on top.
                investment = h.syncValue;
                currentValue = h.syncValue + h.interest;
            } else {
                // For manual assets, currentValue = principal + interest
                investment = h.investment;
                currentValue = investment + h.interest;
            }

            return {
                ...h,
                currentValue,
                investment,
                roi: Math.abs(investment) > 0.1 ? (h.interest / Math.abs(investment) * 100) : 0
            };
        }).filter(h => Math.abs(h.currentValue) >= 10); // Hide rows < 10

        // --- XP Custom Split Logic ---
        const xpCoreItems = activeList.filter(a => a.broker === 'XP' && !['Post-fixated', 'Inflation', 'Pre-fixated'].includes(a.name));
        const xpManualItems = activeList.filter(a => a.broker === 'XP' && ['Post-fixated', 'Inflation', 'Pre-fixated'].includes(a.name));

        if (xpCoreItems.length > 0) {
            const xpTotalVal = xpCoreItems.reduce((sum, item) => sum + item.currentValue, 0);
            const xpTotalInv = xpCoreItems.reduce((sum, item) => sum + item.investment, 0);

            // Split the core synced pool
            const postVal = 182532.02;
            const infVal = 96098.50;
            const preVal = 91647.14;
            const totalValScr = postVal + infVal + preVal;

            const postValRatio = postVal / totalValScr;
            const infValRatio = infVal / totalValScr;
            const preValRatio = preVal / totalValScr;

            const postInv = postVal / 1.1824;
            const infInv = infVal / 1.1545;
            const preInv = preVal / 1.1523;
            const totalInvScr = postInv + infInv + preInv;

            const postInvRatio = postInv / totalInvScr;
            const infInvRatio = infInv / totalInvScr;
            const preInvRatio = preInv / totalInvScr;

            const makeSubAsset = (subName, valRatio, invRatio) => {
                const subCurVal = xpTotalVal * valRatio;
                const subInv = xpTotalInv * invRatio;
                const subInt = subCurVal - subInv;

                const manual = xpManualItems.find(m => m.name === subName);
                const finalCurVal = subCurVal + (manual ? manual.currentValue : 0);
                const finalInv = subInv + (manual ? manual.investment : 0);
                const finalInt = subInt + (manual ? manual.interest : 0);

                return {
                    name: subName,
                    isXPSubAccount: true,
                    broker: 'XP',
                    currency: xpCoreItems[0].currency,
                    currentValue: finalCurVal,
                    investment: finalInv,
                    interest: finalInt,
                    roi: Math.abs(finalInv) > 0.1 ? (finalInt / Math.abs(finalInv) * 100) : 0
                };
            };

            // Remove all core and manual XP items, replace with the 3 combined slices
            activeList = activeList.filter(a => a.broker !== 'XP');
            activeList.push(
                makeSubAsset('Post-fixated', postValRatio, postInvRatio),
                makeSubAsset('Inflation', infValRatio, infInvRatio),
                makeSubAsset('Pre-fixated', preValRatio, preInvRatio)
            );
        }

        const activeHoldings = activeList;

        // Calculate Broker Summaries for sorting and filtering
        const toGBP = (amt, c) => (c === 'GBP' ? amt : amt / rates.BRL);

        const brokerSummaryMap = {};
        activeHoldings.forEach(h => {
            if (!brokerSummaryMap[h.broker]) {
                brokerSummaryMap[h.broker] = { name: h.broker, val: 0, valGBP: 0, investment: 0, cur: h.currency };
            }
            brokerSummaryMap[h.broker].val += h.currentValue;
            brokerSummaryMap[h.broker].valGBP += toGBP(h.currentValue, h.currency);
            brokerSummaryMap[h.broker].investment += toGBP(h.investment, h.currency);
        });

        const sortedBrokers = Object.values(brokerSummaryMap)
            .filter(b => b.val >= 10) // Hide brokers < 10
            .sort((a, b) => b.valGBP - a.valGBP);

        return { activeHoldings, sortedBrokers };
    };

    const { activeHoldings, sortedBrokers } = computeHoldings();

    // 2. Actions
    const handleAddClick = (brokerName) => {
        setAddData({
            date: new Date().toISOString().split('T')[0],
            asset: '',
            broker: brokerName,
            investment: '',
            interest: '',
            type: 'Investment',
            currency: BROKER_CURRENCY[brokerName] || 'BRL',
            notes: ''
        });
        setIsAddModalOpen(true);
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
            setIsAddModalOpen(false);
        } catch (e) { console.error(e); }
    };

    const handleEditClick = (tr) => {
        setEditingTr({ ...tr });
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        try {
            await fetch('/api/fixed-income', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingTr)
            });
            onRefresh();
            setIsEditModalOpen(false);
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

    // Update Value handlers
    const handleUpdateClick = (item) => {
        setUpdateTarget(item);
        setUpdateNewValue('');
        setIsUpdateModalOpen(true);
    };

    const handleSaveUpdate = async () => {
        if (!updateTarget || !updateNewValue) return;
        const newVal = parseFloat(updateNewValue);
        if (isNaN(newVal) || newVal <= 0) return;

        const interestAmount = newVal - updateTarget.currentValue;
        if (Math.abs(interestAmount) < 0.01) {
            setIsUpdateModalOpen(false);
            return;
        }

        setUpdateSaving(true);
        try {
            let assetName = updateTarget.name;
            let brokerName = updateTarget.broker;

            await fetch('/api/fixed-income', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: new Date().toISOString().split('T')[0],
                    asset: assetName,
                    broker: brokerName,
                    interest: interestAmount,
                    investment: 0,
                    type: 'Interest',
                    currency: updateTarget.currency || 'BRL',
                    notes: `Value Update: ${updateTarget.name}`
                })
            });
            onRefresh();
            setIsUpdateModalOpen(false);
        } catch (e) { console.error(e); }
        setUpdateSaving(false);
    };

    // 3. Render Helpers
    const thStyle = { padding: '12px 24px', textAlign: 'left', color: 'var(--fg-secondary)', fontWeight: 500, fontSize: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.05)' };

    const renderBrokerTable = (brokerObj) => {
        const brokerName = brokerObj.name;
        const items = activeHoldings.filter(h => h.broker === brokerName);
        if (items.length === 0) {
            // Empty broker table with Add button
            return (
                <div key={brokerName} className="glass-card" style={{ padding: '24px', marginBottom: '24px', textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>{brokerName}</h3>
                    <button onClick={() => handleAddClick(brokerName)} className="btn-primary" style={{ fontSize: '0.8rem' }}>+ Add First Transaction</button>
                </div>
            );
        }

        const cur = items[0].currency || 'BRL';
        const totalValue = items.reduce((sum, i) => sum + i.currentValue, 0);
        const totalInv = items.reduce((sum, i) => sum + i.investment, 0);
        const totalInt = items.reduce((sum, i) => sum + i.interest, 0);
        const totalROI = Math.abs(totalInv) > 0.1 ? (totalInt / Math.abs(totalInv) * 100) : 0;

        return (
            <div key={brokerName} className="glass-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '24px' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{brokerName}</h3>
                    <button onClick={() => handleAddClick(brokerName)} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>+ Add Action</button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={thStyle}>Asset Name</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Principal</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Accrued Interest</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Current Value</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>ROI %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.sort((a, b) => b.currentValue - a.currentValue).map(item => (
                            <tr key={item.name} className="group transition-colors hover:bg-white/5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '12px 24px', fontWeight: 600 }}>{item.name}</td>
                                <td style={{ padding: '12px 24px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(item.investment, cur)}</td>
                                <td style={{ padding: '12px 24px', textAlign: 'right', color: 'var(--vu-green)' }}>{formatCurrency(item.interest, cur)}</td>
                                <td style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 700, position: 'relative' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                        {formatCurrency(item.currentValue, cur)}
                                        <button
                                            onClick={() => handleUpdateClick(item)}
                                            className="opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out cursor-pointer flex items-center justify-center p-1 rounded-md bg-[#10b981]/10 border border-[#10b981]/30 text-emerald-500 hover:bg-[#10b981]/20 hover:border-[#10b981]/60 absolute right-[-10px]"
                                            title="Update current value"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </td>
                                <td style={{ padding: '12px 24px', textAlign: 'right', color: item.roi >= 0 ? 'var(--vu-green)' : 'var(--error)' }}>
                                    {item.roi >= 0 ? '+' : ''}{item.roi.toFixed(2)}%
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)', fontWeight: 700 }}>
                            <td style={{ padding: '12px 24px' }}>Total {brokerName}</td>
                            <td style={{ padding: '12px 24px', textAlign: 'right' }}>{formatCurrency(totalInv, cur)}</td>
                            <td style={{ padding: '12px 24px', textAlign: 'right' }}>{formatCurrency(totalInt, cur)}</td>
                            <td style={{ padding: '12px 24px', textAlign: 'right', color: 'var(--accent-color)' }}>{formatCurrency(totalValue, cur)}</td>
                            <td style={{ padding: '12px 24px', textAlign: 'right' }}>{totalROI.toFixed(2)}%</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        );
    };

    const renderConsolidated = () => {
        const totalValGBP = sortedBrokers.reduce((sum, b) => sum + b.valGBP, 0);
        const totalInvGBP = sortedBrokers.reduce((sum, b) => sum + b.investment, 0);
        const totalValBRL = totalValGBP * rates.BRL;
        const totalROI = Math.abs(totalInvGBP) > 0.1 ? ((totalValGBP - totalInvGBP) / Math.abs(totalInvGBP) * 100) : 0;

        return (
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '48px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, rgba(255,255,255,0) 100%)' }}>
                    <h3 style={{ margin: 0, fontSize: '1.3rem' }}>📊 Fixed Income Portfolio</h3>
                    <span style={{ color: 'var(--vu-green)', fontWeight: 700, fontSize: '1.1rem' }}>
                        {formatCurrency(totalValGBP, 'GBP')} ({totalROI.toFixed(1)}%)
                    </span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                            <th style={thStyle}>Broker</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Value (Local)</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Value (GBP)</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>ROI %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedBrokers.map(s => (
                            <tr key={s.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '14px 24px', fontWeight: 600 }}>{s.name}</td>
                                <td style={{ padding: '14px 24px', textAlign: 'right' }}>{formatCurrency(s.val, s.cur)}</td>
                                <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(s.valGBP, 'GBP')}</td>
                                <td style={{ padding: '14px 24px', textAlign: 'right', color: 'var(--vu-green)' }}>
                                    {Math.abs(s.investment) > 0.1 ? (((s.valGBP - s.investment) / Math.abs(s.investment)) * 100).toFixed(1) : '0.0'}%
                                </td>
                            </tr>
                        ))}
                        <tr style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', fontWeight: 700 }}>
                            <td style={{ padding: '14px 24px' }}>Total</td>
                            <td style={{ padding: '14px 24px', textAlign: 'right' }}>{formatCurrency(totalValBRL, 'BRL')}</td>
                            <td style={{ padding: '14px 24px', textAlign: 'right' }}>{formatCurrency(totalValGBP, 'GBP')}</td>
                            <td style={{ padding: '14px 24px', textAlign: 'right' }}>{totalROI.toFixed(1)}%</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {renderConsolidated()}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                {sortedBrokers.map(b => renderBrokerTable(b))}
            </div>

            {/* Ledger Section */}
            <section style={{ marginTop: '48px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Transaction Ledger</h3>
                    <button onClick={() => setLedgerOpen(!ledgerOpen)} style={{ background: 'transparent', border: 'none', color: 'var(--fg-secondary)', cursor: 'pointer' }}>
                        {ledgerOpen ? '▲ Hide' : '▼ Show'} ({transactions.length})
                    </button>
                </div>
                {ledgerOpen && (
                    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                    <th style={thStyle}>Date</th>
                                    <th style={thStyle}>Broker</th>
                                    <th style={thStyle}>Asset</th>
                                    <th style={thStyle}>Type</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                                    <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.sort((a, b) => b.date.localeCompare(a.date)).map(tr => (
                                    <tr key={tr.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '12px 24px', fontSize: '0.85rem', color: 'var(--fg-secondary)' }}>{tr.date}</td>
                                        <td style={{ padding: '12px 24px', fontSize: '0.85rem' }}>{tr.broker}</td>
                                        <td style={{ padding: '12px 24px', fontWeight: 600 }}>{tr.asset}</td>
                                        <td style={{ padding: '12px 24px' }}>
                                            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: tr.type === 'Interest' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)', color: tr.type === 'Interest' ? 'var(--vu-green)' : 'inherit' }}>
                                                {tr.type}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600 }}>
                                            {formatCurrency(tr.investment + (tr.interest || 0), tr.currency)}
                                        </td>
                                        <td style={{ padding: '12px 24px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button onClick={() => handleEditClick(tr)} className="btn-icon">Edit</button>
                                                <button onClick={() => handleDeleteClick(tr.id)} className="btn-icon" style={{ color: 'var(--error)' }}>Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Modals */}
            {isAddModalOpen && addData && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setIsAddModalOpen(false)} />
                    <div className="glass-card" style={{ position: 'relative', p: '32px', width: '500px' }}>
                        <h3 style={{ mb: '24px' }}>Add {addData.broker} Transaction</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <input type="date" value={addData.date} onChange={e => setAddData({ ...addData, date: e.target.value })} className="input-field" />
                            <input placeholder="Asset Name (e.g. CDB Banco C6)" value={addData.asset} onChange={e => setAddData({ ...addData, asset: e.target.value })} className="input-field" />
                            <select value={addData.type} onChange={e => setAddData({ ...addData, type: e.target.value })} className="input-field">
                                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                            </select>
                            {addData.type === 'Interest' ? (
                                <input placeholder="Interest Amount" type="number" value={addData.interest} onChange={e => setAddData({ ...addData, interest: e.target.value })} className="input-field" />
                            ) : (
                                <input placeholder="Investment Amount" type="number" value={addData.investment} onChange={e => setAddData({ ...addData, investment: e.target.value })} className="input-field" />
                            )}
                            <input placeholder="Notes" value={addData.notes} onChange={e => setAddData({ ...addData, notes: e.target.value })} className="input-field" />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'end', mt: '24px' }}>
                            <button onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                            <button onClick={handleSaveAdd} className="btn-primary">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {isEditModalOpen && editingTr && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setIsEditModalOpen(false)} />
                    <div className="glass-card" style={{ position: 'relative', p: '32px', width: '500px' }}>
                        <h3 style={{ mb: '24px' }}>Edit Transaction</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <input type="date" value={editingTr.date} onChange={e => setEditingTr({ ...editingTr, date: e.target.value })} className="input-field" />
                            <select value={editingTr.type} onChange={e => setEditingTr({ ...editingTr, type: e.target.value })} className="input-field">
                                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                            </select>
                            {editingTr.type === 'Interest' ? (
                                <input placeholder="Interest Amount" type="number" value={editingTr.interest} onChange={e => setEditingTr({ ...editingTr, interest: e.target.value })} className="input-field" />
                            ) : (
                                <input placeholder="Investment Amount" type="number" value={editingTr.investment} onChange={e => setEditingTr({ ...editingTr, investment: e.target.value })} className="input-field" />
                            )}
                            <input placeholder="Notes" value={editingTr.notes} onChange={e => setEditingTr({ ...editingTr, notes: e.target.value })} className="input-field" />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'end', mt: '24px' }}>
                            <button onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                            <button onClick={handleSaveEdit} className="btn-primary">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                title="Delete Fixed Income Record"
                message="Are you sure? This will remove the transaction from your ledger."
                onConfirm={handleConfirmDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
            />

            {/* Update Value Modal */}
            {isUpdateModalOpen && updateTarget && (() => {
                const newVal = parseFloat(updateNewValue);
                const isValid = !isNaN(newVal) && newVal > 0;
                const interestCalc = isValid ? (newVal - updateTarget.currentValue) : 0;
                const cur = updateTarget.currency || 'BRL';

                return (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setIsUpdateModalOpen(false)} />
                        <div className="glass-card" style={{ position: 'relative', padding: '32px', width: '440px', borderRadius: '16px' }}>
                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                <span style={{ fontSize: '1.5rem' }}>📊</span>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Update Value</h3>
                                    <span style={{ color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>{updateTarget.name} ({updateTarget.broker})</span>
                                </div>
                            </div>

                            {/* Current Value Display */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Current Tracked Value</span>
                                    <span style={{ fontWeight: 600 }}>{formatCurrency(updateTarget.currentValue, cur)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Accrued Interest (so far)</span>
                                    <span style={{ color: 'var(--vu-green)', fontWeight: 500 }}>+{formatCurrency(updateTarget.interest || 0, cur)}</span>
                                </div>
                            </div>

                            {/* New Value Input */}
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--fg-secondary)', marginBottom: '8px' }}>
                                Enter current value from your broker
                            </label>
                            <input
                                type="number"
                                placeholder={`e.g. ${(updateTarget.currentValue * 1.01).toFixed(2)}`}
                                value={updateNewValue}
                                onChange={e => setUpdateNewValue(e.target.value)}
                                autoFocus
                                className="input-field"
                                style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: 600 }}
                                onKeyDown={e => { if (e.key === 'Enter' && isValid) handleSaveUpdate(); }}
                            />

                            {/* Calculated Interest Preview */}
                            {isValid && (
                                <div style={{
                                    background: interestCalc >= 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                    border: `1px solid ${interestCalc >= 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                                    borderRadius: '12px',
                                    padding: '16px',
                                    marginBottom: '20px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--fg-secondary)' }}>
                                        {interestCalc >= 0 ? '📈 Interest to record' : '📉 Adjustment to record'}
                                    </span>
                                    <span style={{
                                        fontSize: '1.2rem',
                                        fontWeight: 700,
                                        color: interestCalc >= 0 ? 'var(--vu-green)' : 'var(--error)'
                                    }}>
                                        {interestCalc >= 0 ? '+' : ''}{formatCurrency(interestCalc, cur)}
                                    </span>
                                </div>
                            )}

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setIsUpdateModalOpen(false)}
                                    style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--fg-secondary)', cursor: 'pointer' }}
                                >Cancel</button>
                                <button
                                    onClick={handleSaveUpdate}
                                    disabled={!isValid || updateSaving}
                                    className="btn-primary"
                                    style={{
                                        padding: '10px 20px',
                                        opacity: (!isValid || updateSaving) ? 0.5 : 1,
                                        cursor: (!isValid || updateSaving) ? 'not-allowed' : 'pointer'
                                    }}
                                >{updateSaving ? 'Saving...' : 'Save Update'}</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            <style jsx>{`
                .input-field {
                    width: 100%;
                    padding: 10px 14px;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid var(--glass-border);
                    border-radius: 8px;
                    color: #fff;
                    font-size: 0.95rem;
                }
                .btn-icon {
                    padding: 4px 10px;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid var(--glass-border);
                    border-radius: 6px;
                    color: var(--fg-secondary);
                    cursor: pointer;
                    font-size: 0.75rem;
                }
                .btn-icon:hover {
                    background: rgba(255,255,255,0.1);
                    color: #fff;
                }
            `}</style>
        </div>
    );
}
