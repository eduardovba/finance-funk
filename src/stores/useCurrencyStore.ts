"use client";

import { create } from 'zustand';
import { formatCurrency, convertCurrency, SUPPORTED_CURRENCIES } from '@/lib/currency';

// ═══════════ TYPES ═══════════

export interface CurrencyState {
    primaryCurrency: string;
    secondaryCurrency: string;
    singleCurrencyMode: boolean;
    rateFlipped: boolean;
    displayCurrencyOverrides: Record<string, string | null>;
    rates: Record<string, number>;
    loadingRates: boolean;
    fxHistory: Record<string, Record<string, number>>;
    currencyLoaded: boolean;
}

export interface CurrencyActions {
    setPrimaryCurrency: (v: string) => void;
    setSecondaryCurrency: (v: string) => void;
    setSingleCurrencyMode: (v: boolean) => void;
    setRateFlipped: (v: boolean) => void;
    setDisplayCurrencyOverride: (category: string, value: string | null) => void;
    setRates: (r: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
    setLoadingRates: (v: boolean) => void;
    setFxHistory: (v: Record<string, Record<string, number>>) => void;
    formatPrimary: (amount: number, options?: Intl.NumberFormatOptions) => string;
    formatSecondary: (amount: number, options?: Intl.NumberFormatOptions) => string;
    toPrimary: (amount: number, fromCurrency?: string) => number;
    toSecondary: (amount: number, fromCurrency?: string) => number;
    loadCurrencyPrefs: () => Promise<void>;
    persistCurrencyPrefs: () => void;
}

// ═══════════ STORE ═══════════

// ═══════════ CACHED RATE BOOTSTRAP ═══════════
// On first import, try to restore last-known live rates from localStorage.
// If found → numbers render instantly with near-accurate rates; loadingRates = false.
// If not found (first-ever visit) → keep static fallback but loadingRates stays true
// so the dashboard shows skeleton placeholders until the real rate arrives.
const _cachedRates: Record<string, number> | null = (() => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem('ff_cachedFxRates');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && parsed.BRL) return parsed;
        }
    } catch { /* corrupt or unavailable — fall through */ }
    return null;
})();

