"use client";

import { create } from 'zustand';
import type { BudgetCategory, BudgetTransaction, BudgetMonthlyRollup } from '@/types';
import { offsetMonth } from '@/lib/budgetUtils';
import { MOCK_FX_RATES } from '@/lib/fxConvert';

// ═══════════ TYPES ═══════════

export interface BudgetState {
    categories: BudgetCategory[];
    transactions: BudgetTransaction[];
    currentRollup: BudgetMonthlyRollup | null;
    rollupHistory: BudgetMonthlyRollup[];
    currentMonth: string;
    loading: boolean;
    toastError: string | null;
    demoMode: boolean;
    _allDemoTransactions: BudgetTransaction[];
    // FX & Currency
    displayCurrency: string;
    fxRates: Record<string, number>;
    // Auto-categorization rules
    categoryRules: Record<string, number>;
    // Auto-ignore rules (substring matches to skip on import)
    ignoreRules: string[];
}

export interface BudgetActions {
    setCurrentMonth: (month: string) => void;
    clearToast: () => void;
    setDemoMode: (v: boolean) => void;
    setCategories: (cats: BudgetCategory[]) => void;
    setTransactions: (txns: BudgetTransaction[]) => void;
    setCurrentRollup: (rollup: BudgetMonthlyRollup | null) => void;
    setRollupHistory: (rollups: BudgetMonthlyRollup[]) => void;
    setDisplayCurrency: (currency: string) => void;
    fetchCategories: () => Promise<void>;
    addCategory: (body: Omit<BudgetCategory, 'id' | 'user_id'>) => Promise<void>;
    updateCategory: (body: BudgetCategory) => Promise<void>;
    deleteCategory: (id: number) => Promise<void>;
    reorderCategories: (items: { id: number; sort_order: number }[]) => Promise<void>;
    fetchTransactions: (month?: string) => Promise<void>;
    addTransaction: (body: {
        category_id?: number | null;
        amount_cents: number;
        currency?: string;
        description?: string | null;
        date: string;
        is_recurring?: boolean;
    }) => Promise<void>;
    updateTransaction: (body: { id: number; category_id?: number | null; amount_cents?: number; currency?: string; description?: string | null; date?: string; source?: string | null }) => Promise<void>;
    deleteTransaction: (id: number) => Promise<void>;
    bulkDeleteTransactions: (ids: number[]) => Promise<void>;
    fetchRollup: (month?: string) => Promise<void>;
    fetchRollupRange: (endMonth?: string, count?: number) => Promise<void>;
    bulkUpdateTargets: (items: { id: number; monthly_target_cents: number }[]) => Promise<void>;
    fetchSuggestions: () => Promise<{ suggestions: { category_id: number; suggested_cents: number }[]; avg_monthly_income_cents: number }>;
    // FX & Currency
    setAndPersistCurrency: (currency: string) => Promise<void>;
    hydrateSettings: () => Promise<void>;
    // Auto-categorization
    hydrateRules: () => Promise<void>;
    saveRule: (key: string, categoryId: number) => Promise<void>;
    saveIgnoreRule: (key: string) => Promise<void>;
}

// ═══════════ HELPERS ═══════════

