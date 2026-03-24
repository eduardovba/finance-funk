"use client";

import React, { createContext, useContext, useEffect, useMemo, useCallback } from "react";

/* ─── Diff helper type ─── */
interface DiffPair {
    amount: number;
    percentage: number;
}

/* ─── Status modal shape ─── */
interface StatusModalState {
    isOpen: boolean;
    title: string;
    message: string;
    type: string;
}

/* ─── PortfolioContextValue ─── */
export interface PortfolioContextValue {
    // Raw data
    transactions: any[];
    equityTransactions: any[];
    cryptoTransactions: any[];
    pensionTransactions: any[];
    debtTransactions: any[];
    fixedIncomeTransactions: any[];
    realEstate: any | null;
    historicalSnapshots: any[];
    marketData: Record<string, any>;
    pensionPrices: Record<string, any>;
    rates: Record<string, number>;
    loadingRates: boolean;
    lastUpdated: Date | null;
    isInitialLoading: boolean;
    isRefreshingMarketData: boolean;
    marketDataCacheInfo: any | null;
    ledgerData: any;
    fxHistory: Record<string, Record<string, number>>;
    forecastSettings: any;
    allocationTargets: any;
    sortedTransactions: any[];
    assetClasses: Record<string, any>;
    setAssetClasses: (v: any) => void;

    // Summaries
    fixedIncomeData: any;
    equityData: any;
    cryptoData: any;
    pensionData: any;
    realEstateData: any;
    debtData: any;
    totalFixedIncomeBRL: number;
    totalEquityBRL: number;
    totalCryptoBRL: number;
    totalPensionBRL: number;
    totalRealEstateBRL: number;
    totalDebtBRL: number;
    totalNetWorthBRL: number;
    dashboardData: any;
    masterMixData: any;
    monthlyInvestments: any[];
    dashboardConfig: any;
    setDashboardConfig: (v: any) => void;

    // Diffs
    diffPrevMonth: DiffPair;
    diffPrevMonthGBP: DiffPair;
    fxEffectBRL: DiffPair;
    assetEffectBRL: DiffPair;
    fxEffectGBP: DiffPair;
    assetEffectGBP: DiffPair;
    diffTarget: DiffPair;
    diffTargetGBP: DiffPair;
    assetDiffs: Record<string, DiffPair>;
    assetDiffsGBP: Record<string, DiffPair>;
    categoryAssetDiffs: Record<string, DiffPair>;

    // Actions
    refreshAllData: () => Promise<void>;
    fetchRealEstate: () => Promise<any>;
    fetchMarketData: (forceRefresh?: boolean, prefetched?: any) => Promise<void>;
    forceRefreshMarketData: () => Promise<void>;
    handleSaveTransaction: (formData: any) => Promise<void>;
    handleEditTransaction: (transaction: any) => void;
    handleDeleteClick: (id: string | number) => void;
    handleConfirmDelete: () => Promise<void>;
    handleRecordSnapshot: (snapshot?: any, options?: { silent?: boolean }) => Promise<void>;
    setForecastSettings: (v: any) => void;
    appSettings: any;
    handleUpdateAppSettings: (v: any) => void;

    // FTUE
    ftueState: any;
    setFtueState: (v: any) => void;
    updateFtueProgress: (updates: any) => Promise<any>;
    resetFtue: () => void;

    // UI State
    isFormOpen: boolean;
    setIsFormOpen: (v: boolean) => void;
    editingTransaction: any | null;
    setEditingTransaction: (v: any | null) => void;
    isDeleteModalOpen: boolean;
    setIsDeleteModalOpen: (v: boolean) => void;
    transactionToDelete: any | null;
    isInspectorOpen: boolean;
    setIsInspectorOpen: (v: boolean) => void;
    inspectorMode: string;
    setInspectorMode: (v: string) => void;
    statusModal: StatusModalState;
    setStatusModal: (v: any) => void;
    isMonthlyCloseModalOpen: boolean;
    setIsMonthlyCloseModalOpen: (v: boolean) => void;

    // Currency
    primaryCurrency: string;
    setPrimaryCurrency: (v: string) => void;
    secondaryCurrency: string;
    setSecondaryCurrency: (v: string) => void;
    rateFlipped: boolean;
    setRateFlipped: (v: boolean) => void;
    displayCurrencyOverrides: Record<string, string | null>;
    setDisplayCurrencyOverride: (category: string, value: string | null) => void;
    formatPrimary: (amount: number, options?: Intl.NumberFormatOptions) => string;
    formatSecondary: (amount: number, options?: Intl.NumberFormatOptions) => string;
    toPrimary: (amount: number, fromCurrency?: string) => number;
    toSecondary: (amount: number, fromCurrency?: string) => number;

