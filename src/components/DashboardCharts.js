import React, { useMemo } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import { calculateTWRHistory } from '@/lib/roiUtils';
import {
    ResponsiveContainer,
    ComposedChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Area,
    BarChart,
    Bar,
    Legend,
    ReferenceLine,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    LabelList
} from 'recharts';
import actualsData from '@/data/forecast_actuals.json';
import { calculateFV, calculatePMT, parseDate, getMonthDiff } from '@/lib/forecastUtils';
import { Settings2 } from 'lucide-react';

const formatMonthYear = (val) => {
    if (!val) return '';
    const cleanVal = String(val).replace(' (Live)', '');
    if (/^\d{4}-\d{2}$/.test(cleanVal)) {
        const [year, month] = cleanVal.split('-');
        const date = new Date(year, parseInt(month) - 1, 1);
        return `${date.toLocaleString('en-US', { month: 'short' })}/${year.slice(2)}`;
    }
    if (/^[a-zA-Z]{3}\/\d{4}$/.test(cleanVal)) {
        const [month, year] = cleanVal.split('/');
        return `${month}/${year.slice(2)}`;
    }
    return cleanVal;
};

const CustomTooltip = ({ active, payload, label, primaryCurrency, secondaryCurrency, primaryMeta, secondaryMeta, formatPrimary, formatSecondary }) => {
    if (active && payload && payload.length) {
        const uniquePayload = payload.filter((v, i, a) => a.findIndex(t => (t.name === v.name)) === i);
        return (
            <div className="bg-[#1A0F2E] border border-[#D4AF37] rounded-lg p-3 shadow-xl shadow-black/30 backdrop-blur-md font-mono text-[#F5F5DC]">
                <p className="text-parchment mb-2 font-semibold text-sm">{typeof label === 'string' ? formatMonthYear(label) : label}</p>
                {uniquePayload.map((entry, index) => {
                    const isDebt = entry.dataKey === 'categories.Debt';
                    const actualValue = isDebt ? Math.abs(entry.payload.actuals?.Debt || 0) : (entry.payload.actuals?.[entry.dataKey.replace('categories.', '')] || entry.value);

                    let formattedValue = '';
                    if (entry.name.includes('ROI')) {
                        formattedValue = `${actualValue.toFixed(1)}%`;
                    } else if (entry.name.includes('Rate')) {
                        formattedValue = `${primaryMeta?.symbol || 'R$'} ${actualValue.toFixed(2)}`;
                    } else if (entry.name.includes(secondaryCurrency)) {
                        formattedValue = formatSecondary(actualValue);
                    } else if (entry.name.includes(primaryCurrency)) {
                        formattedValue = formatPrimary(actualValue);
                    } else if (entry.name.includes('Net Worth') || entry.name.includes('Total')) {
                        formattedValue = formatPrimary(actualValue);
                    } else {
                        formattedValue = formatPrimary(actualValue);
                    }

                    return (
                        <div key={index} className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                            <span className="text-parchment/70 text-xs">
                                {entry.name}: {formattedValue}
                            </span>
                        </div>
                    );
                })}
                {payload[0]?.payload?.networthPrimary && (
                    <>
                        <div className="h-px bg-record/20 my-2" />
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-record" />
                            <span className="text-parchment text-sm font-bold">
                                Total: {formatPrimary(payload[0].payload.networthPrimary)}
                            </span>
                        </div>
                    </>
                )}
            </div>
        );
    }
    return null;
};

