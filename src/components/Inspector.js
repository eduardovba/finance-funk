"use client";

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, RefreshCw, Clock, Camera, CheckCircle2, AlertTriangle,
    LayoutDashboard, Landmark, Home as HomeIcon, LineChart, Bitcoin, Wallet, CreditCard,
    Target, TrendingUp, Scale, DollarSign, ArrowUpDown, BookOpen,
    Upload, User, ChevronDown, Palette
} from 'lucide-react';
import { Button } from '@/components/ui';
import { usePortfolio } from '@/context/PortfolioContext';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

const BACKGROUNDS = [
    { id: 'concrete', name: 'Concrete' },
    { id: 'copper-flow', name: 'Copper Flow' },
    { id: 'copper-rise', name: 'Copper Rise' },
    { id: 'cream-linen', name: 'Cream Linen' },
    { id: 'crystal-large', name: 'Crystal Large' },
    { id: 'crystal-minimal', name: 'Crystal Minimal' },
    { id: 'frosted-glass', name: 'Frosted Glass' },
    { id: 'leather', name: 'Leather' },
    { id: 'linen-detail-large', name: 'Linen Detail Large' },
    { id: 'linen-detail-minimal', name: 'Linen Detail Minimal' },
    { id: 'mosaic-large', name: 'Mosaic Large' },
    { id: 'mosaic-medium', name: 'Mosaic Medium' },
    { id: 'mosaic-minimal', name: 'Mosaic Minimal' },
    { id: 'paper-large', name: 'Paper Large' },
    { id: 'paper-small', name: 'Paper Small' },
    { id: 'walnut', name: 'Walnut' },
];

const NAV_LINKS = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: '#D4AF37' },
    { href: '/assets/fixed-income', label: 'Fixed Income', icon: Landmark, color: '#CC5500' },
    { href: '/assets/real-estate', label: 'Real Estate', icon: HomeIcon, color: '#CC5500' },
    { href: '/assets/equity', label: 'Equity', icon: LineChart, color: '#CC5500' },
    { href: '/assets/crypto', label: 'Crypto', icon: Bitcoin, color: '#CC5500' },
    { href: '/assets/pensions', label: 'Pensions', icon: Wallet, color: '#CC5500' },
    { href: '/assets/debt', label: 'Debt', icon: CreditCard, color: '#CC5500' },
    { href: '/planning/targets', label: 'Allocation', icon: Target, color: '#A78BFA' },
    { href: '/planning/forecast', label: 'Forecast', icon: TrendingUp, color: '#A78BFA' },
    { href: '/planning/advisor', label: 'Advisor', icon: Scale, color: '#A78BFA' },
    { href: '/ledger/income', label: 'Income', icon: DollarSign, color: '#D4AF37' },
    { href: '/ledger/investments', label: 'Investments', icon: ArrowUpDown, color: '#D4AF37' },
    { href: '/ledger/totals', label: 'General Ledger', icon: BookOpen, color: '#D4AF37' },
    { href: '/import', label: 'Import', icon: Upload, color: '#10B981' },
    { href: '/profile', label: 'Profile', icon: User, color: '#D4AF37' },
];

const ASSET_ICONS = {
    equity: { icon: LineChart, color: '#3B82F6', href: '/assets/equity' },
    crypto: { icon: Bitcoin, color: '#F59E0B', href: '/assets/crypto' },
    'fixed-income': { icon: Landmark, color: '#10B981', href: '/assets/fixed-income' },
    pensions: { icon: Wallet, color: '#8B5CF6', href: '/assets/pensions' },
    debt: { icon: CreditCard, color: '#F43F5E', href: '/assets/debt' },
    default: { icon: DollarSign, color: '#D4AF37', href: '/dashboard' },
};

/* ─── Section header ─── */
function SectionHeader({ title, icon: Icon }) {
    return (
        <div className="flex items-center gap-2 mb-3">
            {Icon && <Icon size={13} className="text-[#D4AF37]/50" />}
            <h4 className="font-bebas text-sm tracking-[0.2em] text-parchment/40 m-0 uppercase">{title}</h4>
        </div>
    );
}

