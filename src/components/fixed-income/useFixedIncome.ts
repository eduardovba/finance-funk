import { useState, useEffect, useRef } from 'react';
import { convertCurrency } from '@/lib/currency';
import { usePortfolio } from '@/context/PortfolioContext';
import useContextPaneHeight from '@/hooks/useContextPaneHeight';
import type { FixedIncomeTabProps, FixedIncomeHolding, BrokerSummary } from './types';

const BASE_BROKER_CURRENCY: Record<string, string> = {
    'XP': 'BRL', 'NuBank': 'BRL', 'Inter': 'BRL', 'Santander': 'BRL', 'Monzo': 'GBP', 'Fidelity': 'GBP'
};

export { BASE_BROKER_CURRENCY };

const CATEGORIES = [
    { id: 'Investment', label: 'Deposit' },
    { id: 'Interest', label: 'Interest' },
    { id: 'Withdrawal', label: 'Withdrawal' },
];

export { CATEGORIES };

export default function useFixedIncome({ transactions = [], rates, onRefresh }: FixedIncomeTabProps) {
    const { displayCurrencyOverrides } = usePortfolio() as any;

    const [ledgerOpen, setLedgerOpen] = useState(false);
    const [expandedBrokers, setExpandedBrokers] = useState<Record<string, boolean>>({});
    const toggleBroker = (b: string) => setExpandedBrokers(prev => ({ ...prev, [b]: !prev[b] }));

    const [selectedAsset, setSelectedAsset] = useState<any>(null);
    const [rightPaneMode, setRightPaneMode] = useState('default');
    const [searchTerm, setSearchTerm] = useState('');
    const contextPaneMaxHeight = useContextPaneHeight('ftue-fi-account-section', 'ftue-fi-header');
    const [showEmptyBrokers, setShowEmptyBrokers] = useState(false);

    // Dynamic broker management
    const [brokerDict, setBrokerDict] = useState<Record<string, string>>({ ...BASE_BROKER_CURRENCY });
    const [explicitDbBrokers, setExplicitDbBrokers] = useState<string[]>([]);
    const [deletedBrokerNames, setDeletedBrokerNames] = useState<string[]>([]);
    const [newlyAddedBrokers, setNewlyAddedBrokers] = useState<string[]>([]);
    const isInitialFetch = useRef(true);

    // Add/Edit/Update form state
    const [addData, setAddData] = useState<any>(null);
    const [editingTr, setEditingTr] = useState<any>(null);
    const [updateTarget, setUpdateTarget] = useState<any>(null);
    const [updateNewValue, setUpdateNewValue] = useState('');
    const [updateSaving, setUpdateSaving] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [trToDelete, setTrToDelete] = useState<string | number | null>(null);

    // Fetch brokers
    const fetchBrokers = async () => {
        try {
            const res = await fetch('/api/brokers?assetClass=FixedIncome');
            const data = await res.json();
            if (data.brokers) {
                const fiBrokers = data.brokers.filter((b: any) => b.asset_class === 'FixedIncome' || b.asset_class === null);
                const fetchedNames: string[] = fiBrokers.map((b: any) => b.name);

                if (!isInitialFetch.current) {
                    const newNames = fetchedNames.filter(name => !explicitDbBrokers.includes(name) && !deletedBrokerNames.includes(name));
                    if (newNames.length > 0) {
                        setNewlyAddedBrokers(prev => [...new Set([...prev, ...newNames])]);
                        const expansions: Record<string, boolean> = {};
                        newNames.forEach(n => expansions[n] = true);
                        setExpandedBrokers(prev => ({ ...prev, ...expansions }));
                    }
                }

                const dict: Record<string, string> = { ...BASE_BROKER_CURRENCY };
                fiBrokers.filter((b: any) => b.asset_class === null).forEach((b: any) => { if (!dict[b.name]) dict[b.name] = b.currency || 'BRL'; });
                fiBrokers.filter((b: any) => b.asset_class === 'FixedIncome').forEach((b: any) => dict[b.name] = b.currency || 'BRL');
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
            const expanded: Record<string, boolean> = {};
            Object.keys(brokerDict).forEach(b => { expanded[b] = true; });
            setExpandedBrokers(prev => ({ ...prev, ...expanded }));
        }
    }, [searchTerm]);

    const normalizedBroker = (name: string | null | undefined): string => {
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

    // Group by Broker & Calculate Holdings
    const computeHoldings = (): FixedIncomeHolding[] => {
        const holdings: Record<string, any> = {};
        const brokerListFromTx = new Set<string>();

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

        let activeList: any[] = Object.values(holdings).map((h: any) => {
            let currentValue: number, investment: number;
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
        }).filter((h: any) => Math.abs(h.currentValue) >= 10);

        // --- XP Custom Split Logic ---
        const xpCoreItems = activeList.filter(a => a.broker === 'XP' && !['Post-fixated', 'Inflation', 'Pre-fixated'].includes(a.name));
        const xpManualItems = activeList.filter(a => a.broker === 'XP' && ['Post-fixated', 'Inflation', 'Pre-fixated'].includes(a.name));
        if (xpCoreItems.length > 0) {
            const xpTotalVal = xpCoreItems.reduce((sum: number, item: any) => sum + item.currentValue, 0);
            const xpTotalInv = xpCoreItems.reduce((sum: number, item: any) => sum + item.investment, 0);
            const postVal = 182532.02, infVal = 96098.50, preVal = 91647.14;
            const totalValScr = postVal + infVal + preVal;
            const postValRatio = postVal / totalValScr, infValRatio = infVal / totalValScr, preValRatio = preVal / totalValScr;
            const postInv = postVal / 1.1824, infInv = infVal / 1.1545, preInv = preVal / 1.1523;
            const totalInvScr = postInv + infInv + preInv;
            const postInvRatio = postInv / totalInvScr, infInvRatio = infInv / totalInvScr, preInvRatio = preInv / totalInvScr;

            const makeSubAsset = (subName: string, valRatio: number, invRatio: number) => {
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
    const brokerValueMap: Record<string, number> = {};
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
    const currencyTotals: Record<string, number> = {};
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

    const effectiveCurrency = displayCurrencyOverrides?.fixedIncome || topCurrency;

    const toBase = (amount: number, currency: string): number => {
        if (!rates) return amount;
        return convertCurrency(amount, currency, effectiveCurrency, rates);
    };

    // Actions
    const handleAddClick = (brokerName: string, assetName?: string) => {
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
            onRefresh?.();
            setRightPaneMode('default');
        } catch (e) { console.error(e); }
    };

    const handleEditClick = (tr: any) => {
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
            onRefresh?.();
            setRightPaneMode('default');
        } catch (e) { console.error(e); }
    };

    const handleDeleteClick = (id: string | number) => {
        setTrToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        try {
            await fetch(`/api/fixed-income?id=${trToDelete}`, { method: 'DELETE' });
            onRefresh?.();
            setIsDeleteModalOpen(false);
        } catch (e) { console.error(e); }
    };

    const handleUpdateClick = (item: any) => {
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
            onRefresh?.();
            setRightPaneMode('default');
        } catch (e) { console.error(e); }
        setUpdateSaving(false);
    };

    const handleDeleteBroker = async (brokerName: string) => {
        if (!confirm(`Delete broker "${brokerName}" and all its data?`)) return;
        try {
            const broker = explicitDbBrokers.includes(brokerName);
            if (broker) {
                const brokersRes = await fetch('/api/brokers?assetClass=FixedIncome');
                const brokersData = await brokersRes.json();
                const b = brokersData.brokers?.find((bb: any) => bb.name === brokerName);
                if (b) await fetch(`/api/brokers?id=${b.id}`, { method: 'DELETE' });
            }
            setDeletedBrokerNames(prev => [...prev, brokerName]);
            setNewlyAddedBrokers(prev => prev.filter(n => n !== brokerName));
        } catch (e) { console.error('Failed to delete broker:', e); }
    };

    const handleRenameAsset = async (oldName: string, newName: string, broker?: string) => {
        try {
            const res = await fetch('/api/assets/rename', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldName, newName, broker, assetClass: 'Fixed Income' })
            });
            const data = await res.json();
            if (!res.ok) return { error: data.error || 'Failed to rename' };
            onRefresh?.();
            setSelectedAsset(null);
            return { success: true };
        } catch (e) {
            console.error('Rename failed:', e);
            return { error: 'Network error' };
        }
    };

    // Broker summaries for hero
    const computeBrokerSummaries = (): { summaries: BrokerSummary[]; grandTotal: number; grandInv: number } => {
        let grandTotal = 0, grandInv = 0;
        const summaries = brokers_list.map(b => {
            const items = activeHoldings.filter(h => h.broker === b);
            const cur = brokerDict[b] || BASE_BROKER_CURRENCY[b] || 'BRL';
            const val = items.reduce((sum, i) => sum + i.currentValue, 0);
            const inv = items.reduce((sum, i) => sum + i.investment, 0);
            const valInTop = toBase(val, cur);
            const invInTop = toBase(inv, cur);
            grandTotal += valInTop;
            grandInv += invInTop;
            const roi = Math.abs(invInTop) > 0.1 ? ((valInTop - invInTop) / Math.abs(invInTop) * 100) : 0;
            return { broker: b, currentValue: valInTop, investment: invInTop, pnl: valInTop - invInTop, roi, nativeVal: val, nativeCur: cur };
        }).filter(s => s.currentValue > 0.01 || s.investment > 0.01);
        return { summaries, grandTotal, grandInv };
    };

    return {
        // State
        ledgerOpen, setLedgerOpen,
        expandedBrokers, toggleBroker,
        selectedAsset, setSelectedAsset,
        rightPaneMode, setRightPaneMode,
        searchTerm, setSearchTerm,
        contextPaneMaxHeight,
        showEmptyBrokers, setShowEmptyBrokers,
        brokerDict,
        explicitDbBrokers,
        newlyAddedBrokers,
        addData, setAddData,
        editingTr, setEditingTr,
        updateTarget, setUpdateTarget,
        updateNewValue, setUpdateNewValue,
        updateSaving,
        isDeleteModalOpen, setIsDeleteModalOpen,
        trToDelete,

        // Derived
        activeHoldings,
        brokers_list,
        topCurrency,
        effectiveCurrency,

        // Handlers
        fetchBrokers,
        handleAddClick,
        handleSaveAdd,
        handleEditClick,
        handleSaveEdit,
        handleDeleteClick,
        handleConfirmDelete,
        handleUpdateClick,
        handleSaveUpdate,
        handleDeleteBroker,
        handleRenameAsset,
        computeBrokerSummaries,
    };
}
