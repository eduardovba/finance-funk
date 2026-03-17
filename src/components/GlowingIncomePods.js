import React from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/currency';
import { Briefcase, Building2, TrendingUp, Wallet } from 'lucide-react';

// Compact tooltip for sparkline hover
function MiniSparklineTooltip({ active, payload, color, currency }) {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    // Format month label: "2025-03" -> "Mar 25"
    const monthLabel = data.month ? (() => {
        const [y, m] = data.month.split('-');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`;
    })() : '';
    return (
        <div style={{
            background: 'rgba(18, 20, 24, 0.95)',
            border: `1px solid ${color}40`,
            borderRadius: '8px',
            padding: '6px 10px',
            boxShadow: `0 4px 12px rgba(0,0,0,0.4), 0 0 8px ${color}20`,
            backdropFilter: 'blur(8px)',
        }}>
            <div style={{ fontSize: '9px', color: 'rgba(245,245,220,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>
                {monthLabel}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: color }}>
                {formatCurrency(data.value, currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
        </div>
    );
}

export default function GlowingIncomePods({ data, historicalData = [], currency = 'BRL' }) {
    if (!data) return null;

    // Convert historical data to specific arrays for recharts
    const salaryHistory = historicalData.map(d => ({ value: d.salary || 0, month: d.month }));
    const realEstateHistory = historicalData.map(d => ({ value: d.realEstate || 0, month: d.month }));
    const equityHistory = historicalData.map(d => ({ value: d.equity || 0, month: d.month }));
    const interestHistory = historicalData.map(d => ({ value: d.fixedIncome || 0, month: d.month }));

    const pods = [
        {
            id: 'salary',
            title: 'TOTAL SALARY',
            amount: data.salary || 0,
            diff: data.salaryDiff || 0,
            diffPct: data.salaryDiffPct || 0,
            color: '#3b82f6',
            icon: Briefcase,
            history: salaryHistory
        },
        {
            id: 'realEstate',
            title: 'REAL ESTATE INCOME',
            amount: data.realEstate || 0,
            diff: data.realEstateDiff || 0,
            diffPct: data.realEstateDiffPct || 0,
            color: '#10b981',
            icon: Building2,
            history: realEstateHistory
        },
        {
            id: 'equity',
            title: 'EQUITY DIVIDENDS',
            amount: data.equity || 0,
            diff: data.equityDiff || 0,
            diffPct: data.equityDiffPct || 0,
            color: '#a855f7',
            icon: TrendingUp,
            history: equityHistory
        },
        {
            id: 'interest',
            title: 'INTEREST EARNED',
            amount: data.fixedIncome || 0,
            diff: data.fixedIncomeDiff || 0,
            diffPct: data.fixedIncomeDiffPct || 0,
            color: '#f59e0b',
            icon: Wallet,
            history: interestHistory
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full mb-8">
            {pods.map((pod, idx) => {
                const Icon = pod.icon;
                const isPositive = pod.diff >= 0;

                return (
                    <motion.div
                        key={pod.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1, duration: 0.4, ease: "easeOut" }}
                        className="relative rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] flex flex-col group"
                        style={{ minHeight: '180px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
                    >
                        {/* Top Content — pointer-events-none so chart underneath receives hover */}
                        <div className="px-5 pt-5 pointer-events-none relative z-10" style={{ flex: '0 0 auto' }}>
                            {/* Row: Icon left, MoM right */}
                            <div className="flex items-start justify-between mb-2">
                                {/* Icon */}
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                    style={{
                                        border: `1px solid ${pod.color}40`,
                                        background: `${pod.color}10`,
                                        boxShadow: `0 0 12px ${pod.color}30, inset 0 0 8px ${pod.color}20`
                                    }}
                                >
                                    <Icon size={16} color={pod.color} style={{ filter: `drop-shadow(0 0 4px ${pod.color}80)` }} />
                                </div>

                                {/* MoM Difference — top right */}
                                <div className="flex flex-col items-end gap-0.5">
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 ${isPositive ? 'bg-vu-green/10 text-vu-green' : 'bg-red-500/10 text-red-400'}`}>
                                        <span>{isPositive ? '+' : ''}{pod.diffPct.toFixed(1)}%</span>
                                        <span className="text-[8px] opacity-70">MoM</span>
                                    </span>
                                    <span className="text-[9px] font-mono text-parchment/40">
                                        {isPositive ? '+' : ''}{formatCurrency(pod.diff, currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </span>
                                </div>
                            </div>

                            <h3 className="text-[10px] uppercase tracking-widest text-[#F5F5DC]/50 font-space mb-1">
                                {pod.title}
                            </h3>
                            <p className="text-2xl font-bold text-white tracking-tight drop-shadow-md truncate mb-0">
                                {formatCurrency(pod.amount, currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                        </div>

                        {/* Edge-to-edge Mini Chart — fills bottom, receives pointer events for tooltip */}
                        <div className="w-full flex-1 min-h-[55px] relative z-20 rounded-b-2xl">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={pod.history} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id={`gradient-${pod.id}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={pod.color} stopOpacity={0.3} />
                                            <stop offset="100%" stopColor={pod.color} stopOpacity={0.0} />
                                        </linearGradient>
                                        <filter id={`glow-${pod.id}`} x="-20%" y="-20%" width="140%" height="140%">
                                            <feGaussianBlur stdDeviation="2" result="blur" />
                                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                        </filter>
                                    </defs>
                                    <YAxis hide domain={['dataMin', 'dataMax']} />
                                    <Tooltip
                                        content={<MiniSparklineTooltip color={pod.color} currency={currency} />}
                                        cursor={false}
                                        wrapperStyle={{ zIndex: 100 }}
                                        allowEscapeViewBox={{ x: true, y: true }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke={pod.color}
                                        strokeWidth={2}
                                        fill={`url(#gradient-${pod.id})`}
                                        isAnimationActive={true}
                                        animationDuration={1500}
                                        style={{ filter: `url(#glow-${pod.id})` }}
                                        activeDot={{
                                            r: 4,
                                            fill: pod.color,
                                            stroke: '#121418',
                                            strokeWidth: 2,
                                            style: { filter: `drop-shadow(0 0 6px ${pod.color})` }
                                        }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
