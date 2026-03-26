"use client";

import { useMemo } from "react";
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
import { calculateFV, getMonthDiff, parseDate as parseForecastDate, calculatePMT } from '@/lib/forecastUtils';
import actualsData from '@/data/forecast_actuals.json';
import pensionMap from '@/data/pension_fund_map.json';

/* ─── Diff helper type ─── */
interface DiffPair {
    amount: number;
    percentage: number;
}

/* ─── Input params ─── */
export interface PortfolioSummaryParams {
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
    ledgerData: any;
    fxHistory: Record<string, Record<string, number>>;
    forecastSettings: any;
    allocationTargets: any;
    assetClasses: Record<string, any>;
}

/* ─── Returned summaries ─── */
export interface PortfolioSummaryResult {
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
    sortedTransactions: any[];
    diffs: {
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
    };
}

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

/**
 * Pure computation hook: accepts raw portfolio data and returns computed summaries,
 * dashboard data, diffs, and monthly investments. Shared by PortfolioContext and
 * DemoPortfolioContext to eliminate duplication.
 */
export function usePortfolioSummaries(params: PortfolioSummaryParams): PortfolioSummaryResult {
    const {
        transactions, equityTransactions, cryptoTransactions, pensionTransactions,
        debtTransactions, fixedIncomeTransactions, realEstate, historicalSnapshots,
        marketData, pensionPrices, rates, ledgerData, fxHistory,
        forecastSettings, assetClasses,
    } = params;

    // ═══════════ ASSET SUMMARIES ═══════════
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

    // ═══════════ SORTED TRANSACTIONS ═══════════
    const sortedTransactions = useMemo(() =>
        [...transactions].sort((a: any, b: any) => parseDate(b.date).getTime() - parseDate(a.date).getTime()),
        [transactions]
    );

    // ═══════════ MONTHLY INVESTMENTS ═══════════
    const monthlyInvestments = useMemo(() => {
        if (!ledgerData || !ledgerData.investments) return [];

        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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

    // ═══════════ MASTER MIX ═══════════
    const masterMixData = useMemo(() => {
        return getMasterMixData(
            fixedIncomeTransactions, realEstate, equityTransactions,
            cryptoTransactions, pensionTransactions, rates, pensionMap,
            marketData, pensionPrices, undefined, assetClasses
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

                    const fxAmountBRL = prevNetWorthGBP * (rates.BRL - impliedPrevRate);
                    fxEffectBRL.amount = fxAmountBRL;
                    fxEffectBRL.percentage = prevNetWorth > 0 ? (fxAmountBRL / prevNetWorth) * 100 : 0;
                    assetEffectBRL.amount = diffPrevMonth.amount - fxAmountBRL;
                    assetEffectBRL.percentage = prevNetWorth > 0 ? (assetEffectBRL.amount / prevNetWorth) * 100 : 0;

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
                    const currentAssets: any[] = [];
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
        const firstActual = (actualsData as any[])[0];
        const goal2031 = (forecastSettings as any)?.yearlyGoals?.[2031] || (forecastSettings as any)?.yearlyGoals?.['2031'];

        if (firstActual && goal2031 > 0) {
            const startValue = firstActual.actualBRL || 0;
            const anchorDate = parseForecastDate(firstActual.date);
            const monthlyRate = ((forecastSettings as any).annualInterestRate || 10) / 100 / 12;

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
    }, [historicalSnapshots, totalNetWorthBRL, totalFixedIncomeBRL, totalEquityBRL, totalRealEstateBRL, totalCryptoBRL, totalPensionBRL, totalDebtBRL, rates, forecastSettings,
        fixedIncomeData, equityData, cryptoData, realEstateData, pensionData, debtData]);

    return {
        fixedIncomeData, equityData, cryptoData, pensionData, realEstateData, debtData,
        totalFixedIncomeBRL, totalEquityBRL, totalCryptoBRL, totalPensionBRL, totalRealEstateBRL, totalDebtBRL,
        totalNetWorthBRL, dashboardData, masterMixData, monthlyInvestments, sortedTransactions,
        diffs,
    };
}