function currentYYYYMM(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Optimistically adjust a rollup's totals by a delta (positive = add, negative = subtract).
 * All math stays in integers. Returns a new rollup object.
 */
function adjustRollup(
    rollup: BudgetMonthlyRollup | null,
    deltaCents: number,
    isIncome: boolean,
): BudgetMonthlyRollup {
    const base: BudgetMonthlyRollup = rollup ?? {
        id: 0, user_id: 0, month: currentYYYYMM(),
        total_income_cents: 0, total_expenses_cents: 0,
        total_savings_cents: 0, savings_rate_basis_points: 0,
    };

    const income = base.total_income_cents + (isIncome ? deltaCents : 0);
    const expenses = base.total_expenses_cents + (isIncome ? 0 : deltaCents);
    const savings = income - expenses;
    const savingsRate = income > 0
        ? Math.round((savings * 10000) / income)
        : 0;

    return {
        ...base,
        total_income_cents: income,
        total_expenses_cents: expenses,
        total_savings_cents: savings,
        savings_rate_basis_points: savingsRate,
    };
}

// ═══════════ STORE ═══════════

const useBudgetStore = create<BudgetState & BudgetActions>((set, get) => ({
    // ═══════════ STATE ═══════════
    categories: [],
    transactions: [],
    currentRollup: null,
    rollupHistory: [],
    currentMonth: currentYYYYMM(),
    loading: false,
    toastError: null,
    displayCurrency: 'BRL',
    fxRates: MOCK_FX_RATES,
    categoryRules: {},
    ignoreRules: [],
    demoMode: false,
    _allDemoTransactions: [],

    // ═══════════ ACTIONS ═══════════

    setCurrentMonth: (month) => set({ currentMonth: month }),
    clearToast: () => set({ toastError: null }),
    setDemoMode: (v) => set({ demoMode: v }),
    setCategories: (cats) => set({ categories: cats, loading: false }),
    setTransactions: (txns) => set({ transactions: txns, loading: false }),
    setCurrentRollup: (rollup) => set({ currentRollup: rollup }),
    setRollupHistory: (rollups) => set({ rollupHistory: rollups }),
    setDisplayCurrency: (currency) => set({ displayCurrency: currency }),

    fetchCategories: async () => {
        if (get().demoMode) return;
        try {
            set({ loading: true });
            const res = await fetch('/api/budget/categories');
            if (!res.ok) throw new Error('Failed to fetch categories');
            const data: BudgetCategory[] = await res.json();

            // Auto-seed default categories if empty
            if (data.length === 0) {
                const seedRes = await fetch('/api/budget/categories/seed', { method: 'POST' });
                if (seedRes.ok) {
                    // Re-fetch after seeding
                    const reRes = await fetch('/api/budget/categories');
                    if (reRes.ok) {
                        const seeded: BudgetCategory[] = await reRes.json();
                        set({ categories: seeded });
                        return;
                    }
                }
            }

            set({ categories: data });
        } catch (err) {
            console.error('fetchCategories error:', err);
        } finally {
            set({ loading: false });
        }
    },

    addCategory: async (body) => {
        try {
            const res = await fetch('/api/budget/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...body,
                    is_income: body.is_income === 1,
                }),
            });
            if (!res.ok) throw new Error('Failed to add category');
            await get().fetchCategories();
        } catch (err) {
            console.error('addCategory error:', err);
        }
    },

    updateCategory: async (body) => {
        try {
            const res = await fetch('/api/budget/categories', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...body,
                    is_income: body.is_income === 1,
                }),
            });
            if (!res.ok) throw new Error('Failed to update category');
            await get().fetchCategories();
        } catch (err) {
            console.error('updateCategory error:', err);
            set({ toastError: 'Failed to update category.' });
        }
    },

    deleteCategory: async (id: number) => {
        const prev = get().categories;
        // Optimistic remove
        set({ categories: prev.filter(c => c.id !== id) });
        try {
            const res = await fetch(`/api/budget/categories?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete category');
        } catch (err) {
            console.error('deleteCategory error:', err);
            set({ categories: prev, toastError: 'Failed to delete category.' });
        }
    },

    reorderCategories: async (items) => {
        const prev = get().categories;
        // Optimistic reorder
        const orderMap = new Map(items.map(i => [i.id, i.sort_order]));
        const reordered = [...prev].map(c => ({
            ...c,
            sort_order: orderMap.get(c.id) ?? c.sort_order,
        })).sort((a, b) => a.sort_order - b.sort_order);
        set({ categories: reordered });

        try {
            const res = await fetch('/api/budget/categories', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items }),
            });
            if (!res.ok) throw new Error('Failed to reorder');
        } catch (err) {
            console.error('reorderCategories error:', err);
            set({ categories: prev, toastError: 'Failed to save order.' });
        }
    },

    bulkUpdateTargets: async (items) => {
        try {
            set({ loading: true });
            const res = await fetch('/api/budget/categories/bulk', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items }),
            });
            if (!res.ok) throw new Error('Failed to bulk update targets');
            await get().fetchCategories();
        } catch (err) {
            console.error('bulkUpdateTargets error:', err);
            set({ toastError: 'Failed to bulk save budgets.' });
            set({ loading: false });
        }
    },

    fetchSuggestions: async () => {
        try {
            const res = await fetch('/api/budget/categories/suggest');
            if (!res.ok) throw new Error('Failed to fetch suggestions');
            return await res.json();
        } catch (err) {
            console.error('fetchSuggestions error:', err);
            set({ toastError: 'Failed to load budget suggestions.' });
            return { suggestions: [], avg_monthly_income_cents: 0 };
        }
    },

    fetchTransactions: async (month?: string) => {
        if (get().demoMode) {
            // Filter the seeded demo transactions to the requested month
            const m = month ?? get().currentMonth;
            const all = get()._allDemoTransactions ?? get().transactions;
            const filtered = all.filter((t: BudgetTransaction) => t.date.startsWith(m));
            set({ transactions: filtered });
            return;
        }
        try {
            set({ loading: true });
            const m = month ?? get().currentMonth;
            const res = await fetch(`/api/budget/transactions?month=${m}`);
            if (!res.ok) throw new Error('Failed to fetch transactions');
            const data: BudgetTransaction[] = await res.json();
            set({ transactions: data });
        } catch (err) {
            console.error('fetchTransactions error:', err);
        } finally {
            set({ loading: false });
        }
    },

    addTransaction: async (body) => {
        const prevTransactions = get().transactions;
        const prevRollup = get().currentRollup;

        // ─── Determine if income or expense ──────────────────
        const category = get().categories.find(c => c.id === body.category_id);
        const isIncome = category?.is_income === 1;

        // ─── Optimistic UI: add transaction + adjust rollup ──
        const optimistic: BudgetTransaction = {
            id: -Date.now(),
            user_id: 0,
            category_id: body.category_id ?? null,
            amount_cents: body.amount_cents,
            currency: body.currency ?? 'BRL',
            description: body.description ?? null,
            date: body.date,
            is_recurring: body.is_recurring ? 1 : 0,
            source: 'Manual',
        };

        set({
            transactions: [optimistic, ...prevTransactions],
            currentRollup: adjustRollup(prevRollup, body.amount_cents, isIncome),
        });

        try {
            const res = await fetch('/api/budget/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error('Failed to add transaction');

            // Re-fetch for server truth
            await Promise.all([
                get().fetchTransactions(),
                get().fetchRollup(),
            ]);
        } catch (err) {
            console.error('addTransaction error:', err);
            // ─── Rollback + toast ────────────────────────────
            set({
                transactions: prevTransactions,
                currentRollup: prevRollup,
                toastError: 'Failed to save transaction. Please try again.',
            });
        }
    },

    updateTransaction: async (body) => {
        const prevTransactions = get().transactions;
        const prevRollup = get().currentRollup;

        // Optimistic update
        set({
            transactions: prevTransactions.map(t =>
                t.id === body.id ? { ...t, ...body } as BudgetTransaction : t
            ),
        });

        try {
            const res = await fetch('/api/budget/transactions', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error('Failed to update transaction');

            // Re-fetch for server truth
            await Promise.all([
                get().fetchTransactions(),
                get().fetchRollup(),
            ]);
        } catch (err) {
            console.error('updateTransaction error:', err);
            set({
                transactions: prevTransactions,
                currentRollup: prevRollup,
                toastError: 'Failed to update transaction. Please try again.',
            });
        }
    },

    deleteTransaction: async (id: number) => {
        const prevTransactions = get().transactions;
        const prevRollup = get().currentRollup;

        // Find the transaction to reverse its effect on rollup
        const tx = prevTransactions.find(t => t.id === id);
        if (!tx) return;

        const category = get().categories.find(c => c.id === tx.category_id);
        const isIncome = category?.is_income === 1;

        // ─── Optimistic: remove from list + reverse rollup ───
        set({
            transactions: prevTransactions.filter(t => t.id !== id),
            currentRollup: adjustRollup(prevRollup, -tx.amount_cents, isIncome),
        });

        try {
            const res = await fetch(`/api/budget/transactions?id=${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete transaction');

            // Re-fetch for server truth
            await Promise.all([
                get().fetchTransactions(),
                get().fetchRollup(),
            ]);
        } catch (err) {
            console.error('deleteTransaction error:', err);
            // ─── Rollback + toast ────────────────────────────
            set({
                transactions: prevTransactions,
                currentRollup: prevRollup,
                toastError: 'Failed to delete transaction. Please try again.',
            });
        }
    },

    bulkDeleteTransactions: async (ids: number[]) => {
        const prevTransactions = get().transactions;
        const prevRollup = get().currentRollup;

        // Optimistic: remove from list. For rollup, we could carefully reverse each but the easiest 
        // is just relying on the server refetch since bulk deletes are rare and re-calculating everything accurately client-side is complex.
        set({
            transactions: prevTransactions.filter(t => !ids.includes(t.id)),
            loading: true
        });

        try {
            const res = await fetch('/api/budget/transactions/bulk', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids }),
            });
            if (!res.ok) throw new Error('Failed to bulk delete');

            // Re-fetch for server truth
            await Promise.all([
                get().fetchTransactions(),
                get().fetchRollup(),
            ]);
        } catch (err) {
            console.error('bulkDeleteTransactions error:', err);
            // Rollback
            set({
                transactions: prevTransactions,
                currentRollup: prevRollup,
                toastError: 'Failed to delete selected transactions.',
            });
        } finally {
            set({ loading: false });
        }
    },

    fetchRollup: async (month?: string) => {
        if (get().demoMode) {
            const m = month ?? get().currentMonth;
            const match = get().rollupHistory.find(r => r.month === m) ?? null;
            set({ currentRollup: match });
            return;
        }
        try {
            const m = month ?? get().currentMonth;
            const res = await fetch(`/api/budget/rollups?month=${m}`);
            if (!res.ok) throw new Error('Failed to fetch rollup');
            const data: BudgetMonthlyRollup = await res.json();
            set({ currentRollup: data });
        } catch (err) {
            console.error('fetchRollup error:', err);
        }
    },

    fetchRollupRange: async (endMonth?: string, count: number = 6) => {
        if (get().demoMode) return;
        try {
            const end = endMonth ?? get().currentMonth;
            const start = offsetMonth(end, -(count - 1));
            const res = await fetch(`/api/budget/rollups?start=${start}&end=${end}`);
            if (!res.ok) throw new Error('Failed to fetch rollup range');
            const data: BudgetMonthlyRollup[] = await res.json();
            set({ rollupHistory: data });
        } catch (err) {
            console.error('fetchRollupRange error:', err);
        }
    },

    // ═══════════ FX & CURRENCY ═══════════

    setAndPersistCurrency: async (currency: string) => {
        const prev = get().displayCurrency;
        set({ displayCurrency: currency });
        try {
            // Fetch existing settings to merge (avoid overwriting other fields)
            const existing = await fetch('/api/app-settings').then(r => r.ok ? r.json() : {});
            const merged = { ...existing, budgetCurrency: currency };
            const res = await fetch('/api/app-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(merged),
            });
            if (!res.ok) throw new Error('Failed to save currency preference');
        } catch (err) {
            console.error('setAndPersistCurrency error:', err);
            set({ displayCurrency: prev, toastError: 'Failed to save currency preference' });
        }
    },

    hydrateSettings: async () => {
        try {
            const res = await fetch('/api/app-settings');
            if (!res.ok) return;
            const settings = await res.json();
            if (settings.budgetCurrency) {
                set({ displayCurrency: settings.budgetCurrency });
            }
            if (settings.categoryRules && typeof settings.categoryRules === 'object') {
                set({ categoryRules: settings.categoryRules });
            }
            if (Array.isArray(settings.ignoreRules)) {
                set({ ignoreRules: settings.ignoreRules });
            }
        } catch (err) {
            console.error('hydrateSettings error:', err);
        }
    },

    // ═══════════ AUTO-CATEGORIZATION ═══════════

    hydrateRules: async () => {
        try {
            const res = await fetch('/api/app-settings');
            if (!res.ok) return;
            const settings = await res.json();
            if (settings.categoryRules && typeof settings.categoryRules === 'object') {
                set({ categoryRules: settings.categoryRules });
            }
            if (Array.isArray(settings.ignoreRules)) {
                set({ ignoreRules: settings.ignoreRules });
            }
        } catch (err) {
            console.error('hydrateRules error:', err);
        }
    },

    saveRule: async (key: string, categoryId: number) => {
        const prev = get().categoryRules;
        const updated = { ...prev, [key]: categoryId };
        set({ categoryRules: updated });
        try {
            const existing = await fetch('/api/app-settings').then(r => r.ok ? r.json() : {});
            const merged = { ...existing, categoryRules: updated };
            const res = await fetch('/api/app-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(merged),
            });
            if (!res.ok) throw new Error('Failed to save rule');
        } catch (err) {
            console.error('saveRule error:', err);
            set({ categoryRules: prev, toastError: 'Failed to save categorization rule' });
        }
    },
    saveIgnoreRule: async (key: string) => {
        const prev = get().ignoreRules;
        const upperKey = key.toUpperCase();
        if (prev.some(r => r.toUpperCase() === upperKey)) return; // already exists
        const updated = [...prev, key];
        set({ ignoreRules: updated });
        try {
            const existing = await fetch('/api/app-settings').then(r => r.ok ? r.json() : {});
            const merged = { ...existing, ignoreRules: updated };
            const res = await fetch('/api/app-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(merged),
            });
            if (!res.ok) throw new Error('Failed to save ignore rule');
        } catch (err) {
            console.error('saveIgnoreRule error:', err);
            set({ ignoreRules: prev, toastError: 'Failed to save ignore rule' });
        }
    },
}));

export default useBudgetStore;
