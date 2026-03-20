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
    // FX & Currency
    displayCurrency: string;
    fxRates: Record<string, number>;
}

export interface BudgetActions {
    setCurrentMonth: (month: string) => void;
    clearToast: () => void;
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
    deleteTransaction: (id: number) => Promise<void>;
    fetchRollup: (month?: string) => Promise<void>;
    fetchRollupRange: (endMonth?: string, count?: number) => Promise<void>;
    // FX & Currency
    setAndPersistCurrency: (currency: string) => Promise<void>;
    hydrateSettings: () => Promise<void>;
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

    // ═══════════ ACTIONS ═══════════

    setCurrentMonth: (month) => set({ currentMonth: month }),
    clearToast: () => set({ toastError: null }),

    fetchCategories: async () => {
        try {
            set({ loading: true });
            const res = await fetch('/api/budget/categories');
            if (!res.ok) throw new Error('Failed to fetch categories');
            const data: BudgetCategory[] = await res.json();
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

    fetchTransactions: async (month?: string) => {
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

    fetchRollup: async (month?: string) => {
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
        } catch (err) {
            console.error('hydrateSettings error:', err);
        }
    },
}));

export default useBudgetStore;
