"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, BookOpen, PieChart,
    Landmark, HomeIcon, LineChart, Bitcoin, Wallet, CreditCard,
    TrendingUp, Target, LogOut, Settings, Scale, DollarSign, ArrowUpDown
} from 'lucide-react';
import { usePortfolio } from '@/context/PortfolioContext';
import { useSession, signOut } from 'next-auth/react';
import { formatCurrency } from '@/lib/currency';

const ASSET_TABS = [
    { id: 'fixed-income', href: '/assets/fixed-income', label: 'Fixed Income', icon: Landmark, color: '#D4AF37' },
    { id: 'equity', href: '/assets/equity', label: 'Equity', icon: LineChart, color: '#CC5500' },
    { id: 'real-estate', href: '/assets/real-estate', label: 'Real Estate', icon: HomeIcon, color: '#8b5cf6' },
    { id: 'crypto', href: '/assets/crypto', label: 'Crypto', icon: Bitcoin, color: '#f59e0b' },
    { id: 'pensions', href: '/assets/pensions', label: 'Pensions', icon: Wallet, color: '#06b6d4' },
    { id: 'debt', href: '/assets/debt', label: 'Debt', icon: CreditCard, color: '#ec4899' },
];

const PLANNING_ITEMS = [
    { id: 'targets', href: '/planning/targets', label: 'Allocation', icon: Target },
    { id: 'forecast', href: '/planning/forecast', label: 'Forecast', icon: TrendingUp },
    { id: 'advisor', href: '/planning/advisor', label: 'Advisor', icon: Scale },
];

const LEDGER_ITEMS = [
    { id: 'income', href: '/ledger/income', label: 'Income', icon: DollarSign },
    { id: 'investments', href: '/ledger/investments', label: 'Investments', icon: ArrowUpDown },
    { id: 'totals', href: '/ledger/totals', label: 'General Ledger', icon: BookOpen },
];

