import React, { useMemo } from 'react';
import { formatCurrency } from '@/lib/currency';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine, Legend, Cell
} from 'recharts';

const CATEGORY_COLORS = {
    FixedIncome: '#10b981',
    Equity: '#3b82f6',
    RealEstate: '#ef4444',
    Crypto: '#f59e0b',
    Pensions: '#8b5cf6',
    Debt: '#ec4899',
};

const formatMonthLabel = (isoMonth) => {
    if (!isoMonth || !isoMonth.includes('-')) return isoMonth;
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const [yyyy, mm] = isoMonth.split('-');
    return `${MONTH_NAMES[parseInt(mm, 10) - 1]}/${yyyy.slice(2)}`;
};

const formatYAxis = (value) => {
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value.toLocaleString('en-GB');
};

// --- Shared Tooltip ---
const PodTooltip = ({ active, payload, label, isCurrency = true }) => {
    if (!active || !payload || !payload.length) return null;
    return (
        <div className="rounded-xl" style={{ background: 'rgba(18, 20, 24, 0.90)', border: '1px solid rgba(255,255,255,0.06)', padding: '10px 14px', backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', }}>
            <div className="text-[11px] font-semibold mb-1.5 font-space" style={{ color: '#D4AF37' }}>{label}</div>
            {payload.filter(e => e.value != null && e.value !== 0).map((entry, i) => (
                <div key={i} className="flex items-center gap-1.5" style={{ marginBottom: '3px' }}>
                    <div className="rounded" style={{ width: '8px', height: '8px', background: entry.color || entry.fill || '#fff' }} />
                    <span className="text-[10px] font-space" style={{ color: 'rgba(245,245,220,0.5)' }}>{entry.name}:</span>
                    <span className="text-[10px] font-semibold font-space" style={{ color: 'rgba(245,245,220,0.9)' }}>
                        {isCurrency ? formatCurrency(entry.value, 'BRL') : `${entry.value.toFixed(1)}%`}
                    </span>
                </div>
            ))}
        </div>
    );
};

// --- Pod Card Wrapper ---
const PodCard = ({ title, icon, children }) => (
    <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
            <span className="text-sm">{icon}</span>
            <span className="text-xs font-semibold tracking-[0.5px] uppercase" style={{ color: 'rgba(245,245,220,0.7)' }}>{title}</span>
        </div>
        {children}
    </div>
);

export default function LedgerHeroPods({ snapshots, forecastActuals, targetROI, targetContribution }) {
    // ══════════ Pod 1: Portfolio Composition Data ══════════
    const compositionData = useMemo(() => {
        if (!snapshots || !snapshots.length) return [];
        return snapshots.map(s => ({
            month: s.month,
            FixedIncome: s.categories?.FixedIncome || 0,
            Equity: s.categories?.Equity || 0,
            RealEstate: s.categories?.RealEstate || 0,
            Crypto: s.categories?.Crypto || 0,
            Pensions: s.categories?.Pensions || 0,
            Debt: -(s.categories?.Debt || 0), // Negative for debt
            netWorth: s.networthBRL || s.totalBRL || 0,
        }));
    }, [snapshots]);

    // ══════════ Pod 2: Yearly ROI Data ══════════
    const yearlyROIData = useMemo(() => {
        if (!snapshots || !snapshots.length) return [];
        const yearMap = {};
        snapshots.forEach(s => {
            if (!s.month) return;
            const year = s.month.split('-')[0];
            if (!yearMap[year]) yearMap[year] = [];
            yearMap[year].push(s);
        });

        // Build yearly contributions from forecastActuals
        const yearlyContribs = {};
        if (forecastActuals && forecastActuals.length) {
            forecastActuals.forEach(d => {
                if (!d.date) return;
                const year = d.date.split('/')[1];
                if (!yearlyContribs[year]) yearlyContribs[year] = 0;
                yearlyContribs[year] += (d.contribution || 0);
            });
        }

        // Calculate single-year ROI: (endNW - startNW - contributions) / startNW
        const years = Object.keys(yearMap).sort();
        return years.map(year => {
            const monthsInYear = yearMap[year].sort((a, b) => a.month.localeCompare(b.month));
            const lastMonth = monthsInYear[monthsInYear.length - 1];
            const endNW = lastMonth.networthBRL || lastMonth.totalBRL || 0;

            // Start NW = end of previous year (or first month of this year if no prev year)
            const prevYear = String(parseInt(year) - 1);
            const prevYearMonths = yearMap[prevYear];
            let startNW = 0;
            if (prevYearMonths && prevYearMonths.length > 0) {
                const lastPrevMonth = prevYearMonths.sort((a, b) => a.month.localeCompare(b.month))[prevYearMonths.length - 1];
                startNW = lastPrevMonth.networthBRL || lastPrevMonth.totalBRL || 0;
            }

            const contribs = yearlyContribs[year] || 0;
            let yearlyReturn = 0;
            if (startNW > 0) {
                // Total year-over-year return (includes contributions)
                yearlyReturn = ((endNW - startNW) / startNW) * 100;
            }

            return {
                year,
                actual: parseFloat(yearlyReturn.toFixed(1)),
                target: targetROI || 10,
            };
        }).filter(d => d.year >= '2022'); // Only show meaningful years
    }, [snapshots, forecastActuals, targetROI]);

    // ══════════ Pod 3: Yearly Contributions Data ══════════
    const yearlyContribData = useMemo(() => {
        if (!forecastActuals || !forecastActuals.length) return [];
        const yearMap = {};
        forecastActuals.forEach(d => {
            if (!d.date) return;
            const parts = d.date.split('/');
            const year = parts[1];
            if (!yearMap[year]) yearMap[year] = 0;
            yearMap[year] += (d.contribution || 0);
        });

        const annualTarget = (targetContribution || 12000) * 12;
        return Object.keys(yearMap).sort().map(year => ({
            year,
            actual: Math.round(yearMap[year]),
            target: annualTarget,
        }));
    }, [forecastActuals, targetContribution]);

    // ══════════ RENDER ══════════
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Pod 1: Portfolio Composition */}
            <PodCard title="Portfolio Composition" icon="📊">
                <div className="w-full" style={{ height: '220px' }}>
                    <ResponsiveContainer>
                        <AreaChart data={compositionData}>
                            <defs>
                                {Object.entries(CATEGORY_COLORS).map(([key, color]) => (
                                    <linearGradient key={key} id={`comp-grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={color} stopOpacity={0.7} />
                                        <stop offset="100%" stopColor={color} stopOpacity={0.15} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                            <XAxis
                                dataKey="month"
                                stroke="transparent"
                                tick={{ fill: 'rgba(245,245,220,0.3)', fontSize: 9 }}
                                tickFormatter={formatMonthLabel}
                                tickLine={false}
                                axisLine={false}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                stroke="transparent"
                                tick={{ fill: 'rgba(245,245,220,0.25)', fontSize: 9 }}
                                tickFormatter={formatYAxis}
                                tickLine={false}
                                axisLine={false}
                                width={45}
                            />
                            <Tooltip content={<PodTooltip />} />
                            {['FixedIncome', 'Equity', 'RealEstate', 'Crypto', 'Pensions'].map(key => (
                                <Area
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    name={key === 'FixedIncome' ? 'Fixed Income' : key === 'RealEstate' ? 'Real Estate' : key}
                                    stackId="1"
                                    fill={`url(#comp-grad-${key})`}
                                    stroke={CATEGORY_COLORS[key]}
                                    strokeWidth={0.5}
                                />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                {/* Mini legend */}
                <div className="flex justify-center gap-3 mt-2 flex-wrap">
                    {Object.entries(CATEGORY_COLORS).filter(([k]) => k !== 'Debt').map(([key, color]) => (
                        <div key={key} className="flex items-center gap-1">
                            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: color, boxShadow: `0 0 6px ${color}50` }} />
                            <span className="font-medium" style={{ fontSize: '9px', color: 'rgba(245,245,220,0.4)' }}>
                                {key === 'FixedIncome' ? 'Fixed Inc' : key === 'RealEstate' ? 'Real Est' : key}
                            </span>
                        </div>
                    ))}
                </div>
            </PodCard>

            {/* Pod 2: Yearly ROI vs Target */}
            <PodCard title="Yearly ROI vs Target" icon="📈">
                <div className="w-full" style={{ height: '220px' }}>
                    <ResponsiveContainer>
                        <BarChart data={yearlyROIData} barCategoryGap="20%">
                            <defs>
                                <linearGradient id="roi-actual-grad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#34D399" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="#34D399" stopOpacity={0.4} />
                                </linearGradient>
                                <linearGradient id="roi-target-grad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6b7280" stopOpacity={0.5} />
                                    <stop offset="100%" stopColor="#6b7280" stopOpacity={0.15} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                            <XAxis
                                dataKey="year"
                                stroke="transparent"
                                tick={{ fill: 'rgba(245,245,220,0.4)', fontSize: 11, fontWeight: 600 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="transparent"
                                tick={{ fill: 'rgba(245,245,220,0.25)', fontSize: 9 }}
                                tickFormatter={v => `${v}%`}
                                tickLine={false}
                                axisLine={false}
                                width={40}
                            />
                            <Tooltip content={<PodTooltip isCurrency={false} />} />
                            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                            <Bar dataKey="target" name="Target" fill="url(#roi-target-grad)" radius={[4, 4, 0, 0]} barSize={20} />
                            <Bar dataKey="actual" name="Actual" radius={[4, 4, 0, 0]} barSize={20}>
                                {yearlyROIData.map((entry, index) => (
                                    <Cell
                                        key={index}
                                        fill={entry.actual >= entry.target ? 'url(#roi-actual-grad)' : '#ef4444'}
                                        fillOpacity={entry.actual >= entry.target ? 1 : 0.7}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="flex justify-center gap-5 mt-2">
                    <div className="flex items-center" style={{ gap: '5px' }}>
                        <div className="rounded opacity-50" style={{ width: '10px', height: '10px', background: '#6b7280' }} />
                        <span className="text-[10px] font-medium" style={{ color: 'rgba(245,245,220,0.4)' }}>Target ({targetROI || 10}%)</span>
                    </div>
                    <div className="flex items-center" style={{ gap: '5px' }}>
                        <div className="rounded" style={{ width: '10px', height: '10px', background: '#34D399' }} />
                        <span className="text-[10px] font-medium" style={{ color: 'rgba(245,245,220,0.4)' }}>Actual</span>
                    </div>
                </div>
            </PodCard>

            {/* Pod 3: Yearly Contributions vs Target */}
            <PodCard title="Yearly Contributions vs Target" icon="💸">
                <div className="w-full" style={{ height: '220px' }}>
                    <ResponsiveContainer>
                        <BarChart data={yearlyContribData} barCategoryGap="20%">
                            <defs>
                                <linearGradient id="contrib-actual-grad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.4} />
                                </linearGradient>
                                <linearGradient id="contrib-target-grad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6b7280" stopOpacity={0.5} />
                                    <stop offset="100%" stopColor="#6b7280" stopOpacity={0.15} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                            <XAxis
                                dataKey="year"
                                stroke="transparent"
                                tick={{ fill: 'rgba(245,245,220,0.4)', fontSize: 11, fontWeight: 600 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="transparent"
                                tick={{ fill: 'rgba(245,245,220,0.25)', fontSize: 9 }}
                                tickFormatter={formatYAxis}
                                tickLine={false}
                                axisLine={false}
                                width={45}
                            />
                            <Tooltip content={<PodTooltip />} />
                            <Bar dataKey="target" name="Target" fill="url(#contrib-target-grad)" radius={[4, 4, 0, 0]} barSize={20} />
                            <Bar dataKey="actual" name="Actual" radius={[4, 4, 0, 0]} barSize={20}>
                                {yearlyContribData.map((entry, index) => (
                                    <Cell
                                        key={index}
                                        fill={entry.actual >= entry.target ? 'url(#contrib-actual-grad)' : '#ef4444'}
                                        fillOpacity={entry.actual >= entry.target ? 1 : 0.7}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="flex justify-center gap-5 mt-2">
                    <div className="flex items-center" style={{ gap: '5px' }}>
                        <div className="rounded opacity-50" style={{ width: '10px', height: '10px', background: '#6b7280' }} />
                        <span className="text-[10px] font-medium" style={{ color: 'rgba(245,245,220,0.4)' }}>
                            Target ({formatCurrency((targetContribution || 12000) * 12, 'BRL')}/yr)
                        </span>
                    </div>
                    <div className="flex items-center" style={{ gap: '5px' }}>
                        <div className="rounded" style={{ width: '10px', height: '10px', background: '#3b82f6' }} />
                        <span className="text-[10px] font-medium" style={{ color: 'rgba(245,245,220,0.4)' }}>Actual</span>
                    </div>
                </div>
            </PodCard>
        </div>
    );
}
