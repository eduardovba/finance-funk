"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, LayoutDashboard, BookOpen, TrendingUp, Eye, Landmark, Home as HomeIcon, LineChart, Bitcoin, Wallet, CreditCard, Target, LogOut, Settings } from 'lucide-react';
import CurrencyPill from '@/components/CurrencyPill';
import { usePortfolio } from '@/context/PortfolioContext';
import { useSession, signOut } from 'next-auth/react';

export default function TopConsole() {
    const { rates, loadingRates, lastUpdated, isInspectorOpen, setIsInspectorOpen } = usePortfolio();
    const pathname = usePathname();
    const [isAssetsDropdownOpen, setIsAssetsDropdownOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const { data: session } = useSession();

    const trackingTabs = [
        { id: 'dashboard', href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'general-ledger', href: '/general-ledger', label: 'Ledger', icon: BookOpen },
        { id: 'planning', href: '/planning', label: 'Planning', icon: TrendingUp },
        { id: 'live-tracking', href: '/live-tracking', label: 'Watchlist', icon: Eye },
    ];

    const assetTabs = [
        { id: 'fixed-income', href: '/assets/fixed-income', label: 'Fixed Income', icon: Landmark },
        { id: 'real-estate', href: '/assets/real-estate', label: 'Real Estate', icon: HomeIcon },
        { id: 'equity', href: '/assets/equity', label: 'Equity', icon: LineChart },
        { id: 'crypto', href: '/assets/crypto', label: 'Crypto', icon: Bitcoin },
        { id: 'pensions', href: '/assets/pensions', label: 'Pensions', icon: Wallet },
        { id: 'debt', href: '/assets/debt', label: 'Debt', icon: CreditCard },
    ];

    const activeAssetTab = assetTabs.find(t => pathname.startsWith(t.href));
    const isAssetRoute = !!activeAssetTab;

    return (
        <header className="h-12 md:h-16 w-full flex items-center justify-between px-3 md:px-4 lg:px-6 bg-[#1A0F2E]/90 backdrop-blur-md border-b border-[#D4AF37]/20 z-40 flex-shrink-0">

            {/* Left: Logo */}
            <Link href="/dashboard" className="relative flex items-center w-[60px] md:w-[90px] h-full flex-shrink-0 no-underline group z-[100]">
                <img
                    src="/ff-logo.png"
                    alt="Finance Funk"
                    className="absolute -top-2 left-0 md:left-2 h-16 md:h-24 w-auto drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)] group-hover:scale-[1.05] transition-all duration-500 pointer-events-none"
                    style={{ maxHeight: 'none', maxWidth: 'none' }}
                />
            </Link>

            {/* Center: Navigation Tabs — hidden on mobile (BottomNav handles it) */}
            <nav className="hidden md:flex items-center gap-1 mx-4">
                {trackingTabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = pathname === tab.href || (tab.href === '/dashboard' && pathname === '/');
                    return (
                        <Link
                            key={tab.id}
                            href={tab.href}
                            className={`
                flex items-center gap-1.5 px-3 py-2 text-xs font-space font-medium tracking-wide uppercase whitespace-nowrap
                rounded-none border-b-2 transition-all duration-200 bg-transparent no-underline
                ${isActive
                                    ? 'border-[#D4AF37] text-[#D4AF37] drop-shadow-[0_0_6px_rgba(212,175,55,0.5)]'
                                    : 'border-transparent text-gray-400 hover:text-white hover:border-white/20'
                                }
              `}
                        >
                            <Icon size={14} strokeWidth={isActive ? 2.5 : 1.5} />
                            <span className="hidden md:inline">{tab.label}</span>
                        </Link>
                    );
                })}

                {/* Divider */}
                <div className="w-px h-6 bg-white/10 mx-2 flex-shrink-0" />

                {/* ASSETS DROPDOWN */}
                <div className="relative">
                    <button
                        onClick={() => setIsAssetsDropdownOpen(!isAssetsDropdownOpen)}
                        className={`
              flex items-center gap-1.5 px-3 py-2 text-xs font-space font-medium tracking-wide uppercase whitespace-nowrap
              rounded-none border-b-2 transition-all duration-200 bg-transparent
              ${isAssetRoute
                                ? 'border-[#CC5500] text-[#CC5500] drop-shadow-[0_0_6px_rgba(204,85,0,0.5)]'
                                : 'border-transparent text-gray-400 hover:text-white hover:border-white/20'
                            }
            `}
                    >
                        <LayoutDashboard size={14} strokeWidth={isAssetRoute ? 2.5 : 1.5} />
                        <span>Assets</span>
                        {activeAssetTab && (() => {
                            const ActiveIcon = activeAssetTab.icon;
                            return (
                                <>
                                    <span className="opacity-50 mx-0.5 font-bold">&gt;</span>
                                    <ActiveIcon size={13} strokeWidth={2.5} />
                                    <span>{activeAssetTab.label}</span>
                                </>
                            );
                        })()}
                        <motion.span
                            animate={{ rotate: isAssetsDropdownOpen ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="ml-1"
                        >
                            ▼
                        </motion.span>
                    </button>

                    {/* Dropdown Menu */}
                    <AnimatePresence>
                        {isAssetsDropdownOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setIsAssetsDropdownOpen(false)}
                                />

                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                    className="absolute top-full left-0 mt-2 w-48 bg-[#1A0F2E] border border-[#D4AF37]/20 shadow-2xl rounded-xl overflow-hidden z-20 backdrop-blur-xl"
                                >
                                    <div className="p-2 grid grid-cols-1 gap-1">
                                        {assetTabs.map(tab => {
                                            const Icon = tab.icon;
                                            const isActive = pathname === tab.href;
                                            return (
                                                <Link
                                                    key={tab.id}
                                                    href={tab.href}
                                                    onClick={() => setIsAssetsDropdownOpen(false)}
                                                    className={`
                            flex items-center gap-3 px-3 py-2.5 text-[11px] font-space font-bold tracking-widest uppercase
                            rounded-lg transition-all duration-200 text-left border-none no-underline
                            ${isActive
                                                            ? 'bg-[#CC5500]/20 text-[#CC5500]'
                                                            : 'bg-transparent text-gray-400 hover:bg-white/5 hover:text-white'
                                                        }
                          `}
                                                >
                                                    <Icon size={14} strokeWidth={isActive ? 2.5 : 1.5} />
                                                    {tab.label}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </nav>

            {/* Right: Controls */}
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                <CurrencyPill />
                <button
                    onClick={() => setIsInspectorOpen(!isInspectorOpen)}
                    className={`
            p-2 rounded-lg transition-all duration-200 bg-transparent border
            ${isInspectorOpen
                            ? 'border-[#D4AF37]/50 text-[#D4AF37] bg-[#D4AF37]/10'
                            : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                        }
          `}
                    title="Inspector"
                >
                    <SlidersHorizontal size={16} />
                </button>

                {/* User Avatar Dropdown — hidden on mobile (More sheet handles it) */}
                {session?.user && (
                    <div className="hidden md:block relative">
                        <button
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/10 hover:border-[#D4AF37]/50 transition-all duration-200 bg-[#D4AF37]/10 flex items-center justify-center p-0 cursor-pointer"
                            title={session.user.name || session.user.email}
                        >
                            {session.user.image ? (
                                <img src={session.user.image} alt={session.user.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-[#D4AF37] text-xs font-bold font-space">
                                    {(session.user.name || session.user.email)?.[0]?.toUpperCase()}
                                </span>
                            )}
                        </button>

                        <AnimatePresence>
                            {isUserMenuOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setIsUserMenuOpen(false)}
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                        transition={{ duration: 0.15, ease: "easeOut" }}
                                        className="absolute top-full right-0 mt-2 w-48 bg-[#1A0F2E] border border-[#D4AF37]/20 shadow-2xl rounded-xl overflow-hidden z-20 backdrop-blur-xl"
                                    >
                                        {/* User info header */}
                                        <div className="px-4 py-3 border-b border-white/5">
                                            <p className="text-xs font-space font-bold text-parchment/80 m-0 truncate">{session.user.name || 'User'}</p>
                                            <p className="text-[10px] font-space text-parchment/30 m-0 truncate">{session.user.email}</p>
                                        </div>
                                        <div className="p-1.5">
                                            <Link
                                                href="/profile"
                                                onClick={() => setIsUserMenuOpen(false)}
                                                className="flex items-center gap-2.5 px-3 py-2.5 text-[11px] font-space font-medium tracking-wide rounded-lg text-parchment/60 hover:text-parchment hover:bg-white/5 transition-all no-underline"
                                            >
                                                <Settings size={14} className="text-[#D4AF37]/60" />
                                                Profile & Settings
                                            </Link>
                                            <button
                                                onClick={() => { setIsUserMenuOpen(false); signOut({ callbackUrl: '/login' }); }}
                                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[11px] font-space font-medium tracking-wide rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all bg-transparent border-none text-left"
                                            >
                                                <LogOut size={14} />
                                                Sign Out
                                            </button>
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </header>
    );
}
