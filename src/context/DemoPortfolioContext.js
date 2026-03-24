"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { formatCurrency, convertCurrency } from '@/lib/currency';
import demoData from '@/lib/demoData';
import {
    getFixedIncomeSummary,
    getEquitySummary,
    getCryptoSummary,
    getPensionSummary,
    getRealEstateSummary,
    getDebtSummary,
    getMasterMixData
} from "@/lib/portfolioUtils";
import { normalizeTransactions, calculateMonthlyInvestments } from '@/lib/ledgerUtils';
import pensionMap from '@/data/pension_fund_map.json';
import { PortfolioContext } from '@/context/PortfolioContext';
import usePortfolioStore from '@/stores/usePortfolioStore';
import useMarketStore from '@/stores/useMarketStore';
import { setQueriesEnabled } from '@/hooks/useQueries';

export function DemoPortfolioProvider({ children, onSignUpPrompt }) {
    // ═══════════ DISABLE TANSTACK QUERY IN DEMO MODE ═══════════
    useEffect(() => {
        setQueriesEnabled(false);
        return () => setQueriesEnabled(true);
    }, []);

    // ═══════════ SEED ZUSTAND STORES WITH DEMO DATA ═══════════
    useEffect(() => {
        usePortfolioStore.getState().setAllData({
            transactions: demoData.transactions || [],
            equityTransactions: demoData.equityTransactions || [],
            cryptoTransactions: demoData.cryptoTransactions || [],
            pensionTransactions: demoData.pensionTransactions || [],
            debtTransactions: demoData.debtTransactions || [],
            realEstate: demoData.realEstate || null,
            fixedIncomeTransactions: demoData.fixedIncomeTransactions || [],
            historicalSnapshots: demoData.historicalSnapshots || [],
            ledgerData: demoData.ledgerData || '',
            isInitialLoading: false,
            lastUpdated: new Date(),
        });

        useMarketStore.getState().setMarketData(demoData.marketData || {});
        if (demoData.pensionPrices) {
            useMarketStore.getState().setPensionPrices(demoData.pensionPrices);
        }

        return () => {
            // Clean up on unmount
            usePortfolioStore.getState().setAllData({
                transactions: [],
                equityTransactions: [],
                cryptoTransactions: [],
                pensionTransactions: [],
                debtTransactions: [],
                realEstate: null,
                fixedIncomeTransactions: [],
                historicalSnapshots: [],
                ledgerData: '',
                isInitialLoading: true,
                lastUpdated: null,
            });
            useMarketStore.getState().setMarketData({});
            useMarketStore.getState().setPensionPrices({});
        };
    }, []);
    // ═══════════ STATIC DEMO DATA ═══════════
    const [transactions] = useState(demoData.transactions);
    const [equityTransactions] = useState(demoData.equityTransactions);
    const [cryptoTransactions] = useState(demoData.cryptoTransactions);
    const [pensionTransactions] = useState(demoData.pensionTransactions);
    const [debtTransactions] = useState(demoData.debtTransactions);
    const [fixedIncomeTransactions] = useState(demoData.fixedIncomeTransactions);
    const [realEstate] = useState(demoData.realEstate);
    const [historicalSnapshots] = useState(demoData.historicalSnapshots);
    const [marketData] = useState(demoData.marketData);
    const [pensionPrices] = useState(demoData.pensionPrices);
    const [rates] = useState(demoData.rates);
    const [ledgerData] = useState(demoData.ledgerData);
    const [fxHistory] = useState(demoData.fxHistory);
    const [forecastSettings, setForecastSettings] = useState(demoData.forecastSettings);
    const [allocationTargets] = useState(demoData.allocationTargets);
    const [assetClasses, setAssetClasses] = useState(demoData.assetClasses);
    const [appSettings] = useState(demoData.appSettings || {});
    const [dashboardConfig, setDashboardConfig] = useState(demoData.dashboardConfig);

    // ═══════════ UI STATE ═══════════
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState(null);
    const [isInspectorOpen, setIsInspectorOpen] = useState(false);
    const [inspectorMode, setInspectorMode] = useState('settings');
    const [statusModal, setStatusModal] = useState({ isOpen: false, title: '', message: '', type: 'success' });
    const [isMonthlyCloseModalOpen, setIsMonthlyCloseModalOpen] = useState(false);

    // ═══════════ CURRENCY ═══════════
    const getStoredOnboarding = () => {
        if (typeof window === 'undefined') return {};
        try { return JSON.parse(sessionStorage.getItem('ff_onboarding') || '{}'); }
        catch { return {}; }
    };

    const stored = getStoredOnboarding();
    const [primaryCurrency, setPrimaryCurrency] = useState(stored.primaryCurrency || 'BRL');
    const [secondaryCurrency, setSecondaryCurrency] = useState(stored.secondaryCurrency || 'GBP');
    const [rateFlipped, setRateFlipped] = useState(false);
    const [displayCurrencyOverrides, setDisplayCurrencyOverrideState] = useState({});

    const setDisplayCurrencyOverride = useCallback((category, value) => {
        setDisplayCurrencyOverrideState(prev => ({ ...prev, [category]: value }));
    }, []);

    const formatPrimary = useCallback((amount, options = {}) =>
        formatCurrency(amount, primaryCurrency, options), [primaryCurrency]);
    const formatSecondary = useCallback((amount, options = {}) =>
        formatCurrency(amount, secondaryCurrency, options), [secondaryCurrency]);
    const toPrimary = useCallback((amount, fromCurrency = 'GBP') =>
        convertCurrency(amount, fromCurrency, primaryCurrency, rates), [primaryCurrency, rates]);
    const toSecondary = useCallback((amount, fromCurrency = 'GBP') =>
        convertCurrency(amount, fromCurrency, secondaryCurrency, rates), [secondaryCurrency, rates]);

    // ═══════════ FTUE STATE (demo mode) ═══════════
    const [ftueState] = useState({
        wizardCompleted: true,
        usingDemoData: true,
        isTutorialActive: false,
        showCurrencyPicker: false,
        onboardingGoal: stored.goal || 'both',
        onboardingExperience: stored.experienceLevel || 'beginner',
        showFirstVisitGreeting: false,
        checklistItems: {},
        checklistDismissed: true,
        sidebarDismissed: true,
        pageTutorials: {},
    });

    // ═══════════ INTERCEPTED WRITE OPERATIONS ═══════════
    const promptSignUp = useCallback((action) => {
        if (onSignUpPrompt) onSignUpPrompt(action);
    }, [onSignUpPrompt]);

    const handleSaveTransaction = useCallback(() => promptSignUp('save'), [promptSignUp]);
    const handleEditTransaction = useCallback(() => promptSignUp('edit'), [promptSignUp]);
    const handleDeleteClick = useCallback(() => promptSignUp('delete'), [promptSignUp]);
    const handleConfirmDelete = useCallback(() => {}, []);
    const handleRecordSnapshot = useCallback(() => promptSignUp('snapshot'), [promptSignUp]);
    const refreshAllData = useCallback(async () => {}, []);
    const fetchRealEstate = useCallback(async () => {}, []);
    const fetchMarketData = useCallback(async () => {}, []);
    const forceRefreshMarketData = useCallback(async () => {}, []);
    const handleUpdateAppSettings = useCallback(() => promptSignUp('settings'), [promptSignUp]);
    const updateFtueProgress = useCallback(async () => ftueState, [ftueState]);

    // ═══════════ MEMOIZED SUMMARIES ═══════════
    const fixedIncomeData = useMemo(() =>
        getFixedIncomeSummary(fixedIncomeTransactions, rates, null, assetClasses),
        [fixedIncomeTransactions, rates, assetClasses]);
    const equityData = useMemo(() =>
        getEquitySummary(equityTransactions, marketData, rates, null, assetClasses),
        [equityTransactions, marketData, rates, assetClasses]);
    const cryptoData = useMemo(() =>
        getCryptoSummary(cryptoTransactions, marketData, rates, null, assetClasses),
        [cryptoTransactions, marketData, rates, assetClasses]);
    const pensionData = useMemo(() =>
        getPensionSummary(pensionTransactions, rates, pensionPrices, marketData, null, assetClasses),
        [pensionTransactions, rates, pensionPrices, marketData, assetClasses]);
    const realEstateData = useMemo(() =>
        getRealEstateSummary(realEstate || {}, marketData, rates, null, assetClasses),
        [realEstate, marketData, rates, assetClasses]);
    const debtData = useMemo(() =>
        getDebtSummary(debtTransactions, rates, null, assetClasses),
        [debtTransactions, rates, assetClasses]);

    const totalFixedIncomeBRL = fixedIncomeData.total.brl;
    const totalEquityBRL = equityData.total.brl;
    const totalCryptoBRL = cryptoData.total.brl;
    const totalPensionBRL = pensionData.total.brl;
    const totalRealEstateBRL = realEstateData.total.brl;
    const totalDebtBRL = debtData.total.brl;
    const totalNetWorthBRL = totalFixedIncomeBRL + totalEquityBRL + totalCryptoBRL
        + totalPensionBRL + totalRealEstateBRL - totalDebtBRL;

    const sortedTransactions = useMemo(() =>
        [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)),
        [transactions]);

    const monthlyInvestments = useMemo(() => {
        if (!ledgerData || !ledgerData.investments) return [];
        const allLive = normalizeTransactions({
            equity: equityTransactions, crypto: cryptoTransactions,
            pensions: pensionTransactions, debt: debtTransactions,
            fixedIncome: transactions, realEstate
        }, rates, fxHistory);
        return calculateMonthlyInvestments(allLive, ledgerData.investments);
    }, [equityTransactions, cryptoTransactions, pensionTransactions,
        debtTransactions, transactions, realEstate, ledgerData, rates, fxHistory]);

    const masterMixData = useMemo(() =>
        getMasterMixData(fixedIncomeTransactions, realEstate, equityTransactions,
            cryptoTransactions, pensionTransactions, rates, pensionMap,
            marketData, pensionPrices, undefined, assetClasses),
        [fixedIncomeTransactions, realEstate, equityTransactions,
            cryptoTransactions, pensionTransactions, rates, marketData,
            pensionPrices, assetClasses]);

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
    }), [totalNetWorthBRL, totalFixedIncomeBRL, totalEquityBRL, totalRealEstateBRL,
        totalCryptoBRL, totalPensionBRL, totalDebtBRL, fixedIncomeData, equityData,
        cryptoData, realEstateData, pensionData, debtData, sortedTransactions]);

    // ═══════════ DIFFS (computed from historical snapshots) ═══════════
    const diffs = useMemo(() => {
        const snaps = historicalSnapshots || [];
        if (snaps.length < 2) {
            return {
                diffPrevMonth: { amount: 0, percentage: 0 },
                diffPrevMonthGBP: { amount: 0, percentage: 0 },
                fxEffectBRL: { amount: 0, percentage: 0 },
                assetEffectBRL: { amount: 0, percentage: 0 },
                fxEffectGBP: { amount: 0, percentage: 0 },
                assetEffectGBP: { amount: 0, percentage: 0 },
                diffTarget: { amount: 0, percentage: 0 },
                diffTargetGBP: { amount: 0, percentage: 0 },
                assetDiffs: {},
                assetDiffsGBP: {},
                categoryAssetDiffs: {},
            };
        }

        const current = snaps[snaps.length - 1];
        const previous = snaps[snaps.length - 2];

        // MoM diff
        const momBRL = current.networthBRL - previous.networthBRL;
        const momPctBRL = previous.networthBRL !== 0 ? (momBRL / previous.networthBRL) * 100 : 0;
        const momGBP = current.networthGBP - previous.networthGBP;
        const momPctGBP = previous.networthGBP !== 0 ? (momGBP / previous.networthGBP) * 100 : 0;

        // FX effect: how much of the BRL change is due to FX movement
        const curFx = current.impliedRate || 7.10;
        const prevFx = previous.impliedRate || 7.10;
        const prevGBP = previous.networthGBP || 0;
        const fxEffect = Math.round(prevGBP * (curFx - prevFx));
        const fxPct = previous.networthBRL !== 0 ? (fxEffect / previous.networthBRL) * 100 : 0;

        // Asset effect: total change minus FX effect
        const assetEffect = momBRL - fxEffect;
        const assetPct = previous.networthBRL !== 0 ? (assetEffect / previous.networthBRL) * 100 : 0;

        // FX/Asset in GBP
        const fxEffectGBPAmt = 0; // FX effect in GBP terms is always 0 (it IS the GBP currency)
        const assetEffectGBPAmt = momGBP;
        const assetPctGBP = previous.networthGBP !== 0 ? (assetEffectGBPAmt / previous.networthGBP) * 100 : 0;

        // Target diff: compare current allocation vs targets
        const cats = current.categories || {};
        const grossAssets = (cats.Equity || 0) + (cats.FixedIncome || 0) + (cats.RealEstate || 0)
            + (cats.Crypto || 0) + (cats.Pensions || 0);
        const targetTotal = Object.values(allocationTargets || {}).reduce((s, v) => s + v, 0);

        let targetDiffBRL = 0;
        const assetDiffsObj = {};
        const assetDiffsGBPObj = {};
        const categoryAssetDiffsObj = {};

        const catMap = { Equity: 'equity', FixedIncome: 'fixed-income', RealEstate: 'real-estate', Crypto: 'crypto', Pensions: 'pensions' };
        const targetMap = { Equity: 'Equity', FixedIncome: 'Fixed Income', RealEstate: 'Real Estate', Crypto: 'Crypto', Pensions: 'Pensions' };

        for (const [catKey, tabId] of Object.entries(catMap)) {
            const actual = cats[catKey] || 0;
            const actualPct = grossAssets > 0 ? (actual / grossAssets) * 100 : 0;
            const targetPct = allocationTargets?.[targetMap[catKey]] || 0;
            const idealBRL = grossAssets * (targetPct / 100);
            const diff = actual - idealBRL;
            const diffPct = targetPct > 0 ? ((actualPct - targetPct) / targetPct) * 100 : 0;
            targetDiffBRL += Math.abs(diff);

            assetDiffsObj[tabId] = { amount: Math.round(diff), percentage: Math.round(diffPct * 10) / 10 };
            const diffGBP = Math.round(diff / curFx);
            assetDiffsGBPObj[tabId] = { amount: diffGBP, percentage: Math.round(diffPct * 10) / 10 };

            // Per-category MoM
            const prevCatVal = previous.categories?.[catKey] || 0;
            const curCatVal = actual;
            const catMoM = curCatVal - prevCatVal;
            const catMoMPct = prevCatVal !== 0 ? (catMoM / prevCatVal) * 100 : 0;
            categoryAssetDiffsObj[tabId] = { amount: Math.round(catMoM), percentage: Math.round(catMoMPct * 10) / 10 };
        }

        // Overall target diff — how far from perfectly balanced (positive = overweight net)
        const targetDiffPct = grossAssets > 0 && targetTotal > 0 ? (targetDiffBRL / grossAssets) * 100 : 0;

        return {
            diffPrevMonth: { amount: Math.round(momBRL), percentage: Math.round(momPctBRL * 10) / 10 },
            diffPrevMonthGBP: { amount: Math.round(momGBP), percentage: Math.round(momPctGBP * 10) / 10 },
            fxEffectBRL: { amount: Math.round(fxEffect), percentage: Math.round(fxPct * 10) / 10 },
            assetEffectBRL: { amount: Math.round(assetEffect), percentage: Math.round(assetPct * 10) / 10 },
            fxEffectGBP: { amount: fxEffectGBPAmt, percentage: 0 },
            assetEffectGBP: { amount: Math.round(assetEffectGBPAmt), percentage: Math.round(assetPctGBP * 10) / 10 },
            diffTarget: { amount: Math.round(targetDiffBRL), percentage: Math.round(targetDiffPct * 10) / 10 },
            diffTargetGBP: { amount: Math.round(targetDiffBRL / curFx), percentage: Math.round(targetDiffPct * 10) / 10 },
            assetDiffs: assetDiffsObj,
            assetDiffsGBP: assetDiffsGBPObj,
            categoryAssetDiffs: categoryAssetDiffsObj,
        };
    }, [historicalSnapshots, allocationTargets]);

    // ═══════════ CONTEXT VALUE ═══════════
    const value = useMemo(() => ({
        transactions, equityTransactions, cryptoTransactions, pensionTransactions,
        debtTransactions, fixedIncomeTransactions, realEstate, historicalSnapshots,
        marketData, pensionPrices, rates, loadingRates: false, lastUpdated: new Date(),
        isInitialLoading: false, isRefreshingMarketData: false, marketDataCacheInfo: null,
        ledgerData, fxHistory, forecastSettings, allocationTargets, sortedTransactions,
        assetClasses, setAssetClasses, fixedIncomeData, equityData, cryptoData,
        pensionData, realEstateData, debtData,
        totalFixedIncomeBRL, totalEquityBRL, totalCryptoBRL, totalPensionBRL,
        totalRealEstateBRL, totalDebtBRL, totalNetWorthBRL,
        dashboardData, masterMixData, monthlyInvestments,
        dashboardConfig, setDashboardConfig,
        ...diffs,
        refreshAllData, fetchRealEstate, fetchMarketData, forceRefreshMarketData,
        handleSaveTransaction, handleEditTransaction, handleDeleteClick,
        handleConfirmDelete, handleRecordSnapshot, setForecastSettings,
        appSettings, handleUpdateAppSettings,
        ftueState, setFtueState: () => {}, updateFtueProgress, resetFtue: () => {},
        isFormOpen, setIsFormOpen, editingTransaction, setEditingTransaction,
        isDeleteModalOpen, setIsDeleteModalOpen, transactionToDelete,
        isInspectorOpen, setIsInspectorOpen, inspectorMode, setInspectorMode,
        statusModal, setStatusModal, isMonthlyCloseModalOpen, setIsMonthlyCloseModalOpen,
        primaryCurrency, setPrimaryCurrency, secondaryCurrency, setSecondaryCurrency,
        rateFlipped, setRateFlipped, displayCurrencyOverrides, setDisplayCurrencyOverride,
        formatPrimary, formatSecondary, toPrimary, toSecondary,
        isDemoMode: true,
    }), [
        transactions, equityTransactions, cryptoTransactions, pensionTransactions,
        debtTransactions, fixedIncomeTransactions, realEstate, historicalSnapshots,
        marketData, pensionPrices, rates, ledgerData, fxHistory, forecastSettings,
        allocationTargets, sortedTransactions, assetClasses, fixedIncomeData,
        equityData, cryptoData, pensionData, realEstateData, debtData,
        totalFixedIncomeBRL, totalEquityBRL, totalCryptoBRL, totalPensionBRL,
        totalRealEstateBRL, totalDebtBRL, totalNetWorthBRL, dashboardData,
        masterMixData, monthlyInvestments, dashboardConfig, diffs, appSettings,
        isFormOpen, editingTransaction, isDeleteModalOpen, transactionToDelete,
        isInspectorOpen, inspectorMode, statusModal, isMonthlyCloseModalOpen,
        primaryCurrency, secondaryCurrency, rateFlipped, displayCurrencyOverrides,
        formatPrimary, formatSecondary, toPrimary, toSecondary,
        handleSaveTransaction, handleEditTransaction, handleDeleteClick,
        handleRecordSnapshot, handleUpdateAppSettings, updateFtueProgress,
        promptSignUp, ftueState, refreshAllData, fetchRealEstate, fetchMarketData,
        forceRefreshMarketData,
    ]);

    return (
        <PortfolioContext.Provider value={value}>
            {children}
        </PortfolioContext.Provider>
    );
}
