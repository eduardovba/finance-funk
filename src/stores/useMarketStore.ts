"use client";

import { create } from 'zustand';

interface MarketState {
    marketData: Record<string, any>;
    pensionPrices: Record<string, any>;
    isRefreshingMarketData: boolean;
    marketDataCacheInfo: any | null;
}

interface MarketActions {
    setMarketData: (v: Record<string, any>) => void;
    setPensionPrices: (v: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => void;
    setIsRefreshingMarketData: (v: boolean) => void;
    setMarketDataCacheInfo: (v: any | null) => void;
}

const useMarketStore = create<MarketState & MarketActions>((set) => ({
    // ═══════════ STATE ═══════════
    marketData: {},
    pensionPrices: {},
    isRefreshingMarketData: false,
    marketDataCacheInfo: null,

    // ═══════════ SETTERS ═══════════
    setMarketData: (v) => set({ marketData: v }),
    setPensionPrices: (v) => set((prev) => ({
        pensionPrices: typeof v === 'function' ? v(prev.pensionPrices) : v
    })),
    setIsRefreshingMarketData: (v) => set({ isRefreshingMarketData: v }),
    setMarketDataCacheInfo: (v) => set({ marketDataCacheInfo: v }),
}));

export default useMarketStore;