/* ─── Assets Bottom Sheet ─── */
function AssetsSheet({ isOpen, onClose }) {
    const { dashboardData, primaryCurrency } = usePortfolio();

    const getCategoryValue = (id) => {
        if (!dashboardData?.summaries) return 0;
        const s = dashboardData.summaries.find(s => s.id === id);
        return s?.amount || 0;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[998]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className="fixed bottom-0 left-0 right-0 bg-[#0B0611] border-t border-[#CC5500]/20 rounded-t-3xl z-[999] pb-safe"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1 bg-white/20 rounded-full" />
                        </div>

                        <div className="px-5 pb-2">
                            <h3 className="text-[#CC5500] font-bebas text-xl tracking-wide">Asset Classes</h3>
                        </div>

                        {/* 2×3 Grid */}
                        <div className="grid grid-cols-2 gap-3 px-5 pb-6">
                            {ASSET_TABS.map(tab => {
                                const Icon = tab.icon;
                                const value = getCategoryValue(tab.id);
                                return (
                                    <Link
                                        key={tab.id}
                                        href={tab.href}
                                        onClick={onClose}
                                        className="flex flex-col gap-2 p-4 rounded-2xl bg-white/[0.03] border border-white/5 active:scale-[0.97] active:bg-white/[0.06] transition-all no-underline"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div
                                                className="w-9 h-9 rounded-xl flex items-center justify-center"
                                                style={{ backgroundColor: `${tab.color}15` }}
                                            >
                                                <Icon size={18} style={{ color: tab.color }} />
                                            </div>
                                            <span className="text-parchment/80 text-xs font-space font-bold tracking-wide uppercase">
                                                {tab.label}
                                            </span>
                                        </div>
                                        <span className="text-parchment/50 text-[0.75rem] font-mono tabular-nums pl-0.5">
                                            {value ? formatCurrency(value, 'BRL') : '—'}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

/* ─── Planning Bottom Sheet ─── */
function PlanningSheet({ isOpen, onClose }) {
    const { data: session } = useSession();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[998]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className="fixed bottom-0 left-0 right-0 bg-[#0B0611] border-t border-[#A78BFA]/20 rounded-t-3xl z-[999] pb-safe"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    >
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1 bg-white/20 rounded-full" />
                        </div>

                        <div className="px-5 pb-2">
                            <h3 className="text-[#A78BFA] font-bebas text-xl tracking-wide">Planning</h3>
                        </div>

                        <div className="flex flex-col gap-1 px-5 pb-6">
                            {PLANNING_ITEMS.map(item => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        onClick={onClose}
                                        className="flex items-center gap-4 px-3 py-3 rounded-xl text-parchment/80 hover:bg-white/5 active:bg-white/5 active:scale-[0.98] transition-all no-underline"
                                    >
                                        <Icon size={18} className="text-[#A78BFA]/60" />
                                        <span className="text-sm font-space font-medium">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>

                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

/* ─── Ledger Bottom Sheet ─── */
function LedgerSheet({ isOpen, onClose }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[998]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className="fixed bottom-0 left-0 right-0 bg-[#0B0611] border-t border-[#D4AF37]/20 rounded-t-3xl z-[999] pb-safe"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    >
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1 bg-white/20 rounded-full" />
                        </div>

                        <div className="px-5 pb-2">
                            <h3 className="text-[#D4AF37] font-bebas text-xl tracking-wide">Ledger</h3>
                        </div>

                        <div className="flex flex-col gap-1 px-5 pb-6">
                            {LEDGER_ITEMS.map(item => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        onClick={onClose}
                                        className="flex items-center gap-4 px-3 py-3 rounded-xl text-parchment/80 hover:bg-white/5 active:bg-white/5 active:scale-[0.98] transition-all no-underline"
                                    >
                                        <Icon size={18} className="text-[#D4AF37]/60" />
                                        <span className="text-sm font-space font-medium">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

/* ─── Bottom Navigation Bar ─── */
export default function BottomNav() {
    const pathname = usePathname();
    const [assetsOpen, setAssetsOpen] = useState(false);
    const [planningOpen, setPlanningOpen] = useState(false);
    const [ledgerOpen, setLedgerOpen] = useState(false);

    const isAssetRoute = ASSET_TABS.some(t => pathname.startsWith(t.href));
    const isPlanningRoute = PLANNING_ITEMS.some(t => pathname.startsWith(t.href));
    const isLedgerRoute = LEDGER_ITEMS.some(t => pathname.startsWith(t.href));

    const tabs = [
        { id: 'home', href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: '#D4AF37' },
        { id: 'assets', href: null, label: 'Assets', icon: PieChart, color: '#CC5500', action: () => { setPlanningOpen(false); setLedgerOpen(false); setAssetsOpen(true); } },
        { id: 'planning', href: null, label: 'Planning', icon: TrendingUp, color: '#A78BFA', action: () => { setAssetsOpen(false); setLedgerOpen(false); setPlanningOpen(true); } },
        { id: 'ledger', href: null, label: 'Ledger', icon: BookOpen, color: '#D4AF37', action: () => { setAssetsOpen(false); setPlanningOpen(false); setLedgerOpen(true); } },
    ];

    const isActive = (tab) => {
        if (tab.id === 'home') return pathname === '/dashboard' || pathname === '/';
        if (tab.id === 'assets') return isAssetRoute || assetsOpen;
        if (tab.id === 'planning') return isPlanningRoute || planningOpen;
        if (tab.id === 'ledger') return isLedgerRoute || ledgerOpen;
        return false;
    };

    return (
        <>
            <nav id="ftue-nav-mobile" className="md:hidden fixed bottom-0 left-0 right-0 z-[997] bg-[#0B0611]/95 backdrop-blur-xl border-t border-white/10"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
                <div className="flex items-center justify-around h-16">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const active = isActive(tab);
                        const activeColor = tab.color;

                        if (tab.action) {
                            return (
                                <button
                                    key={tab.id}
                                    id={
                                        tab.id === 'assets' ? 'ftue-sidebar-mobile' : undefined
                                    }
                                    onClick={tab.action}
                                    className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full bg-transparent border-none active:scale-[0.9] transition-transform relative"
                                >
                                    {active && (
                                        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 60% 80% at 50% 100%, ${activeColor}15, transparent)` }} />
                                    )}
                                    <Icon size={22} style={active ? { color: activeColor, filter: `drop-shadow(0 0 8px ${activeColor}80)` } : {}} className={active ? '' : 'text-parchment/40'} strokeWidth={active ? 2.5 : 1.5} />
                                    <span className={`text-[0.75rem] font-space tracking-wider ${active ? 'font-bold' : 'text-parchment/40'}`} style={active ? { color: activeColor } : {}}>
                                        {tab.label}
                                    </span>
                                </button>
                            );
                        }

                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full no-underline active:scale-[0.9] transition-transform relative"
                            >
                                {active && (
                                    <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 60% 80% at 50% 100%, ${activeColor}15, transparent)` }} />
                                )}
                                <Icon size={22} style={active ? { color: activeColor, filter: `drop-shadow(0 0 8px ${activeColor}80)` } : {}} className={active ? '' : 'text-parchment/40'} strokeWidth={active ? 2.5 : 1.5} />
                                <span className={`text-[0.75rem] font-space tracking-wider ${active ? 'font-bold' : 'text-parchment/40'}`} style={active ? { color: activeColor } : {}}>
                                    {tab.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            <AssetsSheet isOpen={assetsOpen} onClose={() => setAssetsOpen(false)} />
            <PlanningSheet isOpen={planningOpen} onClose={() => setPlanningOpen(false)} />
            <LedgerSheet isOpen={ledgerOpen} onClose={() => setLedgerOpen(false)} />
        </>
    );
}