export default function DashboardCharts({ historicalData, currentMonthData, rates, monthlyInvestments, masterMixData, allocationTargets, forecastSettings, dashboardConfig, onCustomizeClick, onNavigate }) {
    const { primaryCurrency, secondaryCurrency, toPrimary, toSecondary, formatPrimary, formatSecondary } = usePortfolio();
    const primaryMeta = SUPPORTED_CURRENCIES[primaryCurrency];
    const secondaryMeta = SUPPORTED_CURRENCIES[secondaryCurrency];

    // Combine historical snapshots with current month live data
    const data = [...historicalData];
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const liveNetWorthBRL = currentMonthData.netWorth.amount;
    const liveNetWorthGBP = liveNetWorthBRL / rates.BRL;

    const liveNetWorthPrimary = toPrimary(liveNetWorthBRL, 'BRL');
    const liveNetWorthSecondary = toSecondary(liveNetWorthBRL, 'BRL');

    // 1. Prepare snapshots for TWR (Historical + Live)
    const liveSnapshot = {
        month: currentMonth,
        networthBRL: liveNetWorthBRL,
        networthGBP: liveNetWorthGBP,
        impliedRate: (rates[primaryCurrency] || 1) / (rates[secondaryCurrency] || 1)
    };

    // 2. Calculate TWR History
    const snapshotsForTWR = [
        ...data.map(d => ({
            ...d,
            networthBRL: d.networthBRL || d.totalminuspensionsBRL || 0,
            networthGBP: d.networthGBP || d.totalminuspensionsGBP || (d.networthBRL / rates.BRL)
        })),
        liveSnapshot
    ];

    const twrHistoryMap = calculateTWRHistory(snapshotsForTWR, monthlyInvestments || [], rates);

    // Prepare Forecast Anchors for Target Curves
    const anchorMode = forecastSettings?.anchorMode || 'historical';
    const firstActualValueBrl = actualsData[0]?.actualBRL || 0;
    const firstDateObj = parseDate(actualsData[0]?.date);
    const lastDateObj = new Date(); // Using now as live anchor fallback

    const goal2031 = forecastSettings?.yearlyGoals?.[2031] || 10000000;
    const activeRate = (forecastSettings?.annualInterestRate || 10) / 100 / 12;

    const anchorValue = anchorMode === 'live' ? liveNetWorthBRL : firstActualValueBrl;
    const anchorDate = anchorMode === 'live' ? lastDateObj : firstDateObj;

    const targetDate = new Date(2031, 11, 1);
    const totalMonths = getMonthDiff(anchorDate, targetDate);

    // Reverse Calculate required PMT
    let requiredPMT = calculatePMT(goal2031, anchorValue, activeRate, totalMonths);
    if (isNaN(requiredPMT) || !isFinite(requiredPMT)) requiredPMT = 0;
    requiredPMT = Math.max(0, Math.round(requiredPMT / 50) * 50);

    const futureData = [];
    let nextDate = new Date(currentMonth + '-01');
    nextDate.setMonth(nextDate.getMonth() + 1);

    while (nextDate <= targetDate) {
        const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
        const yyyy = nextDate.getFullYear();
        futureData.push({
            month: `${yyyy}-${mm}`,
            networthBRL: null,
            networthPrimary: null,
            networthSecondary: null,
            roi: null,
            actuals: {},
            categories: {}
        });
        nextDate.setMonth(nextDate.getMonth() + 1);
    }

    const displayDataRaw = [
        ...data.filter(d => d.month !== currentMonth).map(d => {
            const nwBrl = d.networthBRL || d.totalminuspensionsBRL || 0;
            const nwGbp = d.networthGBP || d.totalminuspensionsGBP || (nwBrl / rates.BRL);

            // Use historical values for primary/secondary mapping if they are BRL or GBP
            const mapHistorical = (cur) => {
                if (cur === 'BRL') return nwBrl;
                if (cur === 'GBP') return nwGbp;
                return toPrimary(nwBrl, 'BRL'); // Fallback for other currencies
            };

            const nwPrimary = mapHistorical(primaryCurrency);
            const nwSecondary = mapHistorical(secondaryCurrency);

            return {
                ...d,
                impliedRate: (() => {
                    // Derive primary/secondary cross rate from historical BRL/GBP rate
                    const historicalBrlGbp = d.impliedRate || (d.totalminuspensionsGBP ? d.totalminuspensionsBRL / d.totalminuspensionsGBP : 0);
                    if (!historicalBrlGbp) return 0;
                    // Historical rate is BRL per 1 GBP. Convert to primary/secondary.
                    // Assume FX relationships between non-BRL/GBP currencies are roughly stable.
                    const currentBrlGbp = rates.BRL || 1;
                    const scaleFactor = historicalBrlGbp / currentBrlGbp;
                    return ((rates[primaryCurrency] || 1) / (rates[secondaryCurrency] || 1)) * scaleFactor;
                })(),
                networthBRL: nwBrl,
                networthPrimary: nwPrimary,
                networthSecondary: nwSecondary,
                actuals: {
                    RealEstate: toPrimary(d.categories?.RealEstate || 0, 'BRL'),
                    Equity: toPrimary(d.categories?.Equity || 0, 'BRL'),
                    FixedIncome: toPrimary(d.categories?.FixedIncome || 0, 'BRL'),
                    Crypto: toPrimary(d.categories?.Crypto || 0, 'BRL'),
                    Pensions: toPrimary(d.categories?.Pensions || 0, 'BRL'),
                    Debt: Math.abs(toPrimary(d.categories?.Debt || 0, 'BRL'))
                },
                categories: (() => {
                    const cats = d.categories || {};
                    const totalAssets = (cats.RealEstate || 0) + (cats.Equity || 0) + (cats.FixedIncome || 0) + (cats.Crypto || 0) + (cats.Pensions || 0);
                    const debt = Math.abs(cats.Debt || 0);
                    const netWorth = Math.max(0, totalAssets - debt);
                    const ratio = totalAssets > 0 ? netWorth / totalAssets : 1;

                    return {
                        RealEstate: toPrimary((cats.RealEstate || 0) * ratio, 'BRL'),
                        Equity: toPrimary((cats.Equity || 0) * ratio, 'BRL'),
                        FixedIncome: toPrimary((cats.FixedIncome || 0) * ratio, 'BRL'),
                        Crypto: toPrimary((cats.Crypto || 0) * ratio, 'BRL'),
                        Pensions: toPrimary((cats.Pensions || 0) * ratio, 'BRL'),
                        Debt: toPrimary(debt, 'BRL')
                    };
                })(),
                roi: twrHistoryMap[d.month] ?? d.roi
            };
        }),
        {
            month: currentMonth + ' (Live)',
            networthPrimary: liveNetWorthPrimary,
            networthSecondary: liveNetWorthSecondary,
            roi: twrHistoryMap[currentMonth],
            impliedRate: (rates[primaryCurrency] || 1) / (rates[secondaryCurrency] || 1),
            actuals: {
                FixedIncome: toPrimary(currentMonthData.summaries.find(s => s.id === 'fixed-income')?.amount || 0, 'BRL'),
                Equity: toPrimary(currentMonthData.summaries.find(s => s.id === 'equity')?.amount || 0, 'BRL'),
                RealEstate: toPrimary(currentMonthData.summaries.find(s => s.id === 'real-estate')?.amount || 0, 'BRL'),
                Crypto: toPrimary(currentMonthData.summaries.find(s => s.id === 'crypto')?.amount || 0, 'BRL'),
                Pensions: toPrimary(currentMonthData.summaries.find(s => s.id === 'pensions')?.amount || 0, 'BRL'),
                Debt: toPrimary(currentMonthData.summaries.find(s => s.id === 'debt')?.amount || 0, 'BRL')
            },
            categories: (() => {
                const fi = currentMonthData.summaries.find(s => s.id === 'fixed-income')?.amount || 0;
                const eq = currentMonthData.summaries.find(s => s.id === 'equity')?.amount || 0;
                const re = currentMonthData.summaries.find(s => s.id === 'real-estate')?.amount || 0;
                const cr = currentMonthData.summaries.find(s => s.id === 'crypto')?.amount || 0;
                const pe = currentMonthData.summaries.find(s => s.id === 'pensions')?.amount || 0;
                const de = currentMonthData.summaries.find(s => s.id === 'debt')?.amount || 0;

                const totalAssets = fi + eq + re + cr + pe;
                const netWorth = Math.max(0, totalAssets - de);
                const ratio = totalAssets > 0 ? netWorth / totalAssets : 1;

                return {
                    FixedIncome: toPrimary(fi * ratio, 'BRL'),
                    Equity: toPrimary(eq * ratio, 'BRL'),
                    RealEstate: toPrimary(re * ratio, 'BRL'),
                    Crypto: toPrimary(cr * ratio, 'BRL'),
                    Pensions: toPrimary(pe * ratio, 'BRL'),
                    Debt: toPrimary(de, 'BRL')
                };
            })()
        },
        ...futureData
    ].map(pt => {
        // Calculate Target Line for Wealth Trajectory
        const monthStr = pt.month.replace(' (Live)', '');
        const [y, m] = monthStr.split('-').map(Number);
        let pDate = new Date(y, m - 1, 1);

        if (anchorMode === 'live' && pDate < anchorDate && pt.month !== (currentMonth + ' (Live)')) {
            return { ...pt, targetPrimary: null, targetSecondary: null };
        }

        const monthsSinceStart = getMonthDiff(anchorDate, pDate);
        const targetVal = calculateFV(anchorValue, activeRate, monthsSinceStart, requiredPMT);
        return {
            ...pt,
            targetPrimary: toPrimary(targetVal || 0, 'BRL'),
            targetSecondary: toSecondary(targetVal || 0, 'BRL')
        };
    });

    const displayData = displayDataRaw.map((pt, i, arr) => {
        let actualGreen = null;
        let actualRed = null;

        if (pt.networthPrimary !== null) {
            const currentAbove = pt.networthPrimary >= pt.targetPrimary;
            const prevAbove = i > 0 && arr[i - 1].networthPrimary !== null ? arr[i - 1].networthPrimary >= arr[i - 1].targetPrimary : currentAbove;
            const nextAbove = i < arr.length - 1 && arr[i + 1].networthPrimary !== null ? arr[i + 1].networthPrimary >= arr[i + 1].targetPrimary : currentAbove;

            if (currentAbove) {
                actualGreen = pt.networthPrimary;
                if (!prevAbove || !nextAbove) actualRed = pt.networthPrimary;
            } else {
                actualRed = pt.networthPrimary;
                if (prevAbove || nextAbove) actualGreen = pt.networthPrimary;
            }
        }

        return {
            ...pt,
            actualGreen,
            actualRed
        };
    });

    const historicalDisplayData = displayData.filter(d => d.networthPrimary !== null);

    // Prepare Monthly Contributions Data
    const investmentsDataMap = new Map();
    if (monthlyInvestments) {
        monthlyInvestments.forEach(d => investmentsDataMap.set(d.month, d));
    }

    const investmentsData = [];
    // Start from earliest month with data (instead of hardcoded Feb 2021)
    const sortedMonths = monthlyInvestments ? [...monthlyInvestments].map(d => d.month).sort() : [];
    const firstMonth = sortedMonths.length > 0 ? sortedMonths[0] : currentMonth;
    let currentY = parseInt(firstMonth.split('-')[0]);
    let currentM = parseInt(firstMonth.split('-')[1]);

    const endY = parseInt(currentMonth.split('-')[0]);
    const endM = parseInt(currentMonth.split('-')[1]);

    while (currentY < endY || (currentY === endY && currentM <= endM)) {
        const mmStr = String(currentM).padStart(2, '0');
        const monthStr = `${currentY}-${mmStr}`;

        const d = investmentsDataMap.get(monthStr) || {};
        const netFlowRaw = d.total !== undefined ? d.total : ((d.equity || 0) + (d.fixedIncome || 0) + (d.realEstate || 0) + (d.crypto || 0) + (d.pensions || 0) + (d.debt || 0));

        investmentsData.push({
            month: monthStr,
            Net: netFlowRaw // Capital injection for the month
        });

        currentM++;
        if (currentM > 12) {
            currentM = 1;
            currentY++;
        }
    }

    const currencyTotals = { Primary: 0, Secondary: 0, Other: 0 };
    if (currentMonthData && currentMonthData.categories) {
        currentMonthData.categories.forEach(cat => {
            if (cat.assets) {
                cat.assets.forEach(asset => {
                    if (!asset.isTotal && !asset.isRealisedPnL && asset.name !== 'Total') {
                        const cur = asset.nativeCurrency || asset.currency || 'GBP';
                        let val = asset.gbp || 0; // Use GBP as base for fair comparison

                        if (cat.id === 'debt') val = -val;

                        if (cur === primaryCurrency) {
                            currencyTotals.Primary += val;
                        } else if (cur === secondaryCurrency) {
                            currencyTotals.Secondary += val;
                        } else {
                            currencyTotals.Other += val;
                        }
                    }
                });
            }
        });
    }

    const totalCurrencyTokensBase = currencyTotals.Primary + currencyTotals.Secondary + currencyTotals.Other;
    const currencySplitData = [
        { name: primaryCurrency, value: Math.max(0, toPrimary(currencyTotals.Primary)), color: '#D4AF37' },
        { name: secondaryCurrency, value: Math.max(0, toPrimary(currencyTotals.Secondary)), color: '#CC5500' },
        { name: 'Other', value: Math.max(0, toPrimary(currencyTotals.Other)), color: '#4A2B70' }
    ].filter(d => d.value > 0);

    const totalCurrencyTokensPrimary = currencySplitData.reduce((acc, d) => acc + d.value, 0);

    // Calculate Allocation vs Targets Data
    const actuals = masterMixData?.percentages || { Equity: 0, FixedIncome: 0, RealEstate: 0, Crypto: 0, Cash: 0 };
    const rawTargets = allocationTargets?.assetClasses || allocationTargets || { Equity: 50, FixedIncome: 30, RealEstate: 15, Crypto: 5, Cash: 0 };
    const targets = rawTargets;

    const allocationData = [
        { name: 'Equity', actual: actuals.Equity || 0, target: targets.Equity || 0 },
        { name: 'Fixed Inc.', actual: actuals.FixedIncome || 0, target: targets.FixedIncome || targets['Fixed Income'] || 0 },
        { name: 'Real Est.', actual: actuals.RealEstate || 0, target: targets.RealEstate || targets['Real Estate'] || 0 },
        { name: 'Crypto', actual: actuals.Crypto || 0, target: targets.Crypto || 0 },
        { name: 'Pensions', actual: actuals.Pensions || 0, target: targets.Pensions || 0 },
        { name: 'Cash', actual: actuals.Cash || 0, target: targets.Cash || 0 }
    ].sort((a, b) => b.actual - a.actual);

    // To align starting points:
    // We want the first month's value to be at the same relative height in the chart.
    const firstDP = displayData.find(d => d.networthPrimary > 0 && d.networthSecondary > 0);
    let domainPrimary = ['auto', 'auto'];
    let domainSecondary = ['auto', 'auto'];

    if (firstDP) {
        const v1_start = firstDP.networthPrimary;
        const v2_start = firstDP.networthSecondary;

        const v1_all = displayData.map(d => d.networthPrimary).filter(v => v > 0);
        const v2_all = displayData.map(d => d.networthSecondary).filter(v => v > 0);

        const v1_max = Math.max(...v1_all);
        const v1_min = Math.min(...v1_all);
        const v2_max = Math.max(...v2_all);
        const v2_min = Math.min(...v2_all);

        // We'll pad the max to give some headroom
        const v1_range_max = v1_max * 1.1;
        const v2_range_max = v2_max * 1.1;

        // Alignment: We want (v1_start - p_min) / (p_max - p_min) == (v2_start - s_min) / (s_max - s_min)
        // Simplest alignment is using 0 as base if values are all positive:
        // v1_start / v1_target_max == v2_start / v2_target_max
        let t1_max = v1_range_max;
        let t2_max = v1_range_max * (v2_start / v1_start);

        if (t2_max < v2_range_max) {
            t2_max = v2_range_max;
            t1_max = v2_range_max * (v1_start / v2_start);
        }

        domainPrimary = [0, t1_max];
        domainSecondary = [0, t2_max];
    }

    // DATA SOURCE REGISTRY MAP
    const dataRegistry = {
        'networth-history': historicalDisplayData,
        'category-history': historicalDisplayData,
        'allocation-current': allocationData,
        'roi-history': displayData.filter(d => d.roi !== null || (d.impliedRate !== null && d.impliedRate > 0)),
        'fx-rate-history': displayData.filter(d => d.roi !== null || (d.impliedRate !== null && d.impliedRate > 0)),
        'currency-exposure': currencySplitData,
        'net-flow-history': investmentsData,
        'wealth-trajectory': displayData
    };

    const meta = {
        primaryCurrency, secondaryCurrency, primaryMeta, secondaryMeta, formatPrimary, formatSecondary,
        domainPrimary, domainSecondary, totalCurrencyTokensPrimary,
        totalDrift: allocationData.reduce((acc, current) => acc + Math.abs(current.actual - current.target), 0)
    };

    const chartsToRender = dashboardConfig?.charts ? [...dashboardConfig.charts].sort((a, b) => a.order - b.order) : [];

    const [showAllCharts, setShowAllCharts] = React.useState(false);

    if (chartsToRender.length === 0) {
        return null;
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(500px,1fr))] gap-4 md:gap-6 mb-8">
                {chartsToRender.map((cfg, index) => (
                    <div key={cfg.id} className={`${!showAllCharts && index >= 2 ? 'hidden md:block' : ''}`}>
                        <GenericChart config={cfg} dataRegistry={dataRegistry} meta={meta} onCustomizeClick={onCustomizeClick} onNavigate={onNavigate} />
                    </div>
                ))}
            </div>
            {!showAllCharts && chartsToRender.length > 2 && (
                <button
                    onClick={() => setShowAllCharts(true)}
                    className="md:hidden w-full py-3 mb-6 text-sm font-space text-[#D4AF37] border border-[#D4AF37]/20 rounded-xl bg-[#D4AF37]/5 active:bg-[#D4AF37]/10 active:scale-[0.99] transition-all"
                >
                    View All Charts ({chartsToRender.length - 2} more) ›
                </button>
            )}
        </>
    );
}

