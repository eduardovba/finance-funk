"use client";

import React, { useEffect, useState } from 'react';

function Ring({ progress, color, radius, strokeWidth, size, animDelay = 0 }) {
    const [animatedProgress, setAnimatedProgress] = useState(0);
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (animatedProgress / 100) * circumference;

    useEffect(() => {
        const timer = setTimeout(() => setAnimatedProgress(progress), 100 + animDelay);
        return () => clearTimeout(timer);
    }, [progress, animDelay]);

    return (
        <g>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
                stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
                stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                className="transition-all duration-[1500ms] ease-out"
                style={{ filter: `drop-shadow(0 0 8px ${color}60)` }} />
        </g>
    );
}

export default function GoalProgressRing({
    currentValue = 0,
    goalValue = 10000000,
    goalYear = 2031,
    startingValue = 0,
    targetValue = null,
    etaMonths = null, // positive = months early, negative = late
    formatValue
}) {
    // Outer ring: ACTUAL as % of goal
    const actualPct = goalValue > 0
        ? Math.min((currentValue / goalValue) * 100, 100) : 0;

    // Inner ring: TARGET as % of goal (grey)
    const targetPct = (targetValue && goalValue > 0)
        ? Math.min((targetValue / goalValue) * 100, 100) : 0;

    // Days remaining
    const now = new Date();
    const goalDate = new Date(goalYear, 11, 31);
    const daysRemaining = Math.max(0, Math.ceil((goalDate - now) / (1000 * 60 * 60 * 24)));

    // SVG sizing
    const size = 180;
    const outerStroke = 10;
    const innerStroke = 6;
    const outerRadius = (size - outerStroke) / 2;
    const innerRadius = outerRadius - outerStroke - 4;

    // Outer (actual) color: green if ahead, gold if close, red if behind
    const diff = targetValue ? (currentValue / targetValue) : 1;
    const actualColor = diff >= 1 ? '#34D399' : diff >= 0.9 ? '#D4AF37' : '#ef4444';

    // Inner (target) color: grey
    const targetColor = 'rgba(255,255,255,0.35)';

    // Status
    const statusLabel = actualPct >= 100 ? 'Goal Reached!' : actualPct >= 75 ? 'Almost There' : actualPct >= 50 ? 'On Track' : actualPct >= 25 ? 'Building' : 'Starting Out';

    // ETA label
    const etaLabel = etaMonths !== null
        ? (etaMonths > 0 ? `+${etaMonths} mo early` : etaMonths < 0 ? `${etaMonths} mo late` : 'On time')
        : null;

    const defaultFormat = (val) => {
        if (Math.abs(val) >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`;
        if (Math.abs(val) >= 1000) return `R$ ${(val / 1000).toFixed(0)}k`;
        return `R$ ${val}`;
    };
    const fmt = formatValue || defaultFormat;

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Dual Ring */}
            <div className="relative shrink-0" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="transform -rotate-90">
                    {/* Outer Ring: ACTUAL value as % of goal */}
                    <Ring progress={actualPct} color={actualColor} radius={outerRadius}
                        strokeWidth={outerStroke} size={size} />
                    {/* Inner Ring: TARGET value as % of goal (grey) */}
                    <Ring progress={targetPct} color={targetColor} radius={innerRadius}
                        strokeWidth={innerStroke} size={size} animDelay={200} />
                </svg>
                {/* Center: actual % to goal */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-bebas text-3xl tracking-wider" style={{ color: actualColor }}>
                        {actualPct.toFixed(0)}%
                    </span>
                    <span className="text-data-xs font-space  text-white/60 font-bold tracking-wide">
                        to {fmt(goalValue)}
                    </span>
                    <span className="text-2xs font-space tabular-nums mt-0.5 text-white/25">
                        {targetPct.toFixed(0)}% target
                    </span>
                </div>
            </div>

            {/* Status & ETA Label */}
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: actualColor }} />
                <span className="font-space  text-data-xs" style={{ color: actualColor }}>{statusLabel}</span>
                {etaLabel && (
                    <>
                        <span className="text-white/20 mx-1">·</span>
                        <span className={`font-space  text-data-xs font-bold ${etaMonths >= 0 ? 'text-[#34D399]' : 'text-[#ef4444]'}`}>
                            {etaLabel}
                        </span>
                    </>
                )}
                <span className="text-white/20 mx-1">·</span>
                <span className="font-space  text-data-xs text-white/40">{daysRemaining.toLocaleString()} days left</span>
            </div>
        </div>
    );
}
