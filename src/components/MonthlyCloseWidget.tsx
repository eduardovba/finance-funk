'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface MonthlyCloseData {
    month: string;
    completed: number;
    total: number;
}

function formatMonthLabel(month: string): string {
    const [year, mon] = month.split('-').map(Number);
    const date = new Date(year, mon - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
}

/**
 * Returns true if today is within 2 days before the end of the month
 * (i.e. the last 2 days of the month, or the first 5 of next month
 * for closing the previous month).
 */
function isWithinCloseWindow(): boolean {
    const now = new Date();
    const day = now.getDate();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    // Last 2 days of the month OR first 5 days of next month
    return day >= lastDay - 1 || day <= 5;
}

export default function MonthlyCloseWidget({
    onOpenChecklist,
}: {
    onOpenChecklist: () => void;
}) {
    const [data, setData] = useState<MonthlyCloseData | null>(null);
    const [isDismissed, setIsDismissed] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch('/api/monthly-close');
            if (res.ok) {
                const json = await res.json();
                setData({ month: json.month, completed: json.completed, total: json.total });
            }
        } catch (e) {
            console.error('Failed to fetch monthly close tasks:', e);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Don't show if: not in close window, dismissed, no data, all complete, or no tasks
    if (!isWithinCloseWindow()) return null;
    if (isDismissed) return null;
    if (!data || data.total === 0) return null;
    if (data.completed >= data.total) return null;

    const progressPct = data.total > 0 ? (data.completed / data.total) * 100 : 0;

    return (
        <div className="w-full mb-4 relative" id="monthly-close-widget">
            {/* Dismiss button */}
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsDismissed(true); }}
                className="absolute top-2 right-2 md:top-3 md:right-3 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
                style={{ color: 'rgba(245, 245, 220, 0.3)', fontSize: '0.65rem' }}
                title="Dismiss notification"
            >
                ✕
            </button>

            <button
                type="button"
                onClick={onOpenChecklist}
                className="w-full group cursor-pointer text-left"
            >
                {/* Desktop: Full card */}
                <div
                    className="hidden md:flex items-center justify-between gap-6 rounded-2xl px-6 py-4 transition-all duration-300 hover:border-[#D4AF37]/40"
                    style={{
                        background: 'rgba(26, 15, 46, 0.6)',
                        border: '1px solid rgba(212, 175, 55, 0.2)',
                        backdropFilter: 'blur(12px)',
                    }}
                >
                    <div className="flex items-center gap-4 min-w-0">
                        <span className="text-xl shrink-0">📋</span>
                        <div className="min-w-0">
                            <h3
                                className="text-sm tracking-[2px] truncate"
                                style={{
                                    fontFamily: 'var(--font-bebas)',
                                    color: '#D4AF37',
                                }}
                            >
                                MONTHLY CLOSE: {formatMonthLabel(data.month)}
                            </h3>
                            <p
                                className="text-xs mt-0.5"
                                style={{
                                    fontFamily: 'var(--font-space)',
                                    color: '#F5F5DC',
                                    opacity: 0.7,
                                }}
                            >
                                {data.completed} of {data.total} tasks complete
                            </p>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-4 shrink-0">
                        <div
                            className="w-40 h-2 rounded-full overflow-hidden"
                            style={{ background: 'rgba(212, 175, 55, 0.1)' }}
                        >
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                    width: `${progressPct}%`,
                                    background: 'linear-gradient(135deg, #CC5500, #D4AF37)',
                                }}
                            />
                        </div>
                        <span
                            className="text-xs tracking-wider group-hover:translate-x-0.5 transition-transform"
                            style={{ color: '#D4AF37', fontFamily: 'var(--font-space)' }}
                        >
                            Open Checklist →
                        </span>
                    </div>
                </div>

                {/* Mobile: Compact banner */}
                <div
                    className="flex md:hidden items-center justify-between gap-3 rounded-xl px-4 py-3 transition-all duration-300"
                    style={{
                        background: 'rgba(26, 15, 46, 0.6)',
                        border: '1px solid rgba(212, 175, 55, 0.2)',
                        backdropFilter: 'blur(12px)',
                    }}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="text-base shrink-0">📋</span>
                        <span
                            className="text-xs tracking-[1.5px] truncate"
                            style={{
                                fontFamily: 'var(--font-bebas)',
                                color: '#D4AF37',
                            }}
                        >
                            {formatMonthLabel(data.month).split(' ')[0]} CLOSE
                        </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                                background: 'rgba(212, 175, 55, 0.15)',
                                color: '#D4AF37',
                                fontFamily: 'var(--font-space)',
                            }}
                        >
                            {data.completed}/{data.total}
                        </span>
                        <span style={{ color: '#D4AF37', fontSize: '0.75rem' }}>›</span>
                    </div>
                </div>
            </button>
        </div>
    );
}
