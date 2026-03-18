"use client";

import { create } from 'zustand';
import { formatCurrency, convertCurrency, SUPPORTED_CURRENCIES } from '@/lib/currency';

const useCurrencyStore = create((set, get) => ({
    // ═══════════ STATE ═══════════
    primaryCurrency: 'BRL',
    secondaryCurrency: 'GBP',
    rateFlipped: false,
    displayCurrencyOverrides: {},   // per-category map, e.g. { equity: 'USD' }
    rates: { GBP: 1, BRL: 7.10, USD: 1.28 },
    loadingRates: true,
    fxHistory: {},
    currencyLoaded: false,

    // ═══════════ SETTERS ═══════════
    setPrimaryCurrency: (v) => set({ primaryCurrency: v }),
    setSecondaryCurrency: (v) => set({ secondaryCurrency: v }),
    setRateFlipped: (v) => set({ rateFlipped: v }),
    setDisplayCurrencyOverride: (category, value) =>
        set((s) => ({ displayCurrencyOverrides: { ...s.displayCurrencyOverrides, [category]: value } })),
    setRates: (r) => {
        if (typeof r === 'function') {
            set((s) => ({ rates: r(s.rates) }));
        } else {
            set({ rates: r });
        }
    },
    setLoadingRates: (v) => set({ loadingRates: v }),
    setFxHistory: (v) => set({ fxHistory: v }),

    // ═══════════ CURRENCY HELPERS ═══════════
    formatPrimary: (amount, options = {}) => formatCurrency(amount, get().primaryCurrency, options),
    formatSecondary: (amount, options = {}) => formatCurrency(amount, get().secondaryCurrency, options),
    toPrimary: (amount, fromCurrency = 'GBP') => convertCurrency(amount, fromCurrency, get().primaryCurrency, get().rates),
    toSecondary: (amount, fromCurrency = 'GBP') => convertCurrency(amount, fromCurrency, get().secondaryCurrency, get().rates),

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
            const savedFlipped = localStorage.getItem('ff_rateFlipped');
            const savedOverrides = localStorage.getItem('ff_displayCurrencyOverrides');
            const patch = {};
            if (savedPrimary && SUPPORTED_CURRENCIES[savedPrimary]) patch.primaryCurrency = savedPrimary;
            if (savedSecondary && SUPPORTED_CURRENCIES[savedSecondary]) patch.secondaryCurrency = savedSecondary;
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
        const { primaryCurrency, secondaryCurrency, rateFlipped, displayCurrencyOverrides, currencyLoaded } = get();
        if (!currencyLoaded) return;      // don't persist initial defaults
        if (typeof window !== 'undefined') {
            localStorage.setItem('ff_primaryCurrency', primaryCurrency);
            localStorage.setItem('ff_secondaryCurrency', secondaryCurrency);
            localStorage.setItem('ff_rateFlipped', rateFlipped);
            localStorage.setItem('ff_displayCurrencyOverrides', JSON.stringify(displayCurrencyOverrides));
        }
        // Background persist to DB
        fetch('/api/user/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ primaryCurrency, secondaryCurrency, rateFlipped, displayCurrencyOverrides }),
        }).catch(() => { /* ignore – localStorage is the instant fallback */ });
    },
}));

export default useCurrencyStore;