/* ─── Background mini-selector ─── */
function BackgroundMiniSelect({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const selected = BACKGROUNDS.find(b => b.id === value) || BACKGROUNDS.find(b => b.id === 'frosted-glass');

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 hover:border-[#D4AF37]/30 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Palette size={12} className="text-[#D4AF37]/50" />
                    <span className="text-xs text-parchment/80 font-space">{selected.name}</span>
                </div>
                <ChevronDown size={12} className={`text-parchment/30 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute z-50 bottom-full mb-1 left-0 right-0 bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl"
                    >
                        <div className="max-h-48 overflow-y-auto custom-scrollbar">
                            {BACKGROUNDS.map(b => (
                                <button
                                    key={b.id}
                                    onClick={() => { onChange(b.id); setOpen(false); }}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors text-xs font-space
                                        ${b.id === value ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'text-parchment/70'}`}
                                >
                                    {b.name}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/**
 * Inspector Drawer — Activity Hub + Quick Links + Global Settings
 */
export default function Inspector() {
    const {
        isInspectorOpen, setIsInspectorOpen,
        // Transaction data for activity feed
        equityTransactions, cryptoTransactions, fixedIncomeTransactions,
        pensionTransactions, debtTransactions,
        // Market & cache
        lastUpdated, isRefreshingMarketData, forceRefreshMarketData,
        marketDataCacheInfo, marketData,
        // Snapshots for monthly close
        historicalSnapshots,
        setIsMonthlyCloseModalOpen,
        // App settings
        appSettings, handleUpdateAppSettings,
    } = usePortfolio();
    const { data: session } = useSession();
    const pathname = usePathname();
    const router = useRouter();

    // ═══════════ RECENT ACTIVITY ═══════════
    const NEGATIVE_ACTIONS = ['Sell', 'Withdrawal', 'Divestment', 'Liability'];

    const recentActivity = useMemo(() => {
        const items = [];

        // Equity transactions — API returns { ticker, asset, broker, investment, currency, type, date }
        if (Array.isArray(equityTransactions)) {
            equityTransactions.forEach(tx => {
                items.push({
                    type: 'equity',
                    name: tx.ticker || tx.asset || 'Equity',
                    date: tx.date,
                    amount: tx.investment || 0,
                    currency: tx.currency || 'GBP',
                    action: tx.type || 'Buy',
                    broker: tx.broker,
                });
            });
        }

        // Crypto transactions — API returns { ticker, asset, platform, investment, currency, type, date }
        if (Array.isArray(cryptoTransactions)) {
            cryptoTransactions.forEach(tx => {
                items.push({
                    type: 'crypto',
                    name: tx.ticker || tx.asset || 'Crypto',
                    date: tx.date,
                    amount: tx.investment || 0,
                    currency: tx.currency || 'USD',
                    action: tx.type || 'Buy',
                    broker: tx.platform || tx.broker,
                });
            });
        }

        // Fixed income — API returns { asset, broker, investment, interest, currency, type, date }
        if (Array.isArray(fixedIncomeTransactions)) {
            fixedIncomeTransactions.forEach(tx => {
                items.push({
                    type: 'fixed-income',
                    name: tx.asset || 'Fixed Income',
                    date: tx.date,
                    amount: tx.investment || tx.interest || 0,
                    currency: tx.currency || 'BRL',
                    action: tx.type || 'Investment',
                    broker: tx.broker,
                });
            });
        }

        // Pensions — API returns { asset, broker, value, type, date }
        if (Array.isArray(pensionTransactions)) {
            pensionTransactions.forEach(tx => {
                items.push({
                    type: 'pensions',
                    name: tx.asset || 'Pension',
                    date: tx.date,
                    amount: tx.value || 0,
                    currency: 'GBP',
                    action: tx.type || 'Buy',
                    broker: tx.broker,
                });
            });
        }

        // Debt — API returns { lender, value_brl, date }
        if (Array.isArray(debtTransactions)) {
            debtTransactions.forEach(tx => {
                items.push({
                    type: 'debt',
                    name: tx.lender || 'Debt',
                    date: tx.date,
                    amount: tx.value_brl || 0,
                    currency: 'BRL',
                    action: 'Liability',
                    broker: tx.lender,
                });
            });
        }

        // Sort by date descending, take last 5
        return items
            .filter(i => i.date)
            .sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return dateB - dateA;
            })
            .slice(0, 5);
    }, [equityTransactions, cryptoTransactions, fixedIncomeTransactions, pensionTransactions, debtTransactions]);

    // ═══════════ MONTHLY CLOSE STATUS ═══════════
    const monthlyCloseStatus = useMemo(() => {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

        const currentSnapshot = historicalSnapshots.find(s => s.month === currentMonth);
        const prevSnapshot = historicalSnapshots.find(s => s.month === prevMonthStr);

        // Check if we're in the close window (last 2 days of month or first 5 of next)
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const isCloseWindow = now.getDate() >= lastDayOfMonth - 1 || now.getDate() <= 5;

        return {
            currentMonth,
            prevMonthStr,
            hasCurrentSnapshot: !!currentSnapshot,
            hasPrevSnapshot: !!prevSnapshot,
            isCloseWindow,
            recordedAt: currentSnapshot?.recordedAt || prevSnapshot?.recordedAt,
            totalSnapshots: historicalSnapshots.length,
        };
    }, [historicalSnapshots]);

    // ═══════════ STALE TICKERS ═══════════
    const staleTickers = useMemo(() => {
        if (!marketData || typeof marketData !== 'object') return [];
        const ttlMs = (marketDataCacheInfo?.ttlMinutes || 15) * 60 * 1000;
        const now = Date.now();
        const stale = [];

        Object.entries(marketData).forEach(([ticker, data]) => {
            if (ticker.startsWith('_') || !data) return;
            // Check if data has a timestamp indicating staleness
            if (data.timestamp && (now - data.timestamp) > ttlMs * 2) {
                stale.push(ticker);
            }
        });

        return stale.slice(0, 5); // Show max 5
    }, [marketData, marketDataCacheInfo]);

    // ═══════════ HELPERS ═══════════
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            if (isNaN(d)) {
                // Try DD/MM/YYYY format
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    return `${parts[0]}/${parts[1]}`;
                }
                return dateStr;
            }
            return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        } catch {
            return dateStr;
        }
    };

    const CURRENCY_SYMBOLS = { BRL: 'R$', GBP: '£', USD: '$', EUR: '€', JPY: '¥', CHF: 'Fr', AUD: 'A$' };

    const formatAmount = (amount, currencyCode = 'GBP', isNegative = false) => {
        const sym = CURRENCY_SYMBOLS[currencyCode] || currencyCode;
        const num = Math.abs(Number(amount) || 0);
        const sign = isNegative ? '-' : '';
        if (num >= 1000000) return `${sign}${sym}${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${sign}${sym}${(num / 1000).toFixed(1)}K`;
        return `${sign}${sym}${num.toFixed(0)}`;
    };

    const timeAgo = (date) => {
        if (!date) return '';
        const now = new Date();
        const d = new Date(date);
        const diffMs = now - d;
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    const userName = session?.user?.name || 'User';
    const userImage = session?.user?.image;
    const userEmail = session?.user?.email;
    const initials = userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    return (
        <AnimatePresence>
            {isInspectorOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 top-12 md:top-16 bg-black/30 backdrop-blur-sm z-40"
                        onClick={() => setIsInspectorOpen(false)}
                    />

                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-12 md:top-16 right-0 w-80 md:w-96 h-[calc(100vh-3rem)] md:h-[calc(100vh-4rem)] bg-[#1A0F2E]/95 backdrop-blur-xl border-l border-[#D4AF37]/20 shadow-2xl z-50 flex flex-col"
                    >
                        {/* ─── Header ─── */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
                            <h3 className="font-bebas text-xl tracking-[0.2em] text-[#D4AF37] m-0">COMMAND CENTER</h3>
                            <Button variant="ghost" size="sm" onClick={() => setIsInspectorOpen(false)}
                                className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                            >
                                <X size={14} />
                            </Button>
                        </div>

                        {/* ─── Scrollable Content ─── */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 custom-scrollbar">

                            {/* ═══════════ SECTION 1: RECENT ACTIVITY ═══════════ */}
                            <div>
                                <SectionHeader title="Recent Activity" icon={Clock} />
                                {recentActivity.length === 0 ? (
                                    <div className="text-xs text-parchment/30 font-space py-3 text-center bg-white/[0.02] rounded-lg border border-white/5">
                                        No transactions yet
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {recentActivity.map((item, idx) => {
                                            const assetType = ASSET_ICONS[item.type] || ASSET_ICONS.default;
                                            const Icon = assetType.icon;
                                            const isNeg = NEGATIVE_ACTIONS.includes(item.action);
                                            const deepLink = item.broker
                                                ? `${assetType.href}#${encodeURIComponent(item.broker)}`
                                                : assetType.href;
                                            return (
                                                <motion.div
                                                    key={idx}
                                                    initial={{ opacity: 0, x: 10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.03 }}
                                                >
                                                    <Link
                                                        href={deepLink}
                                                        onClick={() => setIsInspectorOpen(false)}
                                                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.03] transition-colors group cursor-pointer no-underline"
                                                    >
                                                        <div
                                                            className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                                                            style={{ backgroundColor: `${assetType.color}15` }}
                                                        >
                                                            <Icon size={12} style={{ color: assetType.color }} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[11px] text-parchment/80 font-space font-medium truncate">
                                                                {item.name}
                                                            </div>
                                                            <div className="text-[9px] text-parchment/30 font-space truncate">
                                                                {formatDate(item.date)}{item.broker ? ` · ${item.broker}` : ''} · {item.action}
                                                            </div>
                                                        </div>
                                                        <div className={`text-[11px] font-space font-medium tabular-nums shrink-0 ${isNeg ? 'text-rose-400/70' : 'text-parchment/50'}`}>
                                                            {formatAmount(item.amount, item.currency, isNeg)}
                                                        </div>
                                                    </Link>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* ═══════════ SECTION 2: MONTHLY CLOSE ═══════════ */}
                            <div>
                                <SectionHeader title="Monthly Close" icon={Camera} />
                                {!monthlyCloseStatus.hasCurrentSnapshot && monthlyCloseStatus.isCloseWindow ? (
                                    /* Amber alert — snapshot needed */
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="p-3 rounded-xl bg-amber-500/[0.07] border border-amber-500/20"
                                    >
                                        <div className="flex items-start gap-2.5">
                                            <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-xs text-amber-200/90 font-space font-medium m-0">
                                                    {monthlyCloseStatus.currentMonth} snapshot not recorded
                                                </p>
                                                <p className="text-[10px] text-amber-200/50 font-space m-0 mt-0.5">
                                                    Record a snapshot to lock in this month's values
                                                </p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm"
                                            onClick={() => { setIsMonthlyCloseModalOpen(true); }}
                                            className="w-full mt-2.5 flex items-center justify-center gap-2 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-space font-bold tracking-wide hover:bg-amber-500/20"
                                        >
                                            <Camera size={12} />
                                            Record Snapshot
                                        </Button>
                                    </motion.div>
                                ) : (
                                    /* Green status — all good */
                                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/15">
                                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                                        <div>
                                            <p className="text-xs text-emerald-200/80 font-space font-medium m-0">
                                                {monthlyCloseStatus.hasCurrentSnapshot ? 'Current month recorded' : 'No snapshot due yet'}
                                            </p>
                                            <p className="text-[10px] text-parchment/30 font-space m-0 mt-0.5">
                                                {monthlyCloseStatus.totalSnapshots} total snapshots tracked
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Auto-close toggle */}
                                <div className="flex items-center justify-between mt-2.5 px-1">
                                    <span className="text-[10px] text-parchment/40 font-space">Auto monthly close</span>
                                    <button
                                        onClick={() => handleUpdateAppSettings({ ...appSettings, autoMonthlyCloseEnabled: !appSettings?.autoMonthlyCloseEnabled })}
                                        className="relative shrink-0 w-9 h-5 rounded-full transition-colors duration-200 border-none cursor-pointer flex items-center p-[2px]"
                                        style={{ background: appSettings?.autoMonthlyCloseEnabled ? '#D4AF37' : 'rgba(255,255,255,0.1)' }}
                                    >
                                        <div
                                            className={`w-4 h-4 rounded-full transition-transform duration-200 ${appSettings?.autoMonthlyCloseEnabled ? 'translate-x-4 bg-white' : 'translate-x-0 bg-white/30'}`}
                                        />
                                    </button>
                                </div>
                            </div>

                            {/* ═══════════ SECTION 3: QUICK LINKS ═══════════ */}
                            <div>
                                <SectionHeader title="Quick Navigation" icon={LayoutDashboard} />
                                <div className="grid grid-cols-3 gap-1.5">
                                    {NAV_LINKS.map(link => {
                                        const Icon = link.icon;
                                        const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                                        return (
                                            <Link
                                                key={link.href}
                                                href={link.href}
                                                onClick={() => setIsInspectorOpen(false)}
                                                className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg transition-all no-underline text-center
                                                    ${isActive
                                                        ? 'bg-[#D4AF37]/10 border border-[#D4AF37]/20'
                                                        : 'bg-white/[0.02] border border-transparent hover:bg-white/[0.04] hover:border-white/5'
                                                    }`}
                                            >
                                                <Icon
                                                    size={14}
                                                    style={{ color: isActive ? link.color : undefined }}
                                                    className={isActive ? '' : 'text-parchment/40'}
                                                />
                                                <span className={`text-[9px] font-space font-medium leading-tight ${isActive ? 'text-[#D4AF37]' : 'text-parchment/50'}`}>
                                                    {link.label}
                                                </span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ═══════════ SECTION 4: GLOBAL SETTINGS ═══════════ */}
                            <div>
                                <SectionHeader title="Global Settings" icon={RefreshCw} />

                                {/* Market Data Status */}
                                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-parchment/40 font-space uppercase tracking-wide">Market Data</span>
                                        <button
                                            onClick={() => forceRefreshMarketData()}
                                            disabled={isRefreshingMarketData}
                                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-space font-bold tracking-wide hover:bg-[#D4AF37]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                        >
                                            <RefreshCw size={10} className={isRefreshingMarketData ? 'animate-spin' : ''} />
                                            {isRefreshingMarketData ? 'Refreshing...' : 'Refresh'}
                                        </button>
                                    </div>

                                    {/* Last updated */}
                                    <div className="flex items-center justify-between text-[10px] font-space">
                                        <span className="text-parchment/30">Last updated</span>
                                        <span className="text-parchment/60">{lastUpdated ? timeAgo(lastUpdated) : 'Never'}</span>
                                    </div>

                                    {/* Cache stats */}
                                    {marketDataCacheInfo && (
                                        <div className="flex gap-2">
                                            <div className="flex-1 text-center py-1.5 rounded-md bg-emerald-500/[0.06] border border-emerald-500/10">
                                                <div className="text-[11px] text-emerald-400 font-space font-bold">{marketDataCacheInfo.cached}</div>
                                                <div className="text-[8px] text-parchment/30 font-space">cached</div>
                                            </div>
                                            <div className="flex-1 text-center py-1.5 rounded-md bg-amber-500/[0.06] border border-amber-500/10">
                                                <div className="text-[11px] text-amber-400 font-space font-bold">{marketDataCacheInfo.refreshed}</div>
                                                <div className="text-[8px] text-parchment/30 font-space">refreshed</div>
                                            </div>
                                            <div className="flex-1 text-center py-1.5 rounded-md bg-white/[0.03] border border-white/5">
                                                <div className="text-[11px] text-parchment/60 font-space font-bold">{marketDataCacheInfo.total}</div>
                                                <div className="text-[8px] text-parchment/30 font-space">total</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Stale ticker alerts */}
                                    {staleTickers.length > 0 && (
                                        <div className="pt-1.5 border-t border-white/5">
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <AlertTriangle size={10} className="text-amber-400" />
                                                <span className="text-[9px] text-amber-300/70 font-space font-medium">Stale tickers</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {staleTickers.map(ticker => (
                                                    <span
                                                        key={ticker}
                                                        className="px-1.5 py-0.5 rounded text-[9px] font-space font-medium bg-amber-500/10 text-amber-300/70 border border-amber-500/15"
                                                    >
                                                        {ticker}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Background Selector */}
                                <div className="mt-2.5">
                                    <div className="text-[10px] text-parchment/30 font-space mb-1.5 px-1">Background</div>
                                    <BackgroundMiniSelect
                                        value={appSettings?.backgroundSelection || 'frosted-glass'}
                                        onChange={(val) => handleUpdateAppSettings({ ...appSettings, backgroundSelection: val })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ─── Footer: User Profile ─── */}
                        <Link
                            href="/profile"
                            onClick={() => setIsInspectorOpen(false)}
                            className="flex-shrink-0 px-5 py-3 border-t border-white/5 flex items-center gap-3 no-underline group hover:bg-white/[0.03] transition-all"
                        >
                            {userImage ? (
                                <img
                                    src={userImage}
                                    alt={userName}
                                    className="w-8 h-8 rounded-full object-cover border-2 border-[#D4AF37]/30 flex-shrink-0"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-[#D4AF37]/10 border-2 border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] text-xs font-bold flex-shrink-0">
                                    {initials}
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="text-[#D4AF37] text-xs font-bold tracking-wide m-0 font-space truncate">{userName}</p>
                                <p className="text-parchment/30 text-[10px] m-0 font-space truncate">{userEmail || 'Portfolio Manager'}</p>
                            </div>
                        </Link>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
