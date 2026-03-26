"use client";

import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SUPPORTED_CURRENCIES, getFallbackRates } from "@/lib/currency";
import useCurrencyStore from "@/stores/useCurrencyStore";
import pensionMap from "@/data/pension_fund_map.json";
import { queryKeys } from "@/hooks/useQueries";

interface MarketDataState {
    marketData: Record<string, any>;
    isRefreshingMarketData: boolean;
    marketDataCacheInfo: any | null;
}

/**
 * Encapsulates the ticker-building + market data fetching logic that was
 * previously embedded in PortfolioContext (~100 lines). Returns functions
 * to fetch/refresh market data and the current state.
 */
export function useMarketDataFetcher() {
    const queryClient = useQueryClient();
    const stateRef = useRef<MarketDataState>({
        marketData: {},
        isRefreshingMarketData: false,
        marketDataCacheInfo: null,
    });

    // We expose these via ref so fetchMarketData doesn't recapture stale closures
    const setMarketState = useCallback((updates: Partial<MarketDataState>) => {
        stateRef.current = { ...stateRef.current, ...updates };
    }, []);

    const fetchMarketData = useCallback(async (forceRefresh = false, prefetched: any = {}) => {
        try {
            if (forceRefresh) setMarketState({ isRefreshingMarketData: true });

            let assets, eqData, reData, cryptoData;

            if (!forceRefresh && prefetched.equity && prefetched.realEstate && prefetched.crypto) {
                eqData = prefetched.equity;
                reData = prefetched.realEstate;
                cryptoData = prefetched.crypto;
                const assetsRes = await fetch('/api/live-assets');
                assets = await assetsRes.json();
            } else {
                const [assetsRes, eqRes, reRes, cryptoRes] = await Promise.all([
                    fetch('/api/live-assets'),
                    fetch('/api/equity-transactions'),
                    fetch('/api/real-estate'),
                    fetch('/api/crypto-transactions')
                ]);
                [assets, eqData, reData, cryptoData] = await Promise.all([
                    assetsRes.json(), eqRes.json(), reRes.json(), cryptoRes.json()
                ]);
            }

            const tickerSet = new Set(assets && assets.length > 0 ? assets.map((a: any) => a.ticker).filter((t: any) => t !== 'CASH') : []);

            if (Array.isArray(eqData)) {
                eqData.forEach((tr: any) => { if (tr.ticker && tr.ticker !== 'CASH') tickerSet.add(tr.ticker); });
            }

            if (reData?.funds?.holdings) {
                reData.funds.holdings.forEach((h: any) => { if (h.ticker) tickerSet.add(h.ticker + '.SA'); });
            }

            if (Array.isArray(cryptoData)) {
                cryptoData.forEach((tr: any) => {
                    if (tr.ticker) {
                        const t = tr.ticker;
                        tickerSet.add(t.endsWith('-USD') ? t : t + '-USD');
                    }
                });
            }

            (pensionMap as any[]).forEach((p: any) => {
                if (p.ticker && p.type === 'market-data') tickerSet.add(p.ticker);
            });

            tickerSet.add('GBP-BRL');
            tickerSet.add('GBP-USD');

            const tickers = Array.from(tickerSet);

            const marketRes = await fetch('/api/market-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tickers, forceRefresh })
            });
            const data = await marketRes.json();

            let cacheInfo = null;
            if (data._cacheInfo) {
                cacheInfo = data._cacheInfo;
                delete data._cacheInfo;
            }

            setMarketState({ marketData: data, marketDataCacheInfo: cacheInfo });

            // Update currency rates from market data
            const currencyStore = useCurrencyStore.getState();
            if (data['GBP-BRL']?.price) {
                currencyStore.setRates((prev: Record<string, number>) => ({ ...prev, BRL: data['GBP-BRL'].price }));
            }
            if (data['GBP-USD']?.price) {
                currencyStore.setRates((prev: Record<string, number>) => ({ ...prev, USD: data['GBP-USD'].price }));
            }

            const fallback = getFallbackRates();
            currencyStore.setRates((prev: Record<string, number>) => {
                const updated = { ...prev };
                for (const code of Object.keys(SUPPORTED_CURRENCIES)) {
                    if (!updated[code]) updated[code] = fallback[code] || 1;
                }
                return updated;
            });

            currencyStore.setLoadingRates(false);

            // Seed the TanStack Query cache so consumers reading via query hooks get the data
            queryClient.setQueryData(queryKeys.pensionPrices, (prev: any) => prev); // keep existing

        } catch (error) {
            console.error('Failed to fetch market data:', error);
            useCurrencyStore.getState().setLoadingRates(false);
        } finally {
            setMarketState({ isRefreshingMarketData: false });
        }
    }, [queryClient, setMarketState]);

    const forceRefreshMarketData = useCallback(() => {
        return fetchMarketData(true);
    }, [fetchMarketData]);

    const getMarketState = useCallback(() => stateRef.current, []);

    return {
        fetchMarketData,
        forceRefreshMarketData,
        getMarketState,
    };
}
