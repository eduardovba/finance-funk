"use client";

import { create } from 'zustand';

interface PortfolioState {
    transactions: any[];
    equityTransactions: any[];
    cryptoTransactions: any[];
    pensionTransactions: any[];
    debtTransactions: any[];
    realEstate: any | null;
    fixedIncomeTransactions: any[];
    historicalSnapshots: any[];
    lastUpdated: Date | null;
    isInitialLoading: boolean;
    ledgerData: any;
}

interface PortfolioActions {
    setTransactions: (v: any[] | ((prev: any[]) => any[])) => void;
    setEquityTransactions: (v: any[]) => void;
    setCryptoTransactions: (v: any[]) => void;
    setPensionTransactions: (v: any[]) => void;
    setDebtTransactions: (v: any[]) => void;
    setRealEstate: (v: any | null) => void;
    setFixedIncomeTransactions: (v: any[]) => void;
    setHistoricalSnapshots: (v: any[] | ((prev: any[]) => any[])) => void;
    setLastUpdated: (v: Date | null) => void;
    setIsInitialLoading: (v: boolean) => void;
    setLedgerData: (v: any) => void;
    setAllData: (data: Partial<PortfolioState>) => void;
}

const usePortfolioStore = create<PortfolioState & PortfolioActions>((set) => ({
    // ═══════════ STATE ═══════════
    transactions: [],
    equityTransactions: [],
    cryptoTransactions: [],
    pensionTransactions: [],
    debtTransactions: [],
    realEstate: null,
    fixedIncomeTransactions: [],
    historicalSnapshots: [],
    lastUpdated: null,
    isInitialLoading: true,
    ledgerData: '',

    // ═══════════ SETTERS ═══════════
    setTransactions: (v) => set((prev) => ({
        transactions: typeof v === 'function' ? v(prev.transactions) : v
    })),
    setEquityTransactions: (v) => set({ equityTransactions: v }),
    setCryptoTransactions: (v) => set({ cryptoTransactions: v }),
    setPensionTransactions: (v) => set({ pensionTransactions: v }),
    setDebtTransactions: (v) => set({ debtTransactions: v }),
    setRealEstate: (v) => set({ realEstate: v }),
    setFixedIncomeTransactions: (v) => set({ fixedIncomeTransactions: v }),
    setHistoricalSnapshots: (v) => set((prev) => ({
        historicalSnapshots: typeof v === 'function' ? v(prev.historicalSnapshots) : v
    })),
    setLastUpdated: (v) => set({ lastUpdated: v }),
    setIsInitialLoading: (v) => set({ isInitialLoading: v }),
    setLedgerData: (v) => set({ ledgerData: v }),
    setAllData: (data) => set(data),
}));

export default usePortfolioStore;