function GenericChart({ config, dataRegistry, meta, onCustomizeClick, onNavigate }) {
    const { chartType, dataSources, series, title, options } = config;
    const { primaryCurrency, secondaryCurrency, primaryMeta, secondaryMeta, formatPrimary, formatSecondary, domainPrimary, domainSecondary, totalCurrencyTokensPrimary, totalDrift } = meta;

    const mainSource = dataSources?.[0];
    const data = dataRegistry[mainSource] || [];

    const isCategory = mainSource === 'allocation-current' || mainSource === 'currency-exposure';
    const xAxisKey = isCategory ? 'name' : 'month';

    const customTooltipProps = { primaryCurrency, secondaryCurrency, primaryMeta, secondaryMeta, formatPrimary, formatSecondary };

    const formatMonthYear = (val) => {
        if (!val) return '';
        const cleanVal = String(val).replace(' (Live)', '');
        if (/^\d{4}-\d{2}$/.test(cleanVal)) {
            const [year, month] = cleanVal.split('-');
            const date = new Date(year, parseInt(month) - 1, 1);
            return `${date.toLocaleString('en-US', { month: 'short' })}/${year.slice(2)}`;
        }
        if (/^[a-zA-Z]{3}\/\d{4}$/.test(cleanVal)) {
            const [month, year] = cleanVal.split('/');
            return `${month}/${year.slice(2)}`;
        }
        return cleanVal;
    };

    const commonXAxis = {
        dataKey: xAxisKey,
        stroke: "#F5F5DC",
        tick: { fill: '#F5F5DC', fontSize: 11, opacity: 0.5, fontFamily: 'var(--font-space)' },
        tickFormatter: isCategory ? (val) => val : formatMonthYear,
        axisLine: { stroke: 'rgba(212,175,55,0.1)' },
        minTickGap: isCategory ? 0 : 30
    };

    const commonYAxisLeft = {
        yAxisId: "left",
        stroke: "#F5F5DC",
        tick: { fill: '#F5F5DC', fontSize: 11, opacity: 0.5, fontFamily: 'var(--font-space)' },
        axisLine: { stroke: 'rgba(212,175,55,0.1)' }
    };

    const commonYAxisRight = {
        yAxisId: "right",
        orientation: "right",
        stroke: "#CC5500",
        tick: { fill: '#CC5500', fontSize: 11, opacity: 0.7, fontFamily: 'var(--font-space)' },
        axisLine: { stroke: 'rgba(204,85,0,0.2)' }
    };

    // Custom badge header rendering logic
    const renderHeaderBadges = () => {
        if (mainSource === 'networth-history') {
            return (
                <div className="flex gap-3 text-[10px] font-space uppercase tracking-wider">
                    <span className="text-[#D4AF37]">● {primaryCurrency}</span>
                    <span className="text-[#A0A0A0]">● Target ({primaryCurrency})</span>
                    <span className="text-[#CC5500]">● {secondaryCurrency}</span>
                </div>
            );
        }
        if (mainSource === 'category-history') {
            return null; // Legend is rendered below the chart for stacked-area
        }
        if (mainSource === 'allocation-current') {
            return (
                <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-full px-3 py-1">
                    <span className="text-[10px] font-mono text-parchment/40 uppercase tracking-widest">Total Drift</span>
                    <span className={`text-xs font-mono font-bold ${totalDrift > 0.1 ? 'text-red-400' : 'text-vu-green'}`}>
                        {totalDrift.toFixed(1)}%
                    </span>
                </div>
            );
        }
        if (mainSource === 'roi-history' && dataSources.includes('fx-rate-history')) {
            return (
                <div className="flex gap-3 text-[10px] font-space uppercase tracking-wider">
                    <span className="text-[#D4AF37]">● ROI (%)</span>
                    <span className="text-[#CC5500]">● FX Rate</span>
                </div>
            );
        }
        if (mainSource === 'wealth-trajectory') {
            return (
                <div className="flex gap-3 text-[10px] font-space uppercase tracking-wider">
                    <span className="text-vu-green">● Actual (Above)</span>
                    <span className="text-red-500">● Actual (Below)</span>
                    <span className="text-[#A0A0A0]">● Target ({primaryCurrency})</span>
                </div>
            );
        }
        return null; // fallback
    };

    const renderChart = () => {

        if (chartType === 'area') {
            return (
                <ComposedChart data={data}>
                    <defs>
                        <linearGradient id={`colorGold-${config.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#CC5500" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeOpacity={0.1} vertical={false} stroke="#F5F5DC" />
                    <XAxis {...commonXAxis} />
                    <YAxis {...commonYAxisLeft} domain={domainPrimary} tickFormatter={(val) => `${primaryMeta?.symbol || ''}${(val / 1000).toFixed(0)}k`} />
                    {options?.dualAxis && <YAxis {...commonYAxisRight} domain={domainSecondary} tickFormatter={(val) => `${secondaryMeta?.symbol || ''}${(val / 1000).toFixed(0)}k`} />}
                    <Tooltip content={<CustomTooltip {...customTooltipProps} />} />

                    {series.includes('networthPrimary') && (
                        <Area yAxisId="left" type="monotone" dataKey="networthPrimary" stroke="#D4AF37" strokeWidth={3} fillOpacity={1} fill={`url(#colorGold-${config.id})`} name={`Net Worth ${primaryCurrency}`} />
                    )}
                    {series.includes('networthSecondary') && (
                        <Area yAxisId={options?.dualAxis ? "right" : "left"} type="monotone" dataKey="networthSecondary" stroke="#CC5500" strokeWidth={2} dot={{ r: 0 }} activeDot={{ r: 4, fill: '#CC5500' }} name={`Net Worth ${secondaryCurrency}`} fillOpacity={0} />
                    )}
                    {series.includes('targetPrimary') && (
                        <Line yAxisId="left" type="monotone" dataKey="targetPrimary" name={`Target ${primaryCurrency}`} stroke="#A0A0A0" strokeWidth={2} strokeDasharray="3 3" dot={false} connectNulls />
                    )}
                    {series.includes('actualGreen') && (
                        <Line yAxisId="left" type="monotone" dataKey="actualGreen" stroke="var(--vu-green)" strokeWidth={3} name={`Actual ${primaryCurrency}`} dot={false} connectNulls={false} />
                    )}
                    {series.includes('actualRed') && (
                        <Line yAxisId="left" type="monotone" dataKey="actualRed" stroke="#ef4444" strokeWidth={3} name={`Actual ${primaryCurrency}`} dot={false} connectNulls={false} />
                    )}
                </ComposedChart>
            );
        }

        if (chartType === 'stacked-bar' || chartType === 'stacked-area') {
            const COMP_COLORS = {
                FixedIncome: '#10b981',
                Equity: '#3b82f6',
                RealEstate: '#ef4444',
                Crypto: '#f59e0b',
                Pensions: '#8b5cf6',
                Debt: '#ec4899',
            };
            const COMP_LABELS = {
                FixedIncome: 'Fixed Income',
                Equity: 'Equity',
                RealEstate: 'Real Estate',
                Crypto: 'Crypto',
                Pensions: 'Pensions',
                Debt: 'Debt',
            };
            const areaKeys = ['FixedIncome', 'Equity', 'RealEstate', 'Crypto', 'Pensions'].filter(k => series.includes(k));
            // Sort by latest value: largest at bottom of stack (rendered first)
            const lastDataPoint = data.length > 0 ? data[data.length - 1] : {};
            areaKeys.sort((a, b) => {
                const valA = lastDataPoint?.categories?.[a] || 0;
                const valB = lastDataPoint?.categories?.[b] || 0;
                return valB - valA; // Largest first = bottom of stack
            });
            // Compute gross assets (before debt reduction) for the debt gap line
            const showDebt = series.includes('Debt');
            const chartData = showDebt ? (() => {
                const mapped = data.map(d => {
                    const acts = d.actuals || {};
                    const debt = acts.Debt || 0;
                    const gross = (acts.RealEstate || 0) + (acts.Equity || 0) + (acts.FixedIncome || 0) + (acts.Crypto || 0) + (acts.Pensions || 0);
                    return { ...d, grossAssets: debt > 0 && gross > 0 ? gross : null };
                });
                // Find first month with debt and show line starting one month before
                const firstDebtIdx = mapped.findIndex(d => d.grossAssets !== null);
                if (firstDebtIdx > 0) {
                    const prevPt = mapped[firstDebtIdx - 1];
                    const cats = prevPt.categories || {};
                    const netWorth = (cats.RealEstate || 0) + (cats.Equity || 0) + (cats.FixedIncome || 0) + (cats.Crypto || 0) + (cats.Pensions || 0);
                    mapped[firstDebtIdx - 1] = { ...prevPt, grossAssets: netWorth > 0 ? netWorth : null };
                }
                return mapped;
            })() : data;
            return (
                <ComposedChart data={chartData}>
                    <defs>
                        {Object.entries(COMP_COLORS).map(([key, color]) => (
                            <linearGradient key={key} id={`comp-grad-dash-${key}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={color} stopOpacity={0.7} />
                                <stop offset="100%" stopColor={color} stopOpacity={0.15} />
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis
                        dataKey="month"
                        stroke="transparent"
                        tick={{ fill: 'rgba(245,245,220,0.3)', fontSize: 10, fontFamily: 'var(--font-space)' }}
                        tickFormatter={formatMonthYear}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        minTickGap={30}
                    />
                    <YAxis
                        stroke="transparent"
                        tick={{ fill: 'rgba(245,245,220,0.25)', fontSize: 10, fontFamily: 'var(--font-space)' }}
                        tickFormatter={(val) => {
                            if (Math.abs(val) >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                            if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(0)}k`;
                            return val.toLocaleString('en-GB');
                        }}
                        tickLine={false}
                        axisLine={false}
                        width={45}
                    />
                    <Tooltip content={<CustomTooltip {...customTooltipProps} />} />
                    {areaKeys.map(key => (
                        <Area
                            key={key}
                            type="monotone"
                            dataKey={`categories.${key}`}
                            name={COMP_LABELS[key]}
                            stackId="1"
                            fill={`url(#comp-grad-dash-${key})`}
                            stroke={COMP_COLORS[key]}
                            strokeWidth={0.5}
                        />
                    ))}
                    {showDebt && (
                        <Line
                            type="monotone"
                            dataKey="grossAssets"
                            name="Gross Assets (excl. Debt)"
                            stroke="#ec4899"
                            strokeWidth={1.5}
                            strokeDasharray="6 3"
                            dot={false}
                            connectNulls
                        />
                    )}
                </ComposedChart>
            );
        }

        if (chartType === 'horizontal-bar') {
            return (
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeOpacity={0.1} horizontal={false} stroke="#F5F5DC" />
                    <XAxis type="number" domain={[0, 'dataMax + 10']} stroke="#F5F5DC" tick={{ fill: '#F5F5DC', fontSize: 11, opacity: 0.5, fontFamily: 'var(--font-space)' }} tickFormatter={(val) => `${Math.round(val)}%`} axisLine={{ stroke: 'rgba(212,175,55,0.1)' }} />
                    <YAxis dataKey={xAxisKey} type="category" stroke="#F5F5DC" tick={{ fill: '#F5F5DC', fontSize: 11, opacity: 0.8, fontFamily: 'var(--font-space)' }} width={80} axisLine={{ stroke: 'rgba(212,175,55,0.1)' }} />
                    <Tooltip cursor={{ fill: 'rgba(212,175,55,0.1)' }} contentStyle={{ backgroundColor: '#1A0F2E', borderColor: '#D4AF37', borderRadius: '8px', color: '#F5F5DC', fontFamily: 'monospace' }} itemStyle={{ color: '#F5F5DC' }} formatter={(value) => `${value.toFixed(1)}%`} />

                    <Legend wrapperStyle={{ color: '#F5F5DC', fontSize: '0.75rem', opacity: 0.7 }} />
                    {series.includes('actual') && (
                        <Bar dataKey="actual" name="Actual %" fill="#D4AF37" radius={[0, 4, 4, 0]} barSize={16}>
                            <LabelList dataKey="actual" position="right" formatter={(val) => `${val.toFixed(1)}%`} style={{ fill: '#F5F5DC', fontSize: '10px', opacity: 0.8, fontFamily: 'var(--font-space)' }} />
                        </Bar>
                    )}
                    {series.includes('target') && (
                        <Bar dataKey="target" name="Target %" fill="rgba(245, 245, 220, 0.2)" stroke="#F5F5DC" strokeWidth={1} strokeDasharray="2 2" radius={[0, 4, 4, 0]} barSize={16}>
                            <LabelList dataKey="target" position="right" formatter={(val) => `${val.toFixed(1)}%`} style={{ fill: '#F5F5DC', fontSize: '10px', opacity: 0.5, fontFamily: 'var(--font-space)' }} />
                        </Bar>
                    )}
                </BarChart>
            );
        }

        if (chartType === 'line') {
            return (
                <LineChart data={data}>
                    <CartesianGrid strokeOpacity={0.1} vertical={false} stroke="#F5F5DC" />
                    <XAxis {...commonXAxis} />
                    <YAxis yAxisId="left" stroke="#F5F5DC" tick={{ fill: '#F5F5DC', fontSize: 11, opacity: 0.5, fontFamily: 'var(--font-space)' }} tickFormatter={(val) => series.includes('roi') ? `${val}%` : `${secondaryMeta?.symbol || ''}${(val / 1000).toFixed(0)}k`} axisLine={{ stroke: 'rgba(212,175,55,0.1)' }} />
                    {options?.dualAxis && <YAxis yAxisId="right" orientation="right" stroke="#CC5500" tick={{ fill: '#CC5500', fontSize: 11, opacity: 0.7, fontFamily: 'var(--font-space)' }} tickFormatter={(val) => `${primaryMeta?.symbol || ''}${val.toFixed(2)}`} axisLine={{ stroke: 'rgba(204,85,0,0.2)' }} domain={['auto', 'auto']} />}
                    <Tooltip content={<CustomTooltip {...customTooltipProps} />} />
                    <Legend wrapperStyle={{ color: '#F5F5DC', fontSize: '0.75rem', opacity: 0.7 }} />
                    <ReferenceLine yAxisId="left" y={0} stroke="#F5F5DC" strokeOpacity={0.2} />

                    {series.includes('roi') && <Line yAxisId="left" type="monotone" dataKey="roi" stroke="#D4AF37" strokeWidth={2} dot={{ r: 0 }} activeDot={{ r: 4, fill: '#D4AF37' }} name="ROI" />}
                    {series.includes('impliedRate') && <Line yAxisId={options?.dualAxis ? "right" : "left"} type="monotone" dataKey="impliedRate" stroke="#CC5500" strokeWidth={2} dot={{ r: 0 }} activeDot={{ r: 4, fill: '#CC5500' }} name={`FX Rate ${secondaryCurrency}/${primaryCurrency}`} connectNulls />}
                    {series.includes('Net') && <Line yAxisId="left" type="monotone" dataKey="Net" name={`Net Flow ${secondaryCurrency}`} stroke="#D4AF37" strokeWidth={2} dot={{ r: 0 }} activeDot={{ r: 4, fill: '#D4AF37' }} />}
                </LineChart>
            );
        }

        if (chartType === 'bar') {
            return (
                <BarChart data={data}>
                    <CartesianGrid strokeOpacity={0.1} vertical={false} stroke="#F5F5DC" />
                    <XAxis {...commonXAxis} />
                    <YAxis stroke="#F5F5DC" tick={{ fill: '#F5F5DC', fontSize: 11, opacity: 0.5, fontFamily: 'var(--font-space)' }} tickFormatter={(val) => `${secondaryMeta?.symbol || ''}${(val / 1000).toFixed(0)}k`} axisLine={{ stroke: 'rgba(212,175,55,0.1)' }} />
                    <Tooltip content={<CustomTooltip {...customTooltipProps} />} />
                    <Legend wrapperStyle={{ color: '#F5F5DC', fontSize: '0.75rem', opacity: 0.7 }} />
                    <ReferenceLine y={0} stroke="#F5F5DC" strokeOpacity={0.2} />

                    {series.includes('Net') && (
                        <Bar dataKey="Net" name={`Net Flow ${secondaryCurrency}`} radius={[4, 4, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.Net >= 0 ? 'var(--vu-green)' : '#ef4444'} />
                            ))}
                        </Bar>
                    )}
                </BarChart>
            );
        }

        if (chartType === 'donut') {
            return (
                <div className="w-full h-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={110}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[#F5F5DC]/50 font-space text-xs uppercase tracking-widest mb-1">Total Net {primaryCurrency}</span>
                        <span className="text-[#D4AF37] font-bebas text-2xl drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">
                            {primaryMeta?.symbol} {(totalCurrencyTokensPrimary / 1000000).toFixed(2)}M
                        </span>
                    </div>
                </div>
            );
        }

        return null;
    };

    const chartContent = renderChart();

    // For donut charts, the chart handles its own ResponsiveContainer
    const isDonut = chartType === 'donut';

        const isClickable = mainSource === 'net-flow-history';

    return (
        <div
            className={`bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col h-full ${isClickable ? 'cursor-pointer hover:border-[#D4AF37]/30 transition-colors' : ''}`}
            data-chart-id={config.id}
            onClick={isClickable ? () => { window.location.href = '/ledger/investments'; } : undefined}
        >
            <div className="flex justify-between items-center mb-5 shrink-0">
                <div className="flex items-center gap-3">
                    <h3 className="text-[#D4AF37] m-0 text-xl font-normal font-bebas tracking-wide">{title}</h3>
                    <button
                        onClick={onCustomizeClick}
                        className="text-[#D4AF37]/40 hover:text-[#D4AF37] transition-colors p-1"
                        title="Customize Dashboard"
                    >
                        <Settings2 size={16} />
                    </button>
                </div>
                {renderHeaderBadges()}
            </div>
            <div className="h-[220px] md:h-[300px] flex-grow relative">
                {isDonut ? chartContent : (
                    <ResponsiveContainer width="100%" height="100%">
                        {chartContent || <div />}
                    </ResponsiveContainer>
                )}
            </div>
            {chartType === 'donut' && (
                <div className="mt-4 flex justify-center gap-6 shrink-0 flex-wrap">
                    {data.map((entry) => (
                        <div key={entry.name} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                            <span className="text-[#F5F5DC]/80 font-space text-[10px] md:text-sm">
                                {entry.name}: <span className="font-bold">{((entry.value / totalCurrencyTokensPrimary) * 100).toFixed(1)}%</span>
                            </span>
                        </div>
                    ))}
                </div>
            )}
            {(chartType === 'stacked-bar' || chartType === 'stacked-area') && (() => {
                const COMP_COLORS_LEGEND = {
                    FixedIncome: '#10b981',
                    Equity: '#3b82f6',
                    RealEstate: '#ef4444',
                    Crypto: '#f59e0b',
                    Pensions: '#8b5cf6',
                };
                const COMP_LABELS_LEGEND = {
                    FixedIncome: 'Fixed Inc',
                    Equity: 'Equity',
                    RealEstate: 'Real Est',
                    Crypto: 'Crypto',
                    Pensions: 'Pensions',
                };
                const lastDP = data.length > 0 ? data[data.length - 1] : {};
                const sortedKeys = Object.keys(COMP_COLORS_LEGEND)
                    .filter(k => series.includes(k))
                    .sort((a, b) => {
                        const valA = lastDP?.categories?.[a] || 0;
                        const valB = lastDP?.categories?.[b] || 0;
                        return valB - valA; // Largest first
                    });
                return (
                    <div className="mt-3 flex justify-center gap-3 shrink-0 flex-wrap">
                        {sortedKeys.map(key => (
                            <div key={key} className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-sm" style={{ background: COMP_COLORS_LEGEND[key], boxShadow: `0 0 6px ${COMP_COLORS_LEGEND[key]}50` }} />
                                <span className="text-[9px] font-space" style={{ color: 'rgba(245,245,220,0.4)', fontWeight: 500 }}>
                                    {COMP_LABELS_LEGEND[key]}
                                </span>
                            </div>
                        ))}
                        {series.includes('Debt') && (
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-0 border-t-[2px] border-dashed border-[#ec4899]" />
                                <span className="text-[9px] font-space" style={{ color: 'rgba(245,245,220,0.4)', fontWeight: 500 }}>
                                    Debt
                                </span>
                            </div>
                        )}
                    </div>
                );
            })()}
        </div>
    );
}

