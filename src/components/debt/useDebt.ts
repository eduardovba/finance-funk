import { useState, useEffect, useRef } from 'react';
import { convertCurrency } from '@/lib/currency';
import { usePortfolio } from '@/context/PortfolioContext';
import useContextPaneHeight from '@/hooks/useContextPaneHeight';
import type { DebtTabProps, DebtTransaction, LenderSummary } from './types';

const BASE_LENDER_CURRENCY: Record<string, string> = {};

export { BASE_LENDER_CURRENCY };

export default function useDebt({ transactions = [], rates = { GBP: 1, BRL: 7.20 }, onRefresh }: DebtTabProps) {
    const { primaryCurrency, displayCurrencyOverrides } = usePortfolio() as any;

    const [isLoading, setIsLoading] = useState(false);
    const [ledgerOpen, setLedgerOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleteLenderModalOpen, setIsDeleteLenderModalOpen] = useState(false);
    const [lenderToDelete, setLenderToDelete] = useState<string | null>(null);
    const [trToDelete, setTrToDelete] = useState<string | number | null>(null);
    const [editingTr, setEditingTr] = useState<any>(null);
    const [selectedAsset, setSelectedAsset] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const contextPaneMaxHeight = useContextPaneHeight('ftue-debt-lender-section', 'ftue-debt-header');

    // Dynamic Lenders
    const [lenderDict, setLenderDict] = useState<Record<string, string>>({ ...BASE_LENDER_CURRENCY });
    const [explicitDbLenders, setExplicitDbLenders] = useState<string[]>([]);
    const [deletedLenderNames, setDeletedLenderNames] = useState<string[]>([]);
    const [showEmptyLenders, setShowEmptyLenders] = useState(false);

    // Expand states
    const [expandedLenders, setExpandedLenders] = useState<Record<string, boolean>>({});
    const toggleLender = (b: string) => setExpandedLenders(prev => ({ ...prev, [b]: !prev[b] }));
    const [newlyAddedLenders, setNewlyAddedLenders] = useState<string[]>([]);
    const isInitialFetch = useRef(true);

    // Right Pane
    const [rightPaneMode, setRightPaneMode] = useState('default');

    // Add transaction form
    const [addFormData, setAddFormData] = useState<any>({
        date: new Date().toISOString().split('T')[0],
        lender: '',
        amount: '',
        currency: primaryCurrency || 'BRL',
        obs: '',
        isSalaryContribution: false,
        transactionType: 'borrow'
    });

    const fetchLenders = async () => {
        try {
            const res = await fetch('/api/brokers?assetClass=Debt');
            const data = await res.json();
            if (data.brokers) {
                const debtLenders = data.brokers.filter((b: any) => b.asset_class === 'Debt' || b.asset_class === null);
                const fetchedNames: string[] = debtLenders.map((b: any) => b.name);

                if (!isInitialFetch.current) {
                    const newNames = fetchedNames.filter(name => !explicitDbLenders.includes(name) && !deletedLenderNames.includes(name));
                    if (newNames.length > 0) {
                        setNewlyAddedLenders(prev => [...new Set([...prev, ...newNames])]);
                        const expansions: Record<string, boolean> = {};
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

                const dict: Record<string, string> = { ...BASE_LENDER_CURRENCY };
                debtLenders.filter((b: any) => b.asset_class === null).forEach((b: any) => { if (!dict[b.name]) dict[b.name] = b.currency || 'BRL'; });
                debtLenders.filter((b: any) => b.asset_class === 'Debt').forEach((b: any) => dict[b.name] = b.currency || 'BRL');
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
            const matching: Record<string, boolean> = {};
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
    const handleDeleteClick = (id: string | number) => { setTrToDelete(id); setIsDeleteModalOpen(true); };
    const handleConfirmDelete = async () => {
        if (!trToDelete) return;
        try {
            await fetch(`/api/debt-transactions?id=${trToDelete}`, { method: 'DELETE' });
            onRefresh?.();
            setIsDeleteModalOpen(false); setTrToDelete(null);
        } catch (e) { console.error(e); }
    };

    const handleDeleteLenderClick = (lenderName: string) => {
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
            onRefresh?.();
        } catch (e) { console.error(e); }
    };

    // Edit transaction handlers
    const handleEditClick = (tr: any) => {
        setEditingTr({ ...tr });
        setRightPaneMode('edit-transaction');
        setSelectedAsset(null);
    };

    const handleEditChange = (field: string, value: any) => {
        setEditingTr((prev: any) => ({ ...prev, [field]: value }));
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
                onRefresh?.();
                setRightPaneMode('default');
                setEditingTr(null);
            }
        } catch (e) { console.error(e); }
    };

    // Add transaction
    const handleNewDebtClick = (lenderName: string) => {
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
        const val_brl = convertCurrency(amount, addFormData.currency, 'BRL', rates as any) * sign;
        const val_gbp = convertCurrency(amount, addFormData.currency, 'GBP', rates as any) * sign;

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
                onRefresh?.();
                setRightPaneMode('default');
            } else {
                const err = await res.json();
                console.error('Failed to save debt transaction:', err);
            }
        } catch (e) { console.error('Error saving debt:', e); }
    };

    const handleRenameAsset = async (oldName: string, newName: string, broker?: string) => {
        try {
            const res = await fetch('/api/assets/rename', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldName, newName, broker: broker || oldName, assetClass: 'Debt' })
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

    // Compute holdings grouped by lender
    const sortedTransactions = [...transactions].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const lenderSummary: Record<string, LenderSummary> = {};
    sortedTransactions.forEach(t => {
        const lender = t.lender || 'Unknown';
        if (!lenderSummary[lender]) {
            lenderSummary[lender] = { lender, total: 0, transactions: [] };
        }
        const lenderCur = lenderDict[lender] || 'BRL';
        const amountInLenderCur = convertCurrency(t.value_brl || 0, 'BRL', lenderCur, rates as any);
        lenderSummary[lender].total += amountInLenderCur;
        lenderSummary[lender].transactions.push(t);
    });

    const lendersFromTransactions = [...new Set(transactions.map(t => t.lender))].filter(Boolean);
    const combinedLenders = [...new Set([...lendersFromTransactions, ...explicitDbLenders, ...Object.keys(lenderDict)])]
        .filter(b => !deletedLenderNames.includes(b))
        .sort((a, b) => {
            const totalA = Math.abs((lenderSummary[a]?.total) || 0);
            const totalB = Math.abs((lenderSummary[b]?.total) || 0);
            const curA = lenderDict[a] || 'BRL';
            const curB = lenderDict[b] || 'BRL';
            const gbpA = convertCurrency(totalA, curA, 'GBP', rates as any);
            const gbpB = convertCurrency(totalB, curB, 'GBP', rates as any);
            if (gbpA !== gbpB) return gbpB - gbpA;
            return a.localeCompare(b);
        });

    const displayLenders = searchTerm
        ? combinedLenders.filter(l => l.toLowerCase().includes(searchTerm.toLowerCase()))
        : combinedLenders;

    // Determine topCurrency & effectiveCurrency
    const currencyTotals: Record<string, number> = {};
    combinedLenders.forEach(l => {
        const cur = lenderDict[l] || 'BRL';
        const data = lenderSummary[l];
        if (!data) return;
        const totalGbp = convertCurrency(Math.abs(data.total), cur, 'GBP', rates as any);
        if (!currencyTotals[cur]) currencyTotals[cur] = 0;
        currencyTotals[cur] += totalGbp;
    });

    let topCurrency = 'BRL';
    let maxAmt = -1;
    Object.entries(currencyTotals).forEach(([cur, amt]) => {
        if (amt > maxAmt) { maxAmt = amt; topCurrency = cur; }
    });
    if (Object.keys(currencyTotals).length === 0) topCurrency = 'BRL';

    const effectiveCurrency = displayCurrencyOverrides?.debt || topCurrency;

    let grandTotal = 0;
    combinedLenders.forEach(l => {
        const cur = lenderDict[l] || 'BRL';
        const data = lenderSummary[l];
        if (!data) return;
        grandTotal += convertCurrency(data.total, cur, effectiveCurrency, rates as any);
    });

    return {
        // State
        isLoading, setIsLoading,
        ledgerOpen, setLedgerOpen,
        isDeleteModalOpen, setIsDeleteModalOpen,
        isDeleteLenderModalOpen, setIsDeleteLenderModalOpen,
        lenderToDelete,
        trToDelete,
        editingTr, setEditingTr,
        selectedAsset, setSelectedAsset,
        searchTerm, setSearchTerm,
        contextPaneMaxHeight,
        lenderDict,
        explicitDbLenders,
        showEmptyLenders, setShowEmptyLenders,
        expandedLenders, toggleLender,
        newlyAddedLenders,
        rightPaneMode, setRightPaneMode,
        addFormData, setAddFormData,

        // Derived
        sortedTransactions,
        lenderSummary,
        combinedLenders,
        displayLenders,
        topCurrency,
        effectiveCurrency,
        grandTotal,

        // Handlers
        fetchLenders,
        handleDeleteClick,
        handleConfirmDelete,
        handleDeleteLenderClick,
        handleConfirmDeleteLender,
        handleEditClick,
        handleEditChange,
        handleEditSave,
        handleNewDebtClick,
        handleSaveNewDebt,
        handleRenameAsset,
    };
}
