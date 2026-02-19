import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line, ComposedChart } from 'recharts';
import { formatCurrency } from '@/lib/currency';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass-card" style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p style={{ color: 'var(--fg-primary)', marginBottom: '8px', fontWeight: 600 }}>{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color }} />
                        <span style={{ color: 'var(--fg-secondary)', fontSize: '0.9rem' }}>
                            {entry.name}: {
                                entry.name.includes('ROI') ? `${entry.value.toFixed(1)}%` :
                                    entry.name.includes('Rate') ? `R$ ${entry.value.toFixed(2)}` :
                                        entry.name.includes('GBP') ? `£${entry.value.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` :
                                            formatCurrency(entry.value, 'BRL')
                            }
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export default function DashboardCharts({ historicalData, currentMonthData, rates }) {
    // Combine historical snapshots with current month live data
    const data = [...historicalData];
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    const liveNetWorthBRL = currentMonthData.netWorth.amount;

    // Calculate Live Total Assets (BRL) - Sum of all Assets (excluding Debt)
    // Debt is usually positive in summaries but subtracted for Net Worth.
    // If we want "Total BRL" as per CSV (which seems to be Gross Assets), we sum everything except Debt.
    const liveAssets = currentMonthData.summaries.filter(s => s.id !== 'debt').reduce((acc, curr) => acc + curr.amount, 0);
    const liveDebt = currentMonthData.summaries.find(s => s.id === 'debt')?.amount || 0;

    // Calculate Live Total GBP
    // We use the provided live BRL rate
    const liveTotalGBP = rates && rates.BRL ? liveAssets / rates.BRL : 0;

    // If csv "Total BRL" includes everything, we should match that.
    // CSV "Total BRL" was ~1.15M, Net was ~1.01M. Debt ~135k. 
    // So Total BRL = Net Worth + Debt = Total Assets.

    // Check if historicalData has 'totalBRL'. If not (old snapshots), fallback to netWorthBRL + debt?
    // The ingestion script now adds `totalBRL`.

    const displayData = [
        ...data.filter(d => d.month !== currentMonth).map(d => ({
            ...d,
            impliedRate: d.totalminuspensionsGBP ? d.totalminuspensionsBRL / d.totalminuspensionsGBP : 0,
            // Ensure networthBRL/GBP exist if missing (fallback logic)
            networthBRL: d.networthBRL || d.totalminuspensionsBRL,
            networthGBP: d.networthGBP || d.totalminuspensionsGBP
        })),
        {
            month: currentMonth + ' (Live)',
            totalminuspensionsBRL: liveNetWorthBRL - (currentMonthData.summaries.find(s => s.id === 'pensions')?.amount || 0),
            networthBRL: liveNetWorthBRL,
            networthGBP: liveNetWorthBRL / rates.BRL,
            roi: null,
            impliedRate: null,
            categories: {
                FixedIncome: currentMonthData.summaries.find(s => s.id === 'fixed-income')?.amount || 0,
                Equity: currentMonthData.summaries.find(s => s.id === 'equity')?.amount || 0,
                RealEstate: currentMonthData.summaries.find(s => s.id === 'real-estate')?.amount || 0,
                Crypto: currentMonthData.summaries.find(s => s.id === 'crypto')?.amount || 0,
                Pensions: currentMonthData.summaries.find(s => s.id === 'pensions')?.amount || 0,
                Debt: currentMonthData.summaries.find(s => s.id === 'debt')?.amount || 0
            }
        }
    ];

    // Calculate domains to align starting points
    const firstDataPoint = displayData.find(d => d.networthBRL && d.networthGBP);
    let domainBRL = ['auto', 'auto'];
    let domainGBP = ['auto', 'auto'];

    if (firstDataPoint) {
        const startBRL = firstDataPoint.networthBRL;
        const startGBP = firstDataPoint.networthGBP;

        // Find max values in the dataset to ensure we don't clip
        const maxBRL = Math.max(...displayData.map(d => d.networthBRL || 0));
        const maxGBP = Math.max(...displayData.map(d => d.networthGBP || 0));

        // We want startBRL / yMaxBRL = startGBP / yMaxGBP
        // So yMaxGBP = yMaxBRL * (startGBP / startBRL)
        // But we also need yMaxBRL >= maxBRL and yMaxGBP >= maxGBP

        const ratio = startGBP / startBRL;

        // Calculate theoretical maxes if we respected the ratio based on the larger relative constraint
        // If we set YMaxBRL = maxBRL, then required YMaxGBP = maxBRL * ratio. 
        // If required YMaxGBP < maxGBP, then we must increase YMaxGBP to maxGBP, and scale YMaxBRL accordingly.

        let targetMaxBRL = maxBRL;
        let targetMaxGBP = maxBRL * ratio;

        if (targetMaxGBP < maxGBP) {
            targetMaxGBP = maxGBP;
            targetMaxBRL = maxGBP / ratio;
        }

        // Add a little buffer (e.g. 5%) to the top so the line doesn't hit the very edge
        targetMaxBRL *= 1.05;
        targetMaxGBP *= 1.05;

        domainBRL = [0, targetMaxBRL];
        domainGBP = [0, targetMaxGBP];
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            {/* Total Net Worth History (Dual Axis) */}
            <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ color: 'var(--fg-primary)', margin: 0 }}>Total Net Worth History</h3>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--accent-color)' }}>● Net Worth BRL</span>
                        <span style={{ color: '#8b5cf6' }}>● Net Worth GBP</span>
                    </div>
                </div>
                <div style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={displayData}>
                            <defs>
                                <linearGradient id="colorZw" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--accent-color)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--accent-color)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis
                                dataKey="month"
                                stroke="var(--fg-secondary)"
                                tick={{ fill: 'var(--fg-secondary)', fontSize: 12 }}
                                tickFormatter={(val) => val.replace(' (Live)', '')}
                                minTickGap={30}
                            />
                            {/* Left Axis: BRL */}
                            <YAxis
                                yAxisId="left"
                                stroke="var(--fg-secondary)"
                                tick={{ fill: 'var(--fg-secondary)', fontSize: 12 }}
                                tickFormatter={(val) => `R$${(val / 1000).toFixed(0)}k`}
                                domain={domainBRL}
                            />
                            {/* Right Axis: GBP */}
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                stroke="#8b5cf6"
                                tick={{ fill: '#8b5cf6', fontSize: 12 }}
                                tickFormatter={(val) => `£${(val / 1000).toFixed(0)}k`}
                                domain={domainGBP}
                            />
                            <Tooltip content={<CustomTooltip />} />

                            {/* Net Worth BRL Area */}
                            <Area
                                yAxisId="left"
                                type="monotone"
                                dataKey="networthBRL"
                                stroke="var(--accent-color)"
                                fillOpacity={1}
                                fill="url(#colorZw)"
                                name="Net Worth BRL"
                            />

                            {/* Net Worth GBP Line */}
                            <Area
                                yAxisId="right"
                                type="monotone"
                                dataKey="networthGBP"
                                stroke="#8b5cf6"
                                strokeWidth={2}
                                dot={{ r: 0 }}
                                activeDot={{ r: 4 }}
                                name="Net Worth GBP"
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Asset Allocation Stacked Bar Chart */}
            <div className="glass-card">
                <h3 style={{ marginBottom: '20px', color: 'var(--fg-primary)' }}>Asset Allocation History</h3>
                <div style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={displayData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis
                                dataKey="month"
                                stroke="var(--fg-secondary)"
                                tick={{ fill: 'var(--fg-secondary)', fontSize: 12 }}
                                tickFormatter={(val) => val.replace(' (Live)', '')}
                                minTickGap={30}
                            />
                            <YAxis
                                stroke="var(--fg-secondary)"
                                tick={{ fill: 'var(--fg-secondary)', fontSize: 12 }}
                                tickFormatter={(val) => `R$${(val / 1000).toFixed(0)}k`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey="categories.RealEstate" name="Real Estate" stackId="a" fill="#ef4444" />
                            <Bar dataKey="categories.Equity" name="Equity" stackId="a" fill="#3b82f6" />
                            <Bar dataKey="categories.Pensions" name="Pensions" stackId="a" fill="#8b5cf6" />
                            <Bar dataKey="categories.FixedIncome" name="Fixed Income" stackId="a" fill="#10b981" />
                            <Bar dataKey="categories.Crypto" name="Crypto" stackId="a" fill="#f59e0b" />
                            <Bar dataKey="categories.Debt" name="Debt" stackId="a" fill="#ec4899" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ROI History Line Chart */}
            <div className="glass-card">
                <h3 style={{ marginBottom: '20px', color: 'var(--fg-primary)' }}>Portfolio ROI History (%)</h3>
                <div style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={displayData.filter(d => d.roi !== null)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis
                                dataKey="month"
                                stroke="var(--fg-secondary)"
                                tick={{ fill: 'var(--fg-secondary)', fontSize: 12 }}
                                tickFormatter={(val) => val.replace(' (Live)', '')}
                                minTickGap={30}
                            />
                            <YAxis
                                stroke="var(--fg-secondary)"
                                tick={{ fill: 'var(--fg-secondary)', fontSize: 12 }}
                                tickFormatter={(val) => `${val}%`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Line
                                type="monotone"
                                dataKey="roi"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={{ r: 0 }}
                                activeDot={{ r: 4 }}
                                name="ROI"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Implied FX Rate Chart */}
            <div className="glass-card">
                <h3 style={{ marginBottom: '20px', color: 'var(--fg-primary)' }}>Implied GBP/BRL FX Rate</h3>
                <div style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={displayData.filter(d => d.impliedRate !== null && d.impliedRate > 0)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis
                                dataKey="month"
                                stroke="var(--fg-secondary)"
                                tick={{ fill: 'var(--fg-secondary)', fontSize: 12 }}
                                tickFormatter={(val) => val.replace(' (Live)', '')}
                                minTickGap={30}
                            />
                            <YAxis
                                stroke="var(--fg-secondary)"
                                tick={{ fill: 'var(--fg-secondary)', fontSize: 12 }}
                                tickFormatter={(val) => `R$${val.toFixed(2)}`}
                                domain={['auto', 'auto']}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Line
                                type="monotone"
                                dataKey="impliedRate"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                dot={{ r: 0 }}
                                activeDot={{ r: 4 }}
                                name="FX Rate"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
