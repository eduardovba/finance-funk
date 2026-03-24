"use client";

import React from 'react';

export default function GrowthWaterfall({ startingCapital = 0, totalDeposits = 0, compoundGrowth = 0, projectedTotal = 0, formatValue }: any) {
    const defaultFormat = (val: number) => {
        if (Math.abs(val) >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`;
        if (Math.abs(val) >= 1000) return `R$ ${(val / 1000).toFixed(0)}k`;
        return `R$ ${val.toFixed(0)}`;
    };
    const fmt = formatValue || defaultFormat;

    // Waterfall segments: each bar starts where the previous one ended
    const segments = [
        { label: 'Starting Capital', value: startingCapital, cumStart: 0, cumEnd: startingCapital, color: '#D4AF37' },
        { label: 'Total Deposits', value: totalDeposits, cumStart: startingCapital, cumEnd: startingCapital + totalDeposits, color: '#CC5500' },
        { label: 'Compound Growth', value: compoundGrowth, cumStart: startingCapital + totalDeposits, cumEnd: startingCapital + totalDeposits + compoundGrowth, color: '#34D399' },
    ];

    const maxVal = Math.max(projectedTotal, 1);
    const barHeight = 32;
    const gapY = 16;
    const labelHeight = 16;
    const rowHeight = labelHeight + barHeight + gapY;
    const totalRowHeight = rowHeight * (segments.length + 1); // +1 for total bar
    const chartPadding = 8;

    return (
        <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-5 h-full">
            <h4 className="font-bebas text-lg tracking-widest text-[#D4AF37] mb-4">Growth Breakdown</h4>

            <div className="relative" style={{ height: totalRowHeight + chartPadding }}>
                {segments.map((seg: any, i: number) => {
                    const leftPct = (seg.cumStart / maxVal) * 100;
                    const widthPct = Math.max(1, (seg.value / maxVal) * 100);
                    const topY = i * rowHeight;

                    return (
                        <div key={i} className="absolute left-0 right-0" style={{ top: topY }}>
                            {/* Label row */}
                            <div className="flex justify-between items-center mb-1" style={{ height: labelHeight }}>
                                <span className="font-space  text-data-xs text-white/50 uppercase tracking-widest">{seg.label}</span>
                                <span className="font-space  text-data-xs text-white/70">{fmt(seg.value)}</span>
                            </div>
                            {/* Waterfall bar */}
                            <div className="relative w-full" style={{ height: barHeight }}>
                                {/* Ghost connector line from previous segment */}
                                {i > 0 && (
                                    <div
                                        className="absolute top-0 h-full border-l border-dashed border-white/10"
                                        style={{ left: `${leftPct}%` }}
                                    />
                                )}
                                {/* Bar */}
                                <div
                                    className="absolute rounded-lg transition-all duration-1000 ease-out"
                                    style={{
                                        left: `${leftPct}%`,
                                        width: `${widthPct}%`,
                                        height: barHeight,
                                        background: `linear-gradient(90deg, ${seg.color}90, ${seg.color})`,
                                        boxShadow: `0 0 16px ${seg.color}30`,
                                        border: `1px solid ${seg.color}40`
                                    }}
                                />
                                {/* Connector line down to next segment */}
                                {i < segments.length - 1 && (
                                    <div
                                        className="absolute border-l border-dashed border-white/15"
                                        style={{
                                            left: `${(seg.cumEnd / maxVal) * 100}%`,
                                            top: barHeight,
                                            height: labelHeight + gapY
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Total bar — full width */}
                <div className="absolute left-0 right-0" style={{ top: segments.length * rowHeight }}>
                    <div className="flex justify-between items-center mb-1" style={{ height: labelHeight }}>
                        <span className="font-space  text-data-xs text-white/60 uppercase tracking-widest">= Projected Total</span>
                        <span className="font-bebas text-xl tracking-wider text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.3)]">
                            {fmt(projectedTotal)}
                        </span>
                    </div>
                    <div className="relative w-full" style={{ height: barHeight }}>
                        <div
                            className="absolute rounded-lg transition-all duration-1000 ease-out"
                            style={{
                                left: 0,
                                width: '100%',
                                height: barHeight,
                                background: 'linear-gradient(90deg, #D4AF3720, #D4AF3750)',
                                border: '1px solid #D4AF3730'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Compound ratio */}
            {projectedTotal > 0 && compoundGrowth > 0 && (
                <div className="mt-3 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
                    <span className="font-space  text-data-xs text-[#34D399]/70">
                        {((compoundGrowth / projectedTotal) * 100).toFixed(0)}% of your projected wealth comes from compound growth
                    </span>
                </div>
            )}
        </div>
    );
}