    // Demo mode flag (only present in DemoPortfolioContext)
    isDemoMode?: boolean;
}
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency, convertCurrency, SUPPORTED_CURRENCIES, getFallbackRates } from '@/lib/currency';
import useCurrencyStore from '@/stores/useCurrencyStore';
import useUIStore from '@/stores/useUIStore';
import useFTUEStore from '@/stores/useFTUEStore';
import useSettingsStore from '@/stores/useSettingsStore';
import usePortfolioStore from '@/stores/usePortfolioStore';
import useMarketStore from '@/stores/useMarketStore';
import {
    useTransactionsQuery, useEquityTransactionsQuery, useCryptoTransactionsQuery,
    useFixedIncomeQuery, usePensionsQuery, useDebtTransactionsQuery, useRealEstateQuery,
    useHistoricalSnapshotsQuery, useLedgerDataQuery, useFxRatesQuery, usePensionPricesQuery,
    useAllocationTargetsQuery, useAssetClassesQuery, useAppSettingsQuery,
    useForecastSettingsQuery, useDashboardConfigQuery,
    useSaveTransactionMutation, useDeleteTransactionMutation, useSaveSnapshotMutation,
    queryKeys,
} from '@/hooks/useQueries';
import { normalizeTransactions, calculateMonthlyIncome, calculateMonthlyInvestments } from '@/lib/ledgerUtils';
import { calculateFV, getMonthDiff, parseDate as parseForecastDate, calculatePMT } from '@/lib/forecastUtils';
import actualsData from '@/data/forecast_actuals.json';
import pensionMap from '@/data/pension_fund_map.json';
import {
    getFixedIncomeSummary,
    getEquitySummary,
    getCryptoSummary,
    getPensionSummary,
    getRealEstateSummary,
    getDebtSummary,
    getMasterMixData
} from "@/lib/portfolioUtils";
import demoData from '@/lib/demoData';

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
    // ═══════════ RAW DATA (from usePortfolioStore) ═══════════
    const transactions = usePortfolioStore(s => s.transactions);
    const setTransactions = usePortfolioStore(s => s.setTransactions);
    const equityTransactions = usePortfolioStore(s => s.equityTransactions);
    const setEquityTransactions = usePortfolioStore(s => s.setEquityTransactions);
    const cryptoTransactions = usePortfolioStore(s => s.cryptoTransactions);
    const setCryptoTransactions = usePortfolioStore(s => s.setCryptoTransactions);
    const pensionTransactions = usePortfolioStore(s => s.pensionTransactions);
    const setPensionTransactions = usePortfolioStore(s => s.setPensionTransactions);
    const debtTransactions = usePortfolioStore(s => s.debtTransactions);
    const setDebtTransactions = usePortfolioStore(s => s.setDebtTransactions);
    const realEstate = usePortfolioStore(s => s.realEstate);
    const setRealEstate = usePortfolioStore(s => s.setRealEstate);
    const fixedIncomeTransactions = usePortfolioStore(s => s.fixedIncomeTransactions);
    const setFixedIncomeTransactions = usePortfolioStore(s => s.setFixedIncomeTransactions);
    const historicalSnapshots = usePortfolioStore(s => s.historicalSnapshots);
    const setHistoricalSnapshots = usePortfolioStore(s => s.setHistoricalSnapshots);
    const lastUpdated = usePortfolioStore(s => s.lastUpdated);
    const setLastUpdated = usePortfolioStore(s => s.setLastUpdated);
    const isInitialLoading = usePortfolioStore(s => s.isInitialLoading);
    const setIsInitialLoading = usePortfolioStore(s => s.setIsInitialLoading);
    const ledgerData = usePortfolioStore(s => s.ledgerData);
    const setLedgerData = usePortfolioStore(s => s.setLedgerData);

    // ═══════════ MARKET DATA (from useMarketStore) ═══════════
    const marketData = useMarketStore(s => s.marketData);
    const setMarketData = useMarketStore(s => s.setMarketData);
    const pensionPrices = useMarketStore(s => s.pensionPrices);
    const setPensionPrices = useMarketStore(s => s.setPensionPrices);
    const isRefreshingMarketData = useMarketStore(s => s.isRefreshingMarketData);
    const setIsRefreshingMarketData = useMarketStore(s => s.setIsRefreshingMarketData);
    const marketDataCacheInfo = useMarketStore(s => s.marketDataCacheInfo);
    const setMarketDataCacheInfo = useMarketStore(s => s.setMarketDataCacheInfo);

    // ═══════════ CURRENCY (from useCurrencyStore) ═══════════
    const rates = useCurrencyStore(s => s.rates);
    const setRates = useCurrencyStore(s => s.setRates);
    const loadingRates = useCurrencyStore(s => s.loadingRates);
    const setLoadingRates = useCurrencyStore(s => s.setLoadingRates);
    const fxHistory = useCurrencyStore(s => s.fxHistory);
    const setFxHistory = useCurrencyStore(s => s.setFxHistory);

    // ═══════════ SETTINGS (from Zustand store) ═══════════
    const forecastSettings = useSettingsStore(s => s.forecastSettings);
    const setForecastSettings = useSettingsStore(s => s.setForecastSettings);
    const allocationTargets = useSettingsStore(s => s.allocationTargets);
    const setAllocationTargets = useSettingsStore(s => s.setAllocationTargets);
    const assetClasses = useSettingsStore(s => s.assetClasses);
    const setAssetClasses = useSettingsStore(s => s.setAssetClasses);
    const appSettings = useSettingsStore(s => s.appSettings);
    const setAppSettings = useSettingsStore(s => s.setAppSettings);
    const dashboardConfig = useSettingsStore(s => s.dashboardConfig);
    const setDashboardConfig = useSettingsStore(s => s.setDashboardConfig);
    const handleUpdateAppSettings = useSettingsStore(s => s.handleUpdateAppSettings);

    // ═══════════ FTUE (from Zustand store) ═══════════
    const ftueState = useFTUEStore(s => s.ftueState);
    const setFtueState = useFTUEStore(s => s.setFtueState);
    const updateFtueProgress = useFTUEStore(s => s.updateFtueProgress);

    // ═══════════ UI STATE (from Zustand store) ═══════════
    const isFormOpen = useUIStore(s => s.isFormOpen);
    const setIsFormOpen = useUIStore(s => s.setIsFormOpen);
    const editingTransaction = useUIStore(s => s.editingTransaction);
    const setEditingTransaction = useUIStore(s => s.setEditingTransaction);
    const isDeleteModalOpen = useUIStore(s => s.isDeleteModalOpen);
    const setIsDeleteModalOpen = useUIStore(s => s.setIsDeleteModalOpen);
    const transactionToDelete = useUIStore(s => s.transactionToDelete);
    const setTransactionToDelete = useUIStore(s => s.setTransactionToDelete);
    const isInspectorOpen = useUIStore(s => s.isInspectorOpen);
    const setIsInspectorOpen = useUIStore(s => s.setIsInspectorOpen);
    const inspectorMode = useUIStore(s => s.inspectorMode);
    const setInspectorMode = useUIStore(s => s.setInspectorMode);
    const statusModal = useUIStore(s => s.statusModal);
    const setStatusModal = useUIStore(s => s.setStatusModal);
    const isMonthlyCloseModalOpen = useUIStore(s => s.isMonthlyCloseModalOpen);
    const setIsMonthlyCloseModalOpen = useUIStore(s => s.setIsMonthlyCloseModalOpen);

    // ═══════════ CURRENCY (from Zustand store) ═══════════
    const primaryCurrency = useCurrencyStore(s => s.primaryCurrency);
    const secondaryCurrency = useCurrencyStore(s => s.secondaryCurrency);
    const displayCurrencyOverrides = useCurrencyStore(s => s.displayCurrencyOverrides);
    const rateFlipped = useCurrencyStore(s => s.rateFlipped);
    const currencyLoaded = useCurrencyStore(s => s.currencyLoaded);
    const formatPrimary = useCurrencyStore(s => s.formatPrimary);
    const formatSecondary = useCurrencyStore(s => s.formatSecondary);
    const toPrimary = useCurrencyStore(s => s.toPrimary);
    const toSecondary = useCurrencyStore(s => s.toSecondary);
    const setPrimaryCurrency = useCurrencyStore(s => s.setPrimaryCurrency);
    const setSecondaryCurrency = useCurrencyStore(s => s.setSecondaryCurrency);
    const setRateFlipped = useCurrencyStore(s => s.setRateFlipped);
    const setDisplayCurrencyOverride = useCurrencyStore(s => s.setDisplayCurrencyOverride);

    // Load currency prefs once on mount
    useEffect(() => { useCurrencyStore.getState().loadCurrencyPrefs(); }, []);

    // Persist currency prefs whenever they change
    useEffect(() => {
        useCurrencyStore.getState().persistCurrencyPrefs();
    }, [primaryCurrency, secondaryCurrency, rateFlipped, displayCurrencyOverrides]);

    // ═══════════ TANSTACK QUERY HOOKS ═══════════
    const queryClient = useQueryClient();

    const { data: txData } = useTransactionsQuery();
    const { data: eqTxData } = useEquityTransactionsQuery();
    const { data: cryptoTxData } = useCryptoTransactionsQuery();
    const { data: fiData } = useFixedIncomeQuery();
    const { data: pensionTxData } = usePensionsQuery();
    const { data: debtTxData } = useDebtTransactionsQuery();
    const { data: reData } = useRealEstateQuery();
    const { data: snapshotData } = useHistoricalSnapshotsQuery();
    const { data: ledgerResult } = useLedgerDataQuery();
    const { data: fxData } = useFxRatesQuery();
    const { data: pensionPriceData } = usePensionPricesQuery();
    const { data: allocData } = useAllocationTargetsQuery();
    const { data: assetClassData } = useAssetClassesQuery();
    const { data: settingsData } = useAppSettingsQuery();
    const { data: forecastData } = useForecastSettingsQuery();
    const { data: dashConfigData } = useDashboardConfigQuery();

    // Mutation hooks
    const saveTransactionMutation = useSaveTransactionMutation();
    const deleteTransactionMutation = useDeleteTransactionMutation();
    const saveSnapshotMutation = useSaveSnapshotMutation();

    // ═══════════ BRIDGE EFFECTS (query results → Zustand stores) ═══════════
    useEffect(() => { if (txData) setTransactions(Array.isArray(txData) ? txData : []); }, [txData]);
    useEffect(() => { if (eqTxData) setEquityTransactions(Array.isArray(eqTxData) ? eqTxData : []); }, [eqTxData]);
    useEffect(() => { if (cryptoTxData) setCryptoTransactions(Array.isArray(cryptoTxData) ? cryptoTxData : []); }, [cryptoTxData]);
    useEffect(() => { if (fiData) setFixedIncomeTransactions(Array.isArray(fiData) ? fiData : []); }, [fiData]);
    useEffect(() => { if (pensionTxData) setPensionTransactions(Array.isArray(pensionTxData) ? pensionTxData : []); }, [pensionTxData]);
    useEffect(() => { if (debtTxData) setDebtTransactions(Array.isArray(debtTxData) ? debtTxData : []); }, [debtTxData]);
    useEffect(() => { if (reData) setRealEstate(reData); }, [reData]);
    useEffect(() => { if (snapshotData) setHistoricalSnapshots(Array.isArray(snapshotData) ? snapshotData : []); }, [snapshotData]);
    useEffect(() => { if (ledgerResult) setLedgerData(ledgerResult); }, [ledgerResult]);
    useEffect(() => { if (fxData) setFxHistory(fxData); }, [fxData]);
    useEffect(() => { if (pensionPriceData) setPensionPrices(pensionPriceData); }, [pensionPriceData]);
    useEffect(() => { if (allocData) setAllocationTargets(allocData); }, [allocData]);
    useEffect(() => { if (assetClassData) setAssetClasses(assetClassData); }, [assetClassData]);
    useEffect(() => { if (settingsData) setAppSettings(prev => ({ ...prev, ...settingsData })); }, [settingsData]);
    useEffect(() => { if (forecastData) setForecastSettings(forecastData); }, [forecastData]);
    useEffect(() => { if (dashConfigData) setDashboardConfig(dashConfigData); }, [dashConfigData]);

    // Flip isInitialLoading once first round of queries settles
    const allQueriesSettled = txData !== undefined && eqTxData !== undefined;
    useEffect(() => {
        if (allQueriesSettled && isInitialLoading) {
            setIsInitialLoading(false);
            setLastUpdated(new Date());
        }
    }, [allQueriesSettled, isInitialLoading]);

    // ═══════════ HELPERS ═══════════
    const parseDate = (dateStr: any): Date => {
        if (!dateStr) return new Date();
        if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            const y = parseInt(parts[0]);
            const m = parseInt(parts[1]);
            const d = parts[2] ? parseInt(parts[2]) : 1;
            return new Date(y, m - 1, d);
        }
        const [day, month, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
    };

    // ═══════════ FETCHERS ═══════════
    const fetchRealEstate = useCallback(async () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.realEstate });
    }, [queryClient]);

    const fetchMarketData = useCallback(async (forceRefresh = false, prefetched: any = {}) => {
        try {
            if (forceRefresh) setIsRefreshingMarketData(true);

            // Use pre-fetched data when available (from refreshAllData), otherwise fetch fresh
            let assets, eqData, reData, cryptoData;

            if (!forceRefresh && prefetched.equity && prefetched.realEstate && prefetched.crypto) {
                // Reuse data already fetched by refreshAllData — avoids 3 duplicate requests
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
                eqData.forEach(tr => { if (tr.ticker && tr.ticker !== 'CASH') tickerSet.add(tr.ticker); });
            }

            if (reData?.funds?.holdings) {
                reData.funds.holdings.forEach((h: any) => { if (h.ticker) tickerSet.add(h.ticker + '.SA'); });
            }

            if (Array.isArray(cryptoData)) {
                cryptoData.forEach(tr => {
                    if (tr.ticker) {
                        const t = tr.ticker;
                        tickerSet.add(t.endsWith('-USD') ? t : t + '-USD');
                    }
                });
            }

            (pensionMap as any[]).forEach((p: any) => {
                if (p.ticker && p.type === 'market-data') {
                    tickerSet.add(p.ticker);
                }
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

            // Extract cache metadata before setting market data
            if (data._cacheInfo) {
                setMarketDataCacheInfo(data._cacheInfo);
                delete data._cacheInfo;
            }

            setMarketData(data);

            if (data['GBP-BRL']?.price) {
                setRates(prev => ({ ...prev, BRL: data['GBP-BRL'].price }));
            }
            if (data['GBP-USD']?.price) {
                setRates(prev => ({ ...prev, USD: data['GBP-USD'].price }));
            }

            // Also update rates for all supported currencies from fallback
            const fallback = getFallbackRates();
            setRates(prev => {
                const updated = { ...prev };
                for (const code of Object.keys(SUPPORTED_CURRENCIES)) {
                    if (!updated[code]) updated[code] = fallback[code] || 1;
                }
                return updated;
            });

            setLastUpdated(new Date());
            setLoadingRates(false);
            setIsInitialLoading(false);

        } catch (error) {
            console.error('Failed to fetch market data:', error);
            setLoadingRates(false);
        } finally {
            setIsRefreshingMarketData(false);
        }
    }, []);

    const forceRefreshMarketData = useCallback(() => {
        return fetchMarketData(true);
    }, [fetchMarketData]);

    const refreshAllData = useCallback(async () => {
        // 1. Fetch FTUE state first to know if we are in demo mode
        let ftueStateData = null;
        try {
            const ftueRes = await fetch('/api/ftue');
            if (ftueRes.ok) {
                ftueStateData = await ftueRes.json();
                setFtueState(ftueStateData);
            }
        } catch (e) {
            console.error("Failed to load FTUE state", e);
        }

        // Check for pending onboarding data from OAuth flow (saved to sessionStorage before Google redirect)
        if (typeof window !== 'undefined') {
            const pendingOnboarding = sessionStorage.getItem('ff_onboarding');
            if (pendingOnboarding && ftueStateData) {
                try {
                    const onboardingData = JSON.parse(pendingOnboarding);
                    
                    // Only apply if this user hasn't had onboarding data set yet
                    if (!ftueStateData.onboardingGoal) {
                        const updates = {
                            wizardCompleted: true,
                            isTutorialActive: false,
                            showCurrencyPicker: false,
                            onboardingGoal: onboardingData.goal || 'both',
                            onboardingExperience: onboardingData.experienceLevel || 'beginner',
                            showFirstVisitGreeting: true,
                            checklistItems: {
                                ...(ftueStateData.checklistItems || {}),
                                setCurrencies: !!onboardingData.primaryCurrency,
                            },
                        };
                        
                        const patchRes = await fetch('/api/ftue', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(updates),
                        });
                        
                        if (patchRes.ok) {
                            ftueStateData = await patchRes.json();
                            setFtueState(ftueStateData);
                        }
                        
                        // Set currency preferences via the currency store
                        if (onboardingData.primaryCurrency) {
                            useCurrencyStore.getState().setPrimaryCurrency(onboardingData.primaryCurrency);
                            if (onboardingData.secondaryCurrency) {
                                useCurrencyStore.getState().setSecondaryCurrency(onboardingData.secondaryCurrency);
                            }
                            setTimeout(() => {
                                useCurrencyStore.getState().persistCurrencyPrefs();
                            }, 100);
                        }
                    }
                    
                    sessionStorage.removeItem('ff_onboarding');
                } catch (e) {
                    console.error('Failed to process onboarding data:', e);
                    sessionStorage.removeItem('ff_onboarding');
                }
            }
        }

        // 2. If using demo data OR wizard not yet completed (first visit — dashboard renders behind overlay),
        //    bypass APIs and inject demo data instantly
        if (ftueStateData?.usingDemoData || ftueStateData?.wizardCompleted === false) {
            console.log("[FTUE] Using demo dataset instead of real APIs");
            setTransactions(demoData.transactions);
            setEquityTransactions(demoData.equityTransactions);
            setCryptoTransactions(demoData.cryptoTransactions);
            setRealEstate(demoData.realEstate);
            setFixedIncomeTransactions(demoData.fixedIncomeTransactions);
            setPensionTransactions(demoData.pensionTransactions);
            setDebtTransactions(demoData.debtTransactions);
            setHistoricalSnapshots(demoData.historicalSnapshots);
            setLedgerData(demoData.ledgerData);
            setFxHistory(demoData.fxHistory as any);
            setAllocationTargets(demoData.allocationTargets);
            setAssetClasses(demoData.assetClasses as any);
            // Still load user's app settings (background, preferences) even in demo mode
            try {
                const settingsRes = await fetch('/api/app-settings');
                const savedSettings = await settingsRes.json();
                setAppSettings(prev => ({ ...prev, ...demoData.appSettings, ...savedSettings }));
            } catch {
                setAppSettings(prev => ({ ...prev, ...demoData.appSettings }));
            }
            setForecastSettings(demoData.forecastSettings);
            setDashboardConfig(demoData.dashboardConfig);
            
            setMarketData(demoData.marketData);
            setRates(demoData.rates);
            setPensionPrices(demoData.pensionPrices);
            

            setLastUpdated(new Date());
            setLoadingRates(false);
            setIsInitialLoading(false);
            return;
        }

        // 3. Non-demo: invalidate all TanStack Query caches — they auto-refetch
        queryClient.invalidateQueries();

        // fetchMarketData stays manual (complex ticker-building logic)
        fetchMarketData();
    }, [fetchMarketData, queryClient]);

    // ═══════════ INITIAL LOAD ═══════════
    useEffect(() => {
        refreshAllData();
    }, [refreshAllData]);

    // ═══════════ MEMOIZED SELECTORS ═══════════
    const fixedIncomeData = useMemo(() => getFixedIncomeSummary(fixedIncomeTransactions, rates, null, assetClasses), [fixedIncomeTransactions, rates, assetClasses]);
    const equityData = useMemo(() => getEquitySummary(equityTransactions, marketData, rates, null, assetClasses), [equityTransactions, marketData, rates, assetClasses]);
    const cryptoData = useMemo(() => getCryptoSummary(cryptoTransactions, marketData, rates, null, assetClasses), [cryptoTransactions, marketData, rates, assetClasses]);
    const pensionData = useMemo(() => getPensionSummary(pensionTransactions, rates, pensionPrices, marketData, null, assetClasses), [pensionTransactions, rates, pensionPrices, marketData, assetClasses]);
    const realEstateData = useMemo(() => getRealEstateSummary(realEstate || {}, marketData, rates, null, assetClasses), [realEstate, marketData, rates, assetClasses]);
    const debtData = useMemo(() => getDebtSummary(debtTransactions, rates, null, assetClasses), [debtTransactions, rates, assetClasses]);

    const totalFixedIncomeBRL = fixedIncomeData.total.brl;
    const totalEquityBRL = equityData.total.brl;
    const totalCryptoBRL = cryptoData.total.brl;
    const totalPensionBRL = pensionData.total.brl;
    const totalRealEstateBRL = realEstateData.total.brl;
    const totalDebtBRL = debtData.total.brl;
    const totalNetWorthBRL = totalFixedIncomeBRL + totalEquityBRL + totalCryptoBRL + totalPensionBRL + totalRealEstateBRL - totalDebtBRL;

    const sortedTransactions = useMemo(() =>
        [...transactions].sort((a: any, b: any) => parseDate(b.date).getTime() - parseDate(a.date).getTime()),
        [transactions]
    );

    const monthlyInvestments = useMemo(() => {
        if (!ledgerData || !ledgerData.investments) return [];

        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Filter out current month so it always recalculates live (matches GeneralLedgerTab behavior)
        const filteredHistorical = ledgerData.investments.filter((h: any) => h.month !== currentMonth);

        const allLive = normalizeTransactions({
            equity: equityTransactions,
            crypto: cryptoTransactions,
            pensions: pensionTransactions,
            debt: debtTransactions,
            fixedIncome: transactions,
            realEstate: realEstate
        } as any, rates as any, fxHistory as any);

        return calculateMonthlyInvestments(allLive, filteredHistorical);
    }, [equityTransactions, cryptoTransactions, pensionTransactions, debtTransactions, transactions, realEstate, ledgerData, rates, fxHistory]);

    const masterMixData = useMemo(() => {
        return getMasterMixData(
            fixedIncomeTransactions,
            realEstate,
            equityTransactions,
            cryptoTransactions,
            pensionTransactions,
            rates,
            pensionMap,
            marketData,
            pensionPrices,
            undefined,
            assetClasses
        );
    }, [fixedIncomeTransactions, realEstate, equityTransactions, cryptoTransactions, pensionTransactions, rates, marketData, pensionPrices, assetClasses]);

    // ═══════════ DASHBOARD DATA ═══════════
    const dashboardData = useMemo(() => ({
        netWorth: { amount: totalNetWorthBRL, percentage: 0, currency: "BRL" },
        summaries: [
            { id: 'fixed-income', title: "Fixed Income", amount: totalFixedIncomeBRL, percentage: 0, currency: "BRL" },
            { id: 'equity', title: "Equity", amount: totalEquityBRL, percentage: 0, currency: "BRL" },
            { id: 'real-estate', title: "Real Estate", amount: totalRealEstateBRL, percentage: 0, currency: "BRL" },
            { id: 'crypto', title: "Crypto", amount: totalCryptoBRL, percentage: 0, currency: "BRL" },
            { id: 'pensions', title: "Pensions", amount: totalPensionBRL, percentage: 0, currency: "BRL" },
            { id: 'debt', title: "Debt", amount: totalDebtBRL, percentage: 0, currency: "BRL" },
        ],
        categories: [
            { id: 'fixed-income', title: 'Fixed Income', assets: [...fixedIncomeData.assets, fixedIncomeData.total], transactions: sortedTransactions },
            { id: 'equity', title: 'Equity', assets: [...equityData.assets, equityData.total] },
            { id: 'crypto', title: 'Crypto', assets: [...cryptoData.assets, cryptoData.total] },
            { id: 'real-estate', title: 'Real Estate', assets: [...realEstateData.assets, realEstateData.total] },
            { id: 'pensions', title: 'Pensions', assets: [...pensionData.assets, pensionData.total] },
            { id: 'debt', title: 'Debt', assets: [...debtData.assets, debtData.total] }
        ]
    }), [totalNetWorthBRL, totalFixedIncomeBRL, totalEquityBRL, totalRealEstateBRL, totalCryptoBRL, totalPensionBRL, totalDebtBRL,
        fixedIncomeData, equityData, cryptoData, realEstateData, pensionData, debtData, sortedTransactions]);

    // ═══════════ DIFFS ═══════════
    const diffs = useMemo(() => {
        let diffPrevMonth = { amount: 0, percentage: 0 };
        let diffPrevMonthGBP = { amount: 0, percentage: 0 };
        let fxEffectBRL = { amount: 0, percentage: 0 };
        let assetEffectBRL = { amount: 0, percentage: 0 };
        let fxEffectGBP = { amount: 0, percentage: 0 };
        let assetEffectGBP = { amount: 0, percentage: 0 };
        let diffTarget = { amount: 0, percentage: 0 };
        let diffTargetGBP = { amount: 0, percentage: 0 };
        let assetDiffs: Record<string, DiffPair> = {};
        let assetDiffsGBP: Record<string, DiffPair> = {};
        let categoryAssetDiffs: Record<string, any> = {};

        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        if (historicalSnapshots.length > 0) {
            const sortedSnapshots = [...historicalSnapshots].sort((a, b) => a.month.localeCompare(b.month));
            const pastSnapshots = sortedSnapshots.filter(s => s.month < currentMonth);
            const prevSnapshot = pastSnapshots.length > 0 ? pastSnapshots[pastSnapshots.length - 1] : null;

            if (prevSnapshot) {
                const prevNetWorth = prevSnapshot.networthBRL || prevSnapshot.totalBRL || 0;
                const prevNetWorthGBP = prevSnapshot.networthGBP || (prevNetWorth / rates.BRL);
                const impliedPrevRate = prevNetWorthGBP !== 0 ? prevNetWorth / prevNetWorthGBP : rates.BRL;

                if (prevNetWorth > 0) {
                    diffPrevMonth.amount = totalNetWorthBRL - prevNetWorth;
                    diffPrevMonth.percentage = ((totalNetWorthBRL - prevNetWorth) / prevNetWorth) * 100;

                    const currentNetWorthGBP = totalNetWorthBRL / rates.BRL;
                    diffPrevMonthGBP.amount = currentNetWorthGBP - prevNetWorthGBP;
                    diffPrevMonthGBP.percentage = ((currentNetWorthGBP - prevNetWorthGBP) / prevNetWorthGBP) * 100;

                    // FX Attribution (BRL perspective):
                    // "If asset prices stayed the same, how much did FX alone change the BRL value?"
                    // prevNW was prevNetWorthGBP * impliedPrevRate in BRL.
                    // At today's rate, same GBP assets would be prevNetWorthGBP * rates.BRL
                    const fxAmountBRL = prevNetWorthGBP * (rates.BRL - impliedPrevRate);
                    fxEffectBRL.amount = fxAmountBRL;
                    fxEffectBRL.percentage = prevNetWorth > 0 ? (fxAmountBRL / prevNetWorth) * 100 : 0;
                    assetEffectBRL.amount = diffPrevMonth.amount - fxAmountBRL;
                    assetEffectBRL.percentage = prevNetWorth > 0 ? (assetEffectBRL.amount / prevNetWorth) * 100 : 0;

                    // FX Attribution (GBP perspective):
                    // "If asset prices stayed the same, how much did FX alone change the GBP value?"
                    // Current GBP = totalNetWorthBRL / rates.BRL
                    // If rate hadn't changed: totalNetWorthBRL / impliedPrevRate
                    // FX effect in GBP = prevNW_BRL/impliedPrevRate - prevNW_BRL/rates.BRL
                    //   = prevNetWorth * (1/impliedPrevRate - 1/rates.BRL)
                    const fxAmountGBP = prevNetWorth * (1 / rates.BRL - 1 / impliedPrevRate);
                    fxEffectGBP.amount = fxAmountGBP;
                    fxEffectGBP.percentage = prevNetWorthGBP > 0 ? (fxAmountGBP / prevNetWorthGBP) * 100 : 0;
                    assetEffectGBP.amount = diffPrevMonthGBP.amount - fxAmountGBP;
                    assetEffectGBP.percentage = prevNetWorthGBP > 0 ? (assetEffectGBP.amount / prevNetWorthGBP) * 100 : 0;
                }

                const snapshotCats = prevSnapshot.categories || {};
                const categories = ['FixedIncome', 'Equity', 'RealEstate', 'Crypto', 'Pensions', 'Debt'];
                const catIdMap: Record<string, string> = {
                    'FixedIncome': 'fixed-income', 'Equity': 'equity', 'RealEstate': 'real-estate',
                    'Crypto': 'crypto', 'Pensions': 'pensions', 'Debt': 'debt'
                };

                categories.forEach(cat => {
                    const catId = catIdMap[cat];
                    const prevAmountBRL = snapshotCats[cat] || 0;
                    const prevAmountGBP = prevAmountBRL / impliedPrevRate;

                    let currentAmountBRL = 0;
                    if (cat === 'FixedIncome') currentAmountBRL = totalFixedIncomeBRL;
                    else if (cat === 'Equity') currentAmountBRL = totalEquityBRL;
                    else if (cat === 'RealEstate') currentAmountBRL = totalRealEstateBRL;
                    else if (cat === 'Crypto') currentAmountBRL = totalCryptoBRL;
                    else if (cat === 'Pensions') currentAmountBRL = totalPensionBRL;
                    else if (cat === 'Debt') currentAmountBRL = totalDebtBRL;

                    const currentAmountGBP = currentAmountBRL / rates.BRL;

                    assetDiffs[catId] = {
                        amount: currentAmountBRL - prevAmountBRL,
                        percentage: prevAmountBRL !== 0 ? ((currentAmountBRL - prevAmountBRL) / prevAmountBRL) * 100 : 0
                    };

                    assetDiffsGBP[catId] = {
                        amount: currentAmountGBP - prevAmountGBP,
                        percentage: prevAmountGBP !== 0 ? ((currentAmountGBP - prevAmountGBP) / prevAmountGBP) * 100 : 0
                    };

                    // ─── Asset-Level Diffs ───
                    const prevAssets = prevSnapshot.assetDetails?.[catId] || [];
                    const currentAssets = [];
                    if (cat === 'FixedIncome') currentAssets.push(...(fixedIncomeData.individualHoldings || fixedIncomeData.assets));
                    else if (cat === 'Equity') currentAssets.push(...(equityData.individualHoldings || equityData.assets));
                    else if (cat === 'RealEstate') currentAssets.push(...(realEstateData.individualHoldings || realEstateData.assets));
                    else if (cat === 'Crypto') currentAssets.push(...(cryptoData.individualHoldings || cryptoData.assets));
                    else if (cat === 'Pensions') currentAssets.push(...(pensionData.individualHoldings || pensionData.assets));
                    else if (cat === 'Debt') currentAssets.push(...(debtData.individualHoldings || debtData.assets));

                    categoryAssetDiffs[catId] = {} as Record<string, DiffPair>;
                    currentAssets.filter((a: any) => !a.isTotal).forEach((curr: any) => {
                        const prev = prevAssets.find((p: any) => p.name === curr.name);
                        const prevBRL = prev ? prev.brl : 0;
                        categoryAssetDiffs[catId][curr.name] = {
                            amount: curr.brl - prevBRL,
                            percentage: prevBRL !== 0 ? ((curr.brl - prevBRL) / prevBRL) * 100 : 0
                        };
                    });
                });
            }
        }

        // ─── vs. Target ───
        // Compute the expected portfolio value for today by:
        // 1. Starting from the first historical actuals entry.
        // 2. Using the same Monthly Growth projection as planned (rate + PMT).
        // 3. Comparing current live net worth against that projected value for today.
        const firstActual = (actualsData as any[])[0];
        const goal2031 = (forecastSettings as any)?.yearlyGoals?.[2031] || (forecastSettings as any)?.yearlyGoals?.['2031'];

        if (firstActual && goal2031 > 0) {
            const startValue = firstActual.actualBRL || 0;
            const anchorDate = parseForecastDate(firstActual.date);
            const monthlyRate = ((forecastSettings as any).annualInterestRate || 10) / 100 / 12;

            // Calculate where we SHOULD be today on the FV curve anchored to the goal
            // Method: solve for the PMT that would reach goal2031 from anchor, then project to now.
            const targetDate2031 = new Date(2031, 11, 1);
            const monthsToGoal = getMonthDiff(anchorDate, targetDate2031);
            const requiredPMT = calculatePMT(goal2031, startValue, monthlyRate, monthsToGoal);

            const monthsToNow = getMonthDiff(anchorDate, new Date());
            const expectedTarget = calculateFV(startValue, monthlyRate, monthsToNow, requiredPMT);

            if (expectedTarget > 0) {
                diffTarget.amount = totalNetWorthBRL - expectedTarget;
                diffTarget.percentage = (diffTarget.amount / expectedTarget) * 100;

                const expectedTargetGBP = expectedTarget / rates.BRL;
                const currentNetWorthGBP = totalNetWorthBRL / rates.BRL;
                diffTargetGBP.amount = currentNetWorthGBP - expectedTargetGBP;
                diffTargetGBP.percentage = (diffTargetGBP.amount / expectedTargetGBP) * 100;
            }
        }

        return { diffPrevMonth, diffPrevMonthGBP, fxEffectBRL, assetEffectBRL, fxEffectGBP, assetEffectGBP, diffTarget, diffTargetGBP, assetDiffs, assetDiffsGBP, categoryAssetDiffs };
    }, [historicalSnapshots, totalNetWorthBRL, totalFixedIncomeBRL, totalEquityBRL, totalRealEstateBRL, totalCryptoBRL, totalPensionBRL, totalDebtBRL, rates, forecastSettings]);

    // ═══════════ TRANSACTION HANDLERS ═══════════
    const handleSaveTransaction = useCallback(async (formData: any) => {
        try {
            await saveTransactionMutation.mutateAsync(formData);
            // Mutation onSuccess auto-invalidates related queries
            fetchMarketData();
            setIsFormOpen(false);
            setEditingTransaction(null);
        } catch (error) {
            console.error('Failed to save transaction:', error);
        }
    }, [saveTransactionMutation, fetchMarketData]);

    const handleEditTransaction = useCallback((transaction: any) => {
        setEditingTransaction(transaction);
        setIsFormOpen(true);
    }, []);

    const handleDeleteClick = useCallback((id: string | number) => {
        setTransactionToDelete(id);
        setIsDeleteModalOpen(true);
    }, []);

    const handleConfirmDelete = useCallback(async () => {
        if (!transactionToDelete) return;
        try {
            await deleteTransactionMutation.mutateAsync(transactionToDelete as any);
            // Mutation onSuccess auto-invalidates related queries
            fetchMarketData();
            setIsDeleteModalOpen(false);
            setTransactionToDelete(null);
        } catch (error) {
            console.error('Failed to delete transaction:', error);
        }
    }, [transactionToDelete, deleteTransactionMutation, fetchMarketData]);

    const handleRecordSnapshot = useCallback(async (explicitSnapshot: any = null, options: { silent?: boolean } = { silent: false }) => {
        try {
            const currentMonth = new Date().toISOString().slice(0, 7);

            const snapshot = explicitSnapshot ? {
                ...explicitSnapshot,
                // Ensure required fields for backend validation are present
                totalminuspensionsBRL: explicitSnapshot.totalminuspensionsBRL || (explicitSnapshot.networthBRL - (explicitSnapshot.categories?.Pensions || 0)),
                recordedAt: explicitSnapshot.recordedAt || new Date().toISOString()
            } : {
                month: currentMonth,
                networthBRL: totalNetWorthBRL,
                networthGBP: totalNetWorthBRL / rates.BRL,
                totalminuspensionsBRL: totalNetWorthBRL - totalPensionBRL,
                totalminuspensionsGBP: (totalNetWorthBRL - totalPensionBRL) / rates.BRL,
                totalminuspensionsUSD: ((totalNetWorthBRL - totalPensionBRL) / rates.BRL) * rates.USD,
                categories: {
                    FixedIncome: totalFixedIncomeBRL,
                    Equity: totalEquityBRL,
                    RealEstate: totalRealEstateBRL,
                    Crypto: totalCryptoBRL,
                    Pensions: totalPensionBRL,
                    Debt: totalDebtBRL
                },
                recordedAt: new Date().toISOString()
            };

            const response = await fetch('/api/snapshots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(snapshot)
            });

            if (response.ok) {
                const savedSnapshot = await response.json();
                setHistoricalSnapshots(prev => {
                    const filtered = prev.filter(s => s.month !== savedSnapshot.month);
                    return [...filtered, savedSnapshot].sort((a, b) => a.month.localeCompare(b.month));
                });

                if (snapshot.income || snapshot.investment) {
                    try {
                        await fetch('/api/ledger-data', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                month: snapshot.month,
                                income: snapshot.income ? {
                                    salary: snapshot.income.salary || 0,
                                    fixedIncome: snapshot.income.fixedIncome || 0,
                                    equity: snapshot.income.equity || 0,
                                    realEstate: snapshot.income.realEstate || 0
                                } : undefined,
                                investments: snapshot.investment ? {
                                    equity: snapshot.investment.equity || 0,
                                    fixedIncome: snapshot.investment.fixedIncome || 0,
                                    realEstate: snapshot.investment.realEstate || 0,
                                    pensions: snapshot.investment.pensions || 0,
                                    crypto: snapshot.investment.crypto || 0,
                                    debt: snapshot.investment.debt || 0
                                } : undefined
                            })
                        });
                    } catch (ledgerErr) {
                        console.error('Failed to persist ledger data:', ledgerErr);
                    }
                }

                refreshAllData();

                if (!options.silent) {
                    setStatusModal({
                        isOpen: true,
                        title: 'Success!',
                        message: `Snapshot for ${snapshot.month} recorded successfully!`,
                        type: 'success'
                    });
                }
            } else {
                setStatusModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to record snapshot.',
                    type: 'error'
                });
            }
        } catch (error) {
            console.error('Error recording snapshot:', error);
            setStatusModal({
                isOpen: true,
                title: 'Error',
                message: 'Error recording snapshot.',
                type: 'error'
            });
        }
    }, [totalNetWorthBRL, totalPensionBRL, totalFixedIncomeBRL, totalEquityBRL, totalRealEstateBRL, totalCryptoBRL, totalDebtBRL, rates, refreshAllData]);



    // ═══════════ AUTO MONTHLY CLOSE TRIGGER ═══════════
    useEffect(() => {
        if (!appSettings.autoMonthlyCloseEnabled || isInitialLoading) return;

        const today = new Date();
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

        // To ensure the user gets prompted if they miss the exact final day, we check 
        // the last 2 days of a month and the first 5 days of the next month.
        let targetMonthStr = null;

        if (today.getDate() >= lastDayOfMonth - 1) {
            // End of current month
            targetMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        } else if (today.getDate() <= 5) {
            // Start of new month, check if previous month was recorded
            const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            targetMonthStr = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
        }

        if (targetMonthStr) {
            const hasSnapshot = historicalSnapshots.some(s => s.month === targetMonthStr);
            if (!hasSnapshot) {
                console.log(`[Auto-Close] Prompting monthly close because ${targetMonthStr} is missing...`);
                setIsMonthlyCloseModalOpen(true);
            }
        }
    }, [appSettings.autoMonthlyCloseEnabled, isInitialLoading, historicalSnapshots]); // Removed handleRecordSnapshot as we just open the modal

    // ═══════════ BACKGROUND SYNC ═══════════
    useEffect(() => {
        const bg = appSettings?.backgroundSelection || 'vinyl-voyage';
        document.body.setAttribute('data-bg', bg);
    }, [appSettings?.backgroundSelection]);

    // ═══════════ CONTEXT VALUE ═══════════
    const value = useMemo(() => ({
        // Raw data
        transactions, equityTransactions, cryptoTransactions, pensionTransactions, debtTransactions,
        fixedIncomeTransactions, realEstate, historicalSnapshots, marketData, pensionPrices,
        rates, loadingRates, lastUpdated, isInitialLoading, isRefreshingMarketData, marketDataCacheInfo,
        ledgerData, fxHistory, forecastSettings, allocationTargets, sortedTransactions, assetClasses, setAssetClasses,

        // Summaries
        fixedIncomeData, equityData, cryptoData, pensionData, realEstateData, debtData,
        totalFixedIncomeBRL, totalEquityBRL, totalCryptoBRL, totalPensionBRL, totalRealEstateBRL, totalDebtBRL,
        totalNetWorthBRL, dashboardData, masterMixData, monthlyInvestments,
        dashboardConfig, setDashboardConfig,

        // Diffs
        ...diffs,

        // Actions
        refreshAllData, fetchRealEstate, fetchMarketData, forceRefreshMarketData,
        handleSaveTransaction, handleEditTransaction, handleDeleteClick, handleConfirmDelete, handleRecordSnapshot,
        setForecastSettings, appSettings, handleUpdateAppSettings,

        // FTUE
        ftueState, setFtueState,
        updateFtueProgress,
        resetFtue: () => useFTUEStore.getState().resetFtue(refreshAllData),

        // UI state
        isFormOpen, setIsFormOpen,
        editingTransaction, setEditingTransaction,
        isDeleteModalOpen, setIsDeleteModalOpen,
        transactionToDelete,
        isInspectorOpen, setIsInspectorOpen,
        inspectorMode, setInspectorMode,
        statusModal, setStatusModal,
        isMonthlyCloseModalOpen, setIsMonthlyCloseModalOpen,

        // Currency selection
        primaryCurrency, setPrimaryCurrency,
        secondaryCurrency, setSecondaryCurrency,
        rateFlipped, setRateFlipped,
        displayCurrencyOverrides, setDisplayCurrencyOverride,
        formatPrimary, formatSecondary, toPrimary, toSecondary,


    }), [
        transactions, equityTransactions, cryptoTransactions, pensionTransactions, debtTransactions,
        fixedIncomeTransactions, realEstate, historicalSnapshots, marketData, pensionPrices,
        rates, loadingRates, lastUpdated, isInitialLoading, isRefreshingMarketData, marketDataCacheInfo,
        ledgerData, fxHistory, forecastSettings, allocationTargets, sortedTransactions, assetClasses,
        fixedIncomeData, equityData, cryptoData, pensionData, realEstateData, debtData,
        totalFixedIncomeBRL, totalEquityBRL, totalCryptoBRL, totalPensionBRL, totalRealEstateBRL, totalDebtBRL,
        totalNetWorthBRL, dashboardData, masterMixData, monthlyInvestments, dashboardConfig,
        diffs,
        refreshAllData, fetchRealEstate, fetchMarketData, forceRefreshMarketData,
        handleSaveTransaction, handleEditTransaction, handleDeleteClick, handleConfirmDelete, handleRecordSnapshot,
        isFormOpen, editingTransaction, isDeleteModalOpen, transactionToDelete,
        isInspectorOpen, inspectorMode, statusModal, isMonthlyCloseModalOpen,
        setIsFormOpen, setEditingTransaction, setIsDeleteModalOpen, setIsInspectorOpen, setInspectorMode, setStatusModal, setIsMonthlyCloseModalOpen,
        primaryCurrency, secondaryCurrency, rateFlipped, displayCurrencyOverrides, formatPrimary, formatSecondary, toPrimary, toSecondary,
        setPrimaryCurrency, setSecondaryCurrency, setRateFlipped, setDisplayCurrencyOverride,
        ftueState, updateFtueProgress,
        appSettings, handleUpdateAppSettings
    ]);

    return (
        <PortfolioContext.Provider value={value as PortfolioContextValue}>
            {children}
        </PortfolioContext.Provider>
    );
}

export { PortfolioContext };

export function usePortfolio(): PortfolioContextValue {
    const context = useContext(PortfolioContext);
    if (!context) {
        throw new Error('usePortfolio must be used within a PortfolioProvider');
    }
    return context;
}
