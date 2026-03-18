import { useState, useMemo, useEffect, useCallback } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import { calculateTWRHistory } from '@/lib/roiUtils';
import type { DashboardTabProps } from './types';

export default function useDashboard(props: DashboardTabProps) {
    const {
        data, rates, historicalSnapshots, monthlyInvestments,
        diffPrevMonth, diffPrevMonthGBP, fxEffectBRL, assetEffectBRL,
        fxEffectGBP, assetEffectGBP, diffTarget, diffTargetGBP,
        assetDiffs, assetDiffsGBP, categoryAssetDiffs, isLoading,
        masterMixData, allocationTargets, onNavigate
    } = props;

    const {
        primaryCurrency, secondaryCurrency, toPrimary, toSecondary, formatPrimary, formatSecondary,
        forceRefreshMarketData, isRefreshingMarketData, lastUpdated,
        appSettings, handleUpdateAppSettings, dashboardConfig, setDashboardConfig, forecastSettings,
        ftueState
    } = usePortfolio() as any;

    const formatPrimaryNoDecimals = useCallback((val: number) => formatPrimary(val, { minimumFractionDigits: 0, maximumFractionDigits: 0 }), [formatPrimary]);
    const formatSecondaryNoDecimals = useCallback((val: number) => formatSecondary(val, { minimumFractionDigits: 0, maximumFractionDigits: 0 }), [formatSecondary]);

    const [isCustomizing, setIsCustomizing] = useState(false);
    const [heroExpanded, setHeroExpanded] = useState(false);
    const primaryMeta = (SUPPORTED_CURRENCIES as any)[primaryCurrency];
    const secondaryMeta = (SUPPORTED_CURRENCIES as any)[secondaryCurrency];

    // Tick every 30s so the "X min ago" label stays live
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 30000);
        return () => clearInterval(id);
    }, []);

    const lastUpdatedLabel = useMemo(() => {
        if (!lastUpdated) return null;
        const mins = Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 60000);
        if (mins < 1) return 'just now';
        if (mins === 1) return '1m ago';
        return `${mins}m ago`;
    }, [lastUpdated, tick]);

    // Calculate current ROI for the Hero badge
    const currentROI = useMemo(() => {
        if (!historicalSnapshots || !monthlyInvestments || !data?.netWorth) return { percentage: 0, absolute: 0, formattedAbsolute: '0' };

        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const liveSnapshot = {
            month: currentMonth,
            networthBRL: data.netWorth.amount,
            impliedRate: rates.BRL
        };

        const snapshotsForTWR = [
            ...historicalSnapshots.map((d: any) => ({
                ...d,
                networthBRL: d.networthBRL || d.totalminuspensionsBRL || 0,
                networthGBP: d.networthGBP || d.totalminuspensionsGBP || (d.networthBRL / rates.BRL)
            })),
            liveSnapshot
        ];

        const twrHistoryMap = calculateTWRHistory(snapshotsForTWR, monthlyInvestments || [], rates);

        const totalInvested = Object.values(monthlyInvestments || []).reduce((sum: number, inv: any) => {
            const total = inv.total !== undefined ? inv.total : (
                (inv.equity || 0) + (inv.fixedIncome || 0) + (inv.realEstate || 0) +
                (inv.pensions || 0) + (inv.crypto || 0) + (inv.debt || 0)
            );
            return sum + total;
        }, 0);

        const initialValue = historicalSnapshots.length > 0 ? (historicalSnapshots[0].networthBRL || historicalSnapshots[0].totalminuspensionsBRL || 0) : 0;
        const absoluteReturn = data.netWorth.amount - (totalInvested + initialValue);

        const absVal = Math.abs(absoluteReturn);
        let formattedAbsolute = '';
        if (absVal >= 1000000) {
            formattedAbsolute = `${(absVal / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}M`;
        } else {
            formattedAbsolute = `${(absVal / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}k`;
        }

        return {
            percentage: (twrHistoryMap as any)[currentMonth] || 0,
            absolute: absoluteReturn,
            formattedAbsolute
        };
    }, [historicalSnapshots, monthlyInvestments, data, rates]);

    // Top Contributors (Primary)
    const topContributors = useMemo(() => {
        if (!assetDiffs) return [];
        return Object.entries(assetDiffs)
            .map(([id, diff]: [string, any]) => ({
                id, name: data.summaries.find((s: any) => s.id === id)?.title || id,
                amount: diff.amount, percentage: diff.percentage
            }))
            .filter(c => Math.abs(c.amount) > 100)
            .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
            .slice(0, 3);
    }, [assetDiffs, data.summaries]);

    // Top Contributors (Secondary)
    const topContributorsSecondary = useMemo(() => {
        if (!assetDiffsGBP) return [];
        return Object.entries(assetDiffsGBP)
            .map(([id, diff]: [string, any]) => ({
                id, name: data.summaries.find((s: any) => s.id === id)?.title || id,
                amount: diff.amount, percentage: diff.percentage
            }))
            .filter(c => Math.abs(c.amount) > 10)
            .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
            .slice(0, 3);
    }, [assetDiffsGBP, data.summaries]);

    const expandedSummaries = useMemo(() => {
        return [...data.summaries].sort((a: any, b: any) => Math.abs(b.amount) - Math.abs(a.amount));
    }, [data.summaries]);

    return {
        // Portfolio context
        primaryCurrency, secondaryCurrency, toPrimary, toSecondary, formatPrimary, formatSecondary,
        forceRefreshMarketData, isRefreshingMarketData,
        dashboardConfig, setDashboardConfig, forecastSettings, ftueState,
        primaryMeta, secondaryMeta,

        // Local state
        isCustomizing, setIsCustomizing,
        heroExpanded, setHeroExpanded,
        lastUpdatedLabel,

        // Derived
        currentROI,
        topContributors, topContributorsSecondary,
        expandedSummaries,
        formatPrimaryNoDecimals, formatSecondaryNoDecimals,
    };
}
