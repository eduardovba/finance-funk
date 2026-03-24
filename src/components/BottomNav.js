"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, BookOpen, PieChart,
    Landmark, HomeIcon, LineChart, Bitcoin, Wallet, CreditCard,
    TrendingUp, Target, LogOut, Settings, Scale, DollarSign, ArrowUpDown,
    ArrowLeftRight, Grid3X3, Upload
} from 'lucide-react';
import { usePortfolio } from '@/context/PortfolioContext';
import { useSession, signOut } from 'next-auth/react';
import { formatCurrency } from '@/lib/currency';
import { getPersonalization } from '@/lib/personalization';

const ASSET_TABS = [
    { id: 'fixed-income', href: '/assets/fixed-income', label: 'Fixed Income', icon: Landmark, color: '#CC5500' },
    { id: 'equity', href: '/assets/equity', label: 'Equity', icon: LineChart, color: '#CC5500' },
    { id: 'real-estate', href: '/assets/real-estate', label: 'Real Estate', icon: HomeIcon, color: '#CC5500' },
    { id: 'crypto', href: '/assets/crypto', label: 'Crypto', icon: Bitcoin, color: '#CC5500' },
    { id: 'pensions', href: '/assets/pensions', label: 'Pensions', icon: Wallet, color: '#CC5500' },
    { id: 'debt', href: '/assets/debt', label: 'Debt', icon: CreditCard, color: '#CC5500' },
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

const BUDGET_ITEMS = [
    { id: 'overview', href: '/budget', label: 'Overview', icon: LayoutDashboard },
    { id: 'transactions', href: '/budget/transactions', label: 'Transactions', icon: ArrowLeftRight },
    { id: 'categories', href: '/budget/categories', label: 'Categories', icon: Grid3X3 },
    { id: 'import', href: '/budget/import', label: 'Import', icon: Upload },
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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[900]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className="fixed bottom-0 left-0 right-0 bg-[#0B0611] border-t border-[#CC5500]/20 rounded-t-3xl z-[900] pb-safe"
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
                        <div className="grid grid-cols-2 gap-3 px-5 pb-4">
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
                                        <span className="text-parchment/50 text-data-xs font-space  pl-0.5">
                                            {value ? formatCurrency(value, 'BRL') : '—'}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Import Link */}
                        <div className="px-5 pb-6">
                            <div className="border-t border-white/5 pt-3">
                                <Link
                                    href="/import"
                                    onClick={onClose}
                                    className="flex items-center gap-4 px-3 py-3 rounded-xl text-parchment/80 hover:bg-white/5 active:bg-white/5 active:scale-[0.98] transition-all no-underline"
                                >
                                    <Upload size={18} className="text-[#CC5500]/60" />
                                    <span className="text-sm font-space font-medium">Import</span>
                                </Link>
                            </div>
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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[900]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className="fixed bottom-0 left-0 right-0 bg-[#0B0611] border-t border-[#A78BFA]/20 rounded-t-3xl z-[900] pb-safe"
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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[900]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className="fixed bottom-0 left-0 right-0 bg-[#0B0611] border-t border-[#D4AF37]/20 rounded-t-3xl z-[900] pb-safe"
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

/* ─── Budget Bottom Sheet ─── */
function BudgetSheet({ isOpen, onClose }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[900]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className="fixed bottom-0 left-0 right-0 bg-[#0B0611] border-t border-[#34D399]/20 rounded-t-3xl z-[900] pb-safe"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    >
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1 bg-white/20 rounded-full" />
                        </div>

                        <div className="px-5 pb-2">
                            <h3 className="text-[#34D399] font-bebas text-xl tracking-wide">Budget</h3>
                        </div>

                        <div className="flex flex-col gap-1 px-5 pb-6">
                            {BUDGET_ITEMS.map(item => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        onClick={onClose}
                                        className="flex items-center gap-4 px-3 py-3 rounded-xl text-parchment/80 hover:bg-white/5 active:bg-white/5 active:scale-[0.98] transition-all no-underline"
                                    >
                                        <Icon size={18} className="text-[#34D399]/60" />
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
    const { ftueState } = usePortfolio();
    const personalization = getPersonalization(ftueState);

    const [assetsOpen, setAssetsOpen] = useState(false);
    const [planningOpen, setPlanningOpen] = useState(false);
    const [ledgerOpen, setLedgerOpen] = useState(false);
    const [budgetOpen, setBudgetOpen] = useState(false);

    const isAssetRoute = ASSET_TABS.some(t => pathname.startsWith(t.href));
    const isPlanningRoute = PLANNING_ITEMS.some(t => pathname.startsWith(t.href));
    const isLedgerRoute = LEDGER_ITEMS.some(t => pathname.startsWith(t.href));

    const isBudgetRoute = pathname.startsWith('/budget');

    const isDemoRoute = pathname.startsWith('/demo');

    const tabs = [
        { id: 'home', href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: '#D4AF37' },
        { id: 'budget', href: null, label: 'Budget', icon: Wallet, color: '#34D399', action: () => { 
            if (isDemoRoute) {
                window.dispatchEvent(new CustomEvent('switchDemoGoal', { detail: 'budget' }));
            } else {
                setAssetsOpen(false); setPlanningOpen(false); setLedgerOpen(false); setBudgetOpen(true); 
            }
        } },
        { id: 'assets', href: null, label: 'Assets', icon: PieChart, color: '#CC5500', action: () => { 
            if (isDemoRoute) {
                window.dispatchEvent(new CustomEvent('switchDemoGoal', { detail: 'both' }));
            } else {
                setBudgetOpen(false); setPlanningOpen(false); setLedgerOpen(false); setAssetsOpen(true); 
            }
        } },
        { id: 'planning', href: null, label: 'Planning', icon: TrendingUp, color: '#A78BFA', action: () => { setBudgetOpen(false); setAssetsOpen(false); setLedgerOpen(false); setPlanningOpen(true); } },
        { id: 'ledger', href: null, label: 'Ledger', icon: BookOpen, color: '#D4AF37', action: () => { setBudgetOpen(false); setAssetsOpen(false); setPlanningOpen(false); setLedgerOpen(true); } },
    ];

    let orderedTabs = [...tabs];
    if (personalization.goal === 'budget') {
        const budget = orderedTabs.find(t => t.id === 'budget');
        const rest = orderedTabs.filter(t => t.id !== 'budget');
        orderedTabs = [budget, ...rest];
    } else if (personalization.goal === 'investments') {
        const budget = orderedTabs.find(t => t.id === 'budget');
        const rest = orderedTabs.filter(t => t.id !== 'budget');
        orderedTabs = [...rest, budget];
    }

    let filteredTabs = orderedTabs;
    if (personalization.goal === 'budget') {
        filteredTabs = filteredTabs.filter(t => t.id !== 'ledger');
        if (personalization.experience === 'beginner') {
            filteredTabs = filteredTabs.filter(t => t.id !== 'planning');
        }
    }

    const isActive = (tab) => {
        if (tab.id === 'home') return pathname === '/dashboard' || pathname === '/';
        if (tab.id === 'budget') return isBudgetRoute || budgetOpen;
        if (tab.id === 'assets') return isAssetRoute || assetsOpen;
        if (tab.id === 'planning') return isPlanningRoute || planningOpen;
        if (tab.id === 'ledger') return isLedgerRoute || ledgerOpen;
        return false;
    };

    return (
        <>
            <nav id="ftue-nav-mobile" aria-label="Main navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-[#0B0611]/95 backdrop-blur-xl border-t border-white/10"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
                <div className="flex items-center justify-around h-16">
                    {filteredTabs.map(tab => {
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
                                    aria-label={tab.label}
                                    aria-current={active ? 'page' : undefined}
                                    className="flex flex-col items-center justify-center gap-0.5 flex-1 w-full max-w-[20%] h-full bg-transparent border-none active:scale-[0.9] transition-transform relative"
                                >
                                    {active && (
                                        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 60% 80% at 50% 100%, ${activeColor}15, transparent)` }} />
                                    )}
                                    <Icon size={22} style={active ? { color: activeColor, filter: `drop-shadow(0 0 8px ${activeColor}80)` } : {}} className={active ? '' : 'text-parchment/40'} strokeWidth={active ? 2.5 : 1.5} />
                                    <span className={`text-xs font-space tracking-wider ${active ? 'font-bold' : 'text-parchment/40'}`} style={active ? { color: activeColor } : {}}>
                                        {tab.label}
                                    </span>
                                </button>
                            );
                        }

                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                aria-label={tab.label}
                                aria-current={active ? 'page' : undefined}
                                className="flex flex-col items-center justify-center gap-0.5 flex-1 w-full max-w-[20%] h-full no-underline active:scale-[0.9] transition-transform relative"
                            >
                                {active && (
                                    <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 60% 80% at 50% 100%, ${activeColor}15, transparent)` }} />
                                )}
                                <Icon size={22} style={active ? { color: activeColor, filter: `drop-shadow(0 0 8px ${activeColor}80)` } : {}} className={active ? '' : 'text-parchment/40'} strokeWidth={active ? 2.5 : 1.5} />
                                <span className={`text-xs font-space tracking-wider ${active ? 'font-bold' : 'text-parchment/40'}`} style={active ? { color: activeColor } : {}}>
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
            <BudgetSheet isOpen={budgetOpen} onClose={() => setBudgetOpen(false)} />
        </>
    );
}