const useCurrencyStore = create<CurrencyState & CurrencyActions>((set, get) => ({
    // ═══════════ STATE ═══════════
    primaryCurrency: 'BRL',
    secondaryCurrency: 'GBP',
    singleCurrencyMode: false,
    rateFlipped: false,
    displayCurrencyOverrides: {},   // per-category map, e.g. { equity: 'USD' }
    rates: _cachedRates || { GBP: 1, BRL: 7.10, USD: 1.28 },
    loadingRates: !_cachedRates,    // false if we restored cached rates, true otherwise (skeleton mode)
    fxHistory: {},
    currencyLoaded: false,

    // ═══════════ SETTERS ═══════════
    setPrimaryCurrency: (v) => set({ primaryCurrency: v }),
    setSecondaryCurrency: (v) => set({ secondaryCurrency: v }),
    setSingleCurrencyMode: (v) => set({ singleCurrencyMode: v }),
    setRateFlipped: (v) => set({ rateFlipped: v }),
    setDisplayCurrencyOverride: (category, value) =>
        set((s) => ({ displayCurrencyOverrides: { ...s.displayCurrencyOverrides, [category]: value } })),
    setRates: (r) => {
        if (typeof r === 'function') {
            set((s) => {
                const newRates = r(s.rates);
                // Persist to localStorage so next page load starts with accurate rates
                if (typeof window !== 'undefined') {
                    try { localStorage.setItem('ff_cachedFxRates', JSON.stringify(newRates)); } catch { /* quota */ }
                }
                return { rates: newRates };
            });
        } else {
            set({ rates: r });
            if (typeof window !== 'undefined') {
                try { localStorage.setItem('ff_cachedFxRates', JSON.stringify(r)); } catch { /* quota */ }
            }
        }
    },
    setLoadingRates: (v) => set({ loadingRates: v }),
    setFxHistory: (v) => set({ fxHistory: v }),

    // ═══════════ CURRENCY HELPERS ═══════════
    formatPrimary: (amount, options = {}) => formatCurrency(amount, get().primaryCurrency, options),
    formatSecondary: (amount, options = {}) => get().singleCurrencyMode ? '' : formatCurrency(amount, get().secondaryCurrency, options),
    toPrimary: (amount, fromCurrency = 'GBP') => convertCurrency(amount, fromCurrency, get().primaryCurrency, get().rates),
    toSecondary: (amount, fromCurrency = 'GBP') => get().singleCurrencyMode ? 0 : convertCurrency(amount, fromCurrency, get().secondaryCurrency, get().rates),

    // ═══════════ LOAD FROM DB / LOCALSTORAGE ═══════════
    loadCurrencyPrefs: async () => {
        try {
            const res = await fetch('/api/user/profile');
            if (res.ok) {
                const data = await res.json();
                if (data.currencyPreferences) {
                    set({
                        primaryCurrency: data.currencyPreferences.primary || 'BRL',
                        secondaryCurrency: data.currencyPreferences.secondary || 'GBP',
                        singleCurrencyMode: data.currencyPreferences.singleCurrencyMode !== undefined
                            ? data.currencyPreferences.singleCurrencyMode : false,
                        rateFlipped: data.currencyPreferences.rateFlipped !== undefined
                            ? data.currencyPreferences.rateFlipped : false,
                        displayCurrencyOverrides:
                            data.currencyPreferences.displayCurrencyOverrides !== undefined
                                ? (data.currencyPreferences.displayCurrencyOverrides || {})
                                : {},
                        currencyLoaded: true,
                    });
                    return;
                }
            }
        } catch { /* fall through to localStorage */ }

        // Fallback to localStorage
        if (typeof window !== 'undefined') {
            const savedPrimary = localStorage.getItem('ff_primaryCurrency');
            const savedSecondary = localStorage.getItem('ff_secondaryCurrency');
            const savedSingleMode = localStorage.getItem('ff_singleCurrencyMode');
            const savedFlipped = localStorage.getItem('ff_rateFlipped');
            const savedOverrides = localStorage.getItem('ff_displayCurrencyOverrides');
            const patch: Partial<CurrencyState> = {};
            if (savedPrimary && SUPPORTED_CURRENCIES[savedPrimary]) patch.primaryCurrency = savedPrimary;
            if (savedSecondary && SUPPORTED_CURRENCIES[savedSecondary]) patch.secondaryCurrency = savedSecondary;
            if (savedSingleMode !== null) patch.singleCurrencyMode = savedSingleMode === 'true';
            if (savedFlipped !== null) patch.rateFlipped = savedFlipped === 'true';
            if (savedOverrides) {
                try { patch.displayCurrencyOverrides = JSON.parse(savedOverrides); } catch { /* ignore */ }
            }
            set(patch);
        }
        set({ currencyLoaded: true });
    },

    // ═══════════ PERSIST TO LOCALSTORAGE + DB ═══════════
    persistCurrencyPrefs: () => {
        const { primaryCurrency, secondaryCurrency, singleCurrencyMode, rateFlipped, displayCurrencyOverrides, currencyLoaded } = get();
        if (!currencyLoaded) return;      // don't persist initial defaults
        if (typeof window !== 'undefined') {
            localStorage.setItem('ff_primaryCurrency', primaryCurrency);
            localStorage.setItem('ff_secondaryCurrency', secondaryCurrency);
            localStorage.setItem('ff_singleCurrencyMode', String(singleCurrencyMode));
            localStorage.setItem('ff_rateFlipped', String(rateFlipped));
            localStorage.setItem('ff_displayCurrencyOverrides', JSON.stringify(displayCurrencyOverrides));
        }
        // Background persist to DB
        fetch('/api/user/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ primaryCurrency, secondaryCurrency, singleCurrencyMode, rateFlipped, displayCurrencyOverrides }),
        }).catch(() => { /* ignore – localStorage is the instant fallback */ });
    },
}));

export default useCurrencyStore;
