import React from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/currency';
import { TrendingUp, Building2, Landmark, Bitcoin, PiggyBank, CreditCard } from 'lucide-react';

// Compact tooltip for sparkline hover
function MiniSparklineTooltip({ active, payload, color, currency }) {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
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

export default function GlowingInvestmentPods({ data, historicalData = [], currency = 'GBP' }) {
    if (!data) return null;

    const pods = [
        {
            id: 'equity',
            title: 'EQUITY',
            amount: data.equity || 0,
            diff: data.equityDiff || 0,
            diffPct: data.equityDiffPct || 0,
            color: '#3b82f6',
            icon: TrendingUp,
            history: historicalData.map(d => ({ value: d.equity || 0, month: d.month }))
        },
        {
            id: 'fixedIncome',
            title: 'FIXED INCOME',
            amount: data.fixedIncome || 0,
            diff: data.fixedIncomeDiff || 0,
            diffPct: data.fixedIncomeDiffPct || 0,
            color: '#10b981',
            icon: Landmark,
            history: historicalData.map(d => ({ value: d.fixedIncome || 0, month: d.month }))
        },
        {
            id: 'realEstate',
            title: 'REAL ESTATE',
            amount: data.realEstate || 0,
            diff: data.realEstateDiff || 0,
            diffPct: data.realEstateDiffPct || 0,
            color: '#ef4444',
            icon: Building2,
            history: historicalData.map(d => ({ value: d.realEstate || 0, month: d.month }))
        },
        {
            id: 'pensions',
            title: 'PENSIONS',
            amount: data.pensions || 0,
            diff: data.pensionsDiff || 0,
            diffPct: data.pensionsDiffPct || 0,
            color: '#8b5cf6',
            icon: PiggyBank,
            history: historicalData.map(d => ({ value: d.pensions || 0, month: d.month }))
        },
        {
            id: 'crypto',
            title: 'CRYPTO',
            amount: data.crypto || 0,
            diff: data.cryptoDiff || 0,
            diffPct: data.cryptoDiffPct || 0,
            color: '#f59e0b',
            icon: Bitcoin,
            history: historicalData.map(d => ({ value: d.crypto || 0, month: d.month }))
        },
        {
            id: 'debt',
            title: 'DEBT REPAYMENT',
            amount: data.debt || 0,
            diff: data.debtDiff || 0,
            diffPct: data.debtDiffPct || 0,
            color: '#ec4899',
            icon: CreditCard,
            history: historicalData.map(d => ({ value: d.debt || 0, month: d.month }))
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 w-full mb-8">
            {pods.map((pod, idx) => {
                const Icon = pod.icon;
                const isPositive = pod.diff >= 0;

                return (
                    <motion.div
                        key={pod.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08, duration: 0.4, ease: "easeOut" }}
                        className="relative rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] flex flex-col group"
                        style={{ minHeight: '160px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
                    >
                        {/* Top Content */}
                        <div className="px-4 pt-4 pointer-events-none relative z-10" style={{ flex: '0 0 auto' }}>
                            <div className="flex items-start justify-between mb-1.5">
                                {/* Icon */}
                                <div
                                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                                    style={{
                                        border: `1px solid ${pod.color}40`,
                                        background: `${pod.color}10`,
                                        boxShadow: `0 0 12px ${pod.color}30, inset 0 0 8px ${pod.color}20`
                                    }}
                                >
                                    <Icon size={14} color={pod.color} style={{ filter: `drop-shadow(0 0 4px ${pod.color}80)` }} />
                                </div>

                                {/* MoM Difference */}
                                <div className="flex flex-col items-end gap-0.5">
                                    <span className={`text-[0.6875rem] font-medium px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 ${isPositive ? 'bg-vu-green/10 text-vu-green' : 'bg-red-500/10 text-red-400'}`}>
                                        <span>{isPositive ? '+' : ''}{pod.diffPct.toFixed(1)}%</span>
                                        <span className="text-[0.6875rem] opacity-70">MoM</span>
                                    </span>
                                    <span className="text-[0.6875rem] font-mono tabular-nums text-parchment/40">
                                        {isPositive ? '+' : ''}{formatCurrency(pod.diff, currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </span>
                                </div>
                            </div>

                            <h3 className="text-[0.6875rem] uppercase tracking-widest text-[#F5F5DC]/50 font-space mb-0.5">
                                {pod.title}
                            </h3>
                            <p className="text-xl font-bold text-white tracking-tight drop-shadow-md truncate mb-0">
                                {formatCurrency(pod.amount, currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                        </div>

                        {/* Edge-to-edge Mini Chart */}
                        <div className="w-full flex-1 min-h-[45px] relative z-20 rounded-b-2xl">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={pod.history} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id={`inv-gradient-${pod.id}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={pod.color} stopOpacity={0.3} />
                                            <stop offset="100%" stopColor={pod.color} stopOpacity={0.0} />
                                        </linearGradient>
                                        <filter id={`inv-glow-${pod.id}`} x="-20%" y="-20%" width="140%" height="140%">
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
                                        fill={`url(#inv-gradient-${pod.id})`}
                                        isAnimationActive={true}
                                        animationDuration={1500}
                                        style={{ filter: `url(#inv-glow-${pod.id})` }}
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
