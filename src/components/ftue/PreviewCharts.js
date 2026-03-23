"use client";

import React from 'react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

/* ═══ Demo Data ═══ */
const SPENDING_DATA = [
    { month: 'Sep', amount: 3800 },
    { month: 'Oct', amount: 4100 },
    { month: 'Nov', amount: 3650 },
    { month: 'Dec', amount: 5200 },
    { month: 'Jan', amount: 4400 },
    { month: 'Feb', amount: 3900 },
    { month: 'Mar', amount: 4230 },
];

const NET_WORTH_DATA = [
    { month: 'Sep', value: 42000 },
    { month: 'Oct', value: 43500 },
    { month: 'Nov', value: 44200 },
    { month: 'Dec', value: 46800 },
    { month: 'Jan', value: 48100 },
    { month: 'Feb', value: 50900 },
    { month: 'Mar', value: 52870 },
];

const ALLOCATION_DATA = [
    { name: 'Equity', value: 38, color: '#D4AF37' },
    { name: 'Crypto', value: 18, color: '#CC5500' },
    { name: 'Fixed Inc.', value: 22, color: '#10B981' },
    { name: 'Real Estate', value: 15, color: '#8B5CF6' },
    { name: 'Other', value: 7, color: '#F5F5DC' },
];

const CATEGORY_DATA = [
    { name: 'Housing', amount: 2100 },
    { name: 'Food', amount: 980 },
    { name: 'Transport', amount: 420 },
    { name: 'Entertain.', amount: 380 },
    { name: 'Utilities', amount: 250 },
    { name: 'Other', amount: 100 },
];

/* ═══ Shared Tooltip ═══ */
function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: '#1A0F2E', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 8,
            padding: '6px 10px', fontSize: '0.7rem', fontFamily: 'var(--font-space)', color: '#F5F5DC',
        }}>
            <div style={{ color: 'rgba(245,245,220,0.5)', marginBottom: 2 }}>{label}</div>
            <div style={{ color: '#D4AF37', fontWeight: 600 }}>
                {typeof payload[0].value === 'number' ? payload[0].value.toLocaleString() : payload[0].value}
            </div>
        </div>
    );
}

/* ═══ Spending Bar Chart ═══ */
export function SpendingBarPreview({ height = 120 }) {
    return (
        <div style={{ width: '100%', height }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={SPENDING_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,245,220,0.06)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: 'rgba(245,245,220,0.3)', fontSize: 10, fontFamily: 'var(--font-space)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={false} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(212,175,55,0.08)' }} />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={24}>
                        {SPENDING_DATA.map((entry, i) => (
                            <Cell key={i} fill={i === SPENDING_DATA.length - 1 ? '#D4AF37' : 'rgba(212,175,55,0.25)'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ═══ Net Worth Area Chart ═══ */
export function NetWorthAreaPreview({ height = 120 }) {
    return (
        <div style={{ width: '100%', height }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={NET_WORTH_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#CC5500" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#CC5500" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,245,220,0.06)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: 'rgba(245,245,220,0.3)', fontSize: 10, fontFamily: 'var(--font-space)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={false} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(204,85,0,0.3)' }} />
                    <Area type="monotone" dataKey="value" stroke="#CC5500" strokeWidth={2} fill="url(#nwGrad)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ═══ Allocation Donut ═══ */
export function AllocationDonutPreview({ size = 100 }) {
    return (
        <div style={{ width: size, height: size, margin: '0 auto' }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={ALLOCATION_DATA}
                        dataKey="value"
                        innerRadius="55%"
                        outerRadius="90%"
                        paddingAngle={3}
                        stroke="none"
                    >
                        {ALLOCATION_DATA.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        return (
                            <div style={{
                                background: '#1A0F2E', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 8,
                                padding: '4px 8px', fontSize: '0.65rem', fontFamily: 'var(--font-space)', color: '#F5F5DC',
                            }}>
                                {payload[0].name}: {payload[0].value}%
                            </div>
                        );
                    }} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ═══ Category Horizontal Bars ═══ */
export function CategoryBarsPreview() {
    const max = Math.max(...CATEGORY_DATA.map(d => d.amount));
    const colors = ['#10B981', '#D4AF37', '#CC5500', '#8B5CF6', '#6366F1', '#F5F5DC'];
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {CATEGORY_DATA.map((cat, i) => (
                <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                        width: 64, fontSize: '0.65rem', color: 'rgba(245,245,220,0.5)',
                        fontFamily: 'var(--font-space)', textAlign: 'right', flexShrink: 0,
                    }}>{cat.name}</span>
                    <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                            width: `${(cat.amount / max) * 100}%`, height: '100%',
                            background: colors[i % colors.length], borderRadius: 4,
                            transition: 'width 0.8s ease',
                        }} />
                    </div>
                    <span style={{
                        width: 36, fontSize: '0.6rem', color: 'rgba(245,245,220,0.3)',
                        fontFamily: 'var(--font-space)', textAlign: 'right',
                    }}>{cat.amount}</span>
                </div>
            ))}
        </div>
    );
}

/* ═══ Combined Preview for Login Page ═══ */
export function DashboardPreviewPanel() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Two-column: Spending + Net Worth charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(245,245,220,0.4)', fontFamily: 'var(--font-space)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
                        Monthly Spending
                    </div>
                    <SpendingBarPreview height={100} />
                </div>
                <div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(245,245,220,0.4)', fontFamily: 'var(--font-space)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
                        Portfolio Growth
                    </div>
                    <NetWorthAreaPreview height={100} />
                </div>
            </div>
            {/* Bottom row: Donut + Category bars */}
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 12, alignItems: 'center' }}>
                <AllocationDonutPreview size={80} />
                <CategoryBarsPreview />
            </div>
        </div>
    );
}
