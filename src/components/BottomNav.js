"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, BookOpen, PieChart, Menu, X,
    Landmark, HomeIcon, LineChart, Bitcoin, Wallet, CreditCard,
    TrendingUp, Target, LogOut, Settings
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

const MORE_ITEMS = [
    { id: 'planning', href: '/planning', label: 'Planning', icon: TrendingUp },
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
                        className="fixed bottom-0 left-0 right-0 bg-[#0B0611] border-t border-[#D4AF37]/20 rounded-t-3xl z-[999] pb-safe"
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
                            <h3 className="text-[#D4AF37] font-bebas text-xl tracking-wide">Asset Classes</h3>
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
                                        <span className="text-parchment/50 text-[11px] font-mono pl-0.5">
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

/* ─── More Drawer (Bottom Sheet) ─── */
function MoreSheet({ isOpen, onClose }) {
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
                        className="fixed bottom-0 left-0 right-0 bg-[#0B0611] border-t border-[#D4AF37]/20 rounded-t-3xl z-[999] pb-safe"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    >
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1 bg-white/20 rounded-full" />
                        </div>

                        <div className="px-5 pb-6 flex flex-col gap-1">
                            {MORE_ITEMS.map(item => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        onClick={onClose}
                                        className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-parchment/80 hover:bg-white/5 active:bg-white/5 active:scale-[0.98] transition-all no-underline"
                                    >
                                        <Icon size={20} className="text-[#D4AF37]/60" />
                                        <span className="text-sm font-space font-medium">{item.label}</span>
                                    </Link>
                                );
                            })}

                            <div className="h-px bg-white/5 my-2" />

                            {session?.user && (
                                <div className="flex items-center justify-between px-4 py-3">
                                    <Link
                                        href="/profile"
                                        onClick={onClose}
                                        className="flex items-center gap-3 no-underline flex-1 min-w-0 active:scale-[0.98] transition-transform"
                                    >
                                        {session.user.image ? (
                                            <img src={session.user.image} alt={session.user.name} className="w-8 h-8 rounded-full object-cover border border-[#D4AF37]/20 flex-shrink-0" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] text-xs font-bold flex-shrink-0">
                                                {(session.user.name || session.user.email)?.[0]?.toUpperCase()}
                                            </div>
                                        )}
                                        <span className="text-xs text-parchment/50 font-space truncate max-w-[180px]">
                                            {session.user.name || session.user.email}
                                        </span>
                                    </Link>
                                    <button
                                        onClick={() => signOut({ callbackUrl: '/login' })}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-space active:scale-[0.95] transition-all flex-shrink-0"
                                    >
                                        <LogOut size={14} />
                                        Sign Out
                                    </button>
                                </div>
                            )}
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
    const [moreOpen, setMoreOpen] = useState(false);

    const isAssetRoute = ASSET_TABS.some(t => pathname.startsWith(t.href));

    const tabs = [
        { id: 'home', href: '/dashboard', label: 'Home', icon: LayoutDashboard },
        { id: 'assets', href: null, label: 'Assets', icon: PieChart, action: () => { setMoreOpen(false); setAssetsOpen(true); } },
        { id: 'activity', href: '/general-ledger', label: 'Activity', icon: BookOpen },
        { id: 'more', href: null, label: 'More', icon: Menu, action: () => { setAssetsOpen(false); setMoreOpen(true); } },
    ];

    const isActive = (tab) => {
        if (tab.id === 'home') return pathname === '/dashboard' || pathname === '/';
        if (tab.id === 'assets') return isAssetRoute || assetsOpen;
        if (tab.id === 'activity') return pathname === '/general-ledger';
        if (tab.id === 'more') return moreOpen || pathname === '/planning';
        return false;
    };

    return (
        <>
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[997] bg-[#0B0611]/95 backdrop-blur-xl border-t border-white/10"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
                <div className="flex items-center justify-around h-16">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const active = isActive(tab);

                        if (tab.action) {
                            return (
                                <button
                                    key={tab.id}
                                    onClick={tab.action}
                                    className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full bg-transparent border-none active:scale-[0.9] transition-transform"
                                >
                                    <Icon size={22} className={active ? 'text-[#D4AF37]' : 'text-parchment/40'} strokeWidth={active ? 2.5 : 1.5} />
                                    <span className={`text-[10px] font-space tracking-wider ${active ? 'text-[#D4AF37] font-bold' : 'text-parchment/40'}`}>
                                        {tab.label}
                                    </span>
                                </button>
                            );
                        }

                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full no-underline active:scale-[0.9] transition-transform"
                            >
                                <Icon size={22} className={active ? 'text-[#D4AF37]' : 'text-parchment/40'} strokeWidth={active ? 2.5 : 1.5} />
                                <span className={`text-[10px] font-space tracking-wider ${active ? 'text-[#D4AF37] font-bold' : 'text-parchment/40'}`}>
                                    {tab.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            <AssetsSheet isOpen={assetsOpen} onClose={() => setAssetsOpen(false)} />
            <MoreSheet isOpen={moreOpen} onClose={() => setMoreOpen(false)} />
        </>
    );
}
