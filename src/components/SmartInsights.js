"use client";

import React, { useMemo } from 'react';
import { calculatePMT, getMonthDiff, parseDate } from '@/lib/forecastUtils';
import { Lightbulb, TrendingUp, Clock, Zap } from 'lucide-react';

export default function SmartInsights({
    currentValue = 0,
    goalValue = 10000000,
    goalYear = 2031,
    monthlyContribution = 12000,
    annualInterestRate = 10,
    projectedFinalValue = 0,
    totalDeposits = 0,
    compoundGrowth = 0,
    trailingYield = null, // trailing 12-month actual yield if available
    isLocked = false
}) {
    const insights = useMemo(() => {
        const items = [];
        const now = new Date();
        const goalDate = new Date(goalYear, 11, 1);
        const monthsToGoal = getMonthDiff(now, goalDate);
        const rate = annualInterestRate / 100 / 12;

        // 1. Pace check: when will we hit goal at current pace?
        if (projectedFinalValue > 0 && goalValue > 0) {
            if (projectedFinalValue >= goalValue) {
                // We overshoot — figure out how many months early
                // Binary search for the month we hit the goal
                let earlyMonths = 0;
                for (let m = 1; m <= monthsToGoal; m++) {
                    let acc = currentValue;
                    for (let i = 0; i < m; i++) {
                        acc = acc * (1 + rate) + monthlyContribution;
                    }
                    if (acc >= goalValue) {
                        earlyMonths = monthsToGoal - m;
                        break;
                    }
                }
                if (earlyMonths > 0) {
                    items.push({
                        icon: TrendingUp,
                        color: '#34D399',
                        text: `At your current pace, you'll hit your goal **${earlyMonths} months early** (${new Date(goalDate.getTime() - earlyMonths * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}).`
                    });
                } else {
                    items.push({
                        icon: TrendingUp,
                        color: '#34D399',
                        text: `You're projected to hit your goal right on schedule.`
                    });
                }
            } else {
                const shortfall = goalValue - projectedFinalValue;
                const additionalPMT = monthsToGoal > 0 ? Math.ceil(shortfall / monthsToGoal / 100) * 100 : 0;
                items.push({
                    icon: TrendingUp,
                    color: '#f59e0b',
                    text: `At your current projection, you'll fall short by **${formatCompact(shortfall)}**. Increasing contributions by **${formatCompact(additionalPMT)}/mo** could close the gap.`
                });
            }
        }

        // 2. Sensitivity: what would +2k/mo do?
        if (monthsToGoal > 0 && currentValue > 0) {
            const boost = 2000;
            let accBase = currentValue;
            let accBoosted = currentValue;
            let baseHitMonth = null;
            let boostedHitMonth = null;

            for (let m = 1; m <= monthsToGoal + 60; m++) {
                accBase = accBase * (1 + rate) + monthlyContribution;
                accBoosted = accBoosted * (1 + rate) + (monthlyContribution + boost);
                if (accBase >= goalValue && baseHitMonth === null) baseHitMonth = m;
                if (accBoosted >= goalValue && boostedHitMonth === null) boostedHitMonth = m;
                if (baseHitMonth && boostedHitMonth) break;
            }

            if (baseHitMonth && boostedHitMonth && baseHitMonth > boostedHitMonth) {
                const savedMonths = baseHitMonth - boostedHitMonth;
                items.push({
                    icon: Zap,
                    color: '#D4AF37',
                    text: `Increasing contributions by **R$${(boost / 1000).toFixed(0)}k/mo** would accelerate your goal by **${savedMonths} months**.`
                });
            }
        }

        // 3. Trailing yield vs assumed
        if (trailingYield !== null && trailingYield !== undefined) {
            const diff = trailingYield - annualInterestRate;
            if (Math.abs(diff) > 0.5) {
                items.push({
                    icon: Clock,
                    color: diff > 0 ? '#34D399' : '#ef4444',
                    text: `Your trailing 12-month yield is **${trailingYield.toFixed(1)}%**, ${diff > 0 ? 'above' : 'below'} your **${annualInterestRate}%** assumption.`
                });
            }
        }

        // 4. Compound ratio
        if (projectedFinalValue > 0 && compoundGrowth > 0) {
            const pct = ((compoundGrowth / projectedFinalValue) * 100).toFixed(0);
            items.push({
                icon: Lightbulb,
                color: '#a78bfa',
                text: `Compound growth accounts for **${pct}%** of your projected portfolio value.`
            });
        }

        return items;
    }, [currentValue, goalValue, goalYear, monthlyContribution, annualInterestRate, projectedFinalValue, totalDeposits, compoundGrowth, trailingYield]);

    // Render markdown-like bold text
    const renderText = (text) => {
        const parts = text.split(/\*\*(.*?)\*\*/g);
        return parts.map((part, i) =>
            i % 2 === 1
                ? <strong key={i} className="text-white/90">{part}</strong>
                : <span key={i}>{part}</span>
        );
    };

    return (
        <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-5 h-full">
            <h4 className="font-bebas text-lg tracking-widest text-[#D4AF37] mb-4 flex items-center gap-2">
                <Lightbulb size={16} className="text-[#D4AF37]" />
                Smart Insights
            </h4>

            {insights.length === 0 ? (
                <p className="font-mono tabular-nums text-xs text-white/30 italic">Not enough data to generate insights.</p>
            ) : (
                <div className="space-y-4">
                    {insights.map((insight, i) => (
                        <div key={i} className="flex gap-3 items-start group">
                            <div className="mt-0.5 p-1 rounded bg-white/5 group-hover:bg-white/10 transition-colors shrink-0">
                                <insight.icon size={14} style={{ color: insight.color }} />
                            </div>
                            <p className="font-mono tabular-nums text-xs text-white/60 leading-relaxed">
                                {renderText(insight.text)}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function formatCompact(val) {
    if (Math.abs(val) >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`;
    if (Math.abs(val) >= 1000) return `R$ ${(val / 1000).toFixed(0)}k`;
    return `R$ ${val.toFixed(0)}`;
}
