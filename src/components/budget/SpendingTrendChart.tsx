'use client';

import React from 'react';
import {
    ResponsiveContainer, ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { formatCents, formatMonthShort } from '@/lib/budgetUtils';
import { convertCurrency } from '@/lib/fxConvert';
import useBudgetStore from '@/stores/useBudgetStore';
import { CHART_COLORS, AXIS_STYLE, GRID_STYLE } from '@/lib/chartTheme';
import { ChartTooltip } from '@/components/ui/chart-tooltip';
import type { BudgetMonthlyRollup } from '@/types';

interface SpendingTrendChartProps {
    rollupHistory: BudgetMonthlyRollup[];
}

export default function SpendingTrendChart({ rollupHistory }: SpendingTrendChartProps) {
    const { displayCurrency, fxRates } = useBudgetStore();
    const fx = (cents: number) => convertCurrency(cents, displayCurrency, displayCurrency, fxRates);

    const chartData = rollupHistory.map(r => ({
        month: r.month,
        label: formatMonthShort(r.month),
        income: fx(r.total_income_cents),
        expenses: fx(r.total_expenses_cents),
    }));

    const hasData = chartData.some(d => d.income > 0 || d.expenses > 0);

    return (
        <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-6 flex flex-col">
            <h3 className="text-[#D4AF37] text-xl font-normal font-bebas tracking-wide mb-5">
                Spending Trend
            </h3>

            {!hasData ? (
                <div className="h-[220px] md:h-[280px] flex items-center justify-center">
                    <p className="text-[#F5F5DC]/30 text-sm font-space">
                        No data yet. Add transactions to see trends.
                    </p>
                </div>
            ) : (
                <>
                    <div className="h-[220px] md:h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData}>
                                <defs>
                                    <linearGradient id="budgetIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#34D399" stopOpacity={0.5} />
                                        <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="budgetExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.5} />
                                        <stop offset="100%" stopColor="#D4AF37" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid {...GRID_STYLE} vertical={false} />
                                <XAxis
                                    dataKey="label"
                                    stroke="transparent"
                                    tick={{ ...AXIS_STYLE }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="transparent"
                                    tick={{ ...AXIS_STYLE }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val: number) => {
                                        if (val === 0) return '0';
                                        if (Math.abs(val) >= 100000) return `${(val / 100000).toFixed(0)}k`;
                                        return `${(val / 100).toFixed(0)}`;
                                    }}
                                />
                                <Tooltip
                                    content={({ active, payload, label }) => (
                                        <ChartTooltip
                                            active={active}
                                            payload={payload as any}
                                            label={label}
                                            valueFormatter={(value: number) => formatCents(value, displayCurrency)}
                                        />
                                    )}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="income"
                                    name="Income"
                                    stroke={CHART_COLORS.success}
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#budgetIncomeGrad)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="expenses"
                                    name="Expenses"
                                    stroke={CHART_COLORS.primary}
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#budgetExpenseGrad)"
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Legend */}
                    <div className="mt-3 flex justify-center gap-4 text-2xs font-space shrink-0 flex-wrap">
                        <span className="text-[#34D399]">● Income</span>
                        <span className="text-[#D4AF37]">● Expenses</span>
                    </div>
                </>
            )}
        </div>
    );
}
