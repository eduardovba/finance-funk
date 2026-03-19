import React from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LabelList, Legend } from 'recharts';
import { formatCurrency } from '@/lib/currency';
import type { ForecastDataPoint, ForecastPhase } from './types';

interface ForecastChartProps {
    forecastData: ForecastDataPoint[];
    forecastPhases: ForecastPhase[];
    target2031: number;
    secondaryCurrency: string;
    secondaryPrefix: string;
    formatK: (val: number, currency?: string) => string;
}

// Custom tooltip
const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#121418]/90 border border-white/[0.06] rounded-lg p-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl font-mono tabular-nums text-xs">
            <p className="text-[#D4AF37] font-bold mb-1.5">{label}</p>
            {payload.filter((e: any) => e.value != null).map((entry: any, i: number) => {
                const isGbp = entry.dataKey?.toLowerCase().includes('gbp');
                return (
                    <div key={i} className="flex items-center gap-2 mb-0.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.stroke }} />
                        <span className="text-white/60">{entry.name}:</span>
                        <span className="text-white/90">{formatCurrency(entry.value, isGbp ? 'GBP' : 'BRL')}</span>
                    </div>
                );
            })}
        </div>
    );
};

export default function ForecastChart({ forecastData, forecastPhases, target2031, secondaryCurrency, secondaryPrefix, formatK }: ForecastChartProps) {
    return (
        <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-4 lg:p-6">
            <h3 className="font-bebas text-xl tracking-widest text-[#D4AF37] m-0 mb-5">Wealth Trajectory</h3>
            <div style={{ width: '100%', height: '420px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={forecastData} margin={{ top: 10, right: 60, left: 20, bottom: 10 }}>
                        <defs>
                            <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#34D399" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#34D399" stopOpacity={0.1} />
                                <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={11} fontFamily="var(--font-space)" tickMargin={10} interval={11} axisLine={{ stroke: 'rgba(212,175,55,0.1)' }} />
                        <YAxis yAxisId="left" stroke="rgba(255,255,255,0.3)" fontSize={11} fontFamily="Space Mono, monospace" tickFormatter={(val) => `R$${(val / 1000000).toFixed(1)}M`} axisLine={{ stroke: 'rgba(212,175,55,0.1)' }} />
                        <YAxis yAxisId="right" orientation="right" stroke="rgba(168,85,247,0.4)" fontSize={11} fontFamily="Space Mono, monospace" tickFormatter={(val) => `${secondaryPrefix}${(val / 1000).toFixed(0)}k`} axisLine={{ stroke: 'rgba(168,85,247,0.1)' }} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '11px', fontFamily: 'var(--font-space)' }} />

                        <ReferenceLine yAxisId="left" y={target2031} stroke="#D4AF37" strokeOpacity={0.3} strokeDasharray="6 4" label={{ value: `Goal ${formatK(target2031, 'BRL')}`, position: 'right', fill: '#D4AF37', fontSize: 11, fontFamily: 'var(--font-space)' }} />

                        {forecastPhases.filter((p, i) => i > 0 && p.startMonth).map((phase, i) => (
                            <ReferenceLine
                                key={`phase-${phase.id}`}
                                yAxisId="left"
                                x={phase.startMonth!}
                                stroke="#D4AF37"
                                strokeOpacity={0.35}
                                strokeDasharray="4 4"
                                label={{
                                    value: `P${i + 2}: ${formatK(phase.contribution, 'BRL')}/mo · ${phase.yield}%`,
                                    position: 'insideTopRight',
                                    fill: '#D4AF37',
                                    fontSize: 9,
                                    fontFamily: 'var(--font-space)',
                                    opacity: 0.7
                                }}
                            />
                        ))}

                        <Line yAxisId="left" type="monotone" dataKey="targetBrl" name="Target Trajectory" stroke="rgba(255,255,255,0.35)" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls />
                        <Area yAxisId="left" type="monotone" dataKey="actual" name="Actual (BRL)" stroke="#34D399" strokeWidth={2.5} fill="url(#actualGradient)" dot={false} connectNulls />
                        <Area yAxisId="left" type="monotone" dataKey="forecast" name="Forecast (BRL)" stroke="#34D399" strokeWidth={2} strokeDasharray="5 5" fill="url(#forecastGradient)" dot={false} connectNulls>
                            <LabelList
                                dataKey="forecast"
                                position="top"
                                content={({ x, y, value, index }: any) => {
                                    if (index === forecastData.length - 1) {
                                        return (
                                            <text x={x} y={y} dy={-12} fill="#34D399" fontSize={11} fontWeight="bold" textAnchor="middle" fontFamily="var(--font-space)">
                                                {formatK(value, 'BRL')}
                                            </text>
                                        );
                                    }
                                    return null;
                                }}
                            />
                        </Area>

                        <Line yAxisId="right" type="monotone" dataKey="actualGbp" name={`Actual (${secondaryCurrency})`} stroke="#a855f7" strokeWidth={2} dot={false} connectNulls />
                        <Line yAxisId="right" type="monotone" dataKey="forecastGbp" name={`Projected (${secondaryCurrency})`} stroke="#a855f7" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls>
                            <LabelList
                                dataKey="forecastGbp"
                                position="top"
                                content={({ x, y, value, index }: any) => {
                                    if (index === forecastData.length - 1) {
                                        return (
                                            <text x={x} y={y} dy={-12} fill="#d8b4fe" fontSize={11} fontWeight="bold" textAnchor="middle" fontFamily="var(--font-space)">
                                                {formatK(value, 'GBP')}
                                            </text>
                                        );
                                    }
                                    return null;
                                }}
                            />
                        </Line>
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
