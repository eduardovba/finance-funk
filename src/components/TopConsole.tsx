"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, LayoutDashboard, BookOpen, TrendingUp, Landmark, Home as HomeIcon, LineChart, Bitcoin, Wallet, CreditCard, Target, LogOut, Settings, Scale, DollarSign, ArrowUpDown, Shield, FileSpreadsheet, ArrowLeftRight, Grid3X3, Upload } from 'lucide-react';
import { Button } from '@/components/ui';
import CurrencyPill from '@/components/CurrencyPill';
import { usePortfolio } from '@/context/PortfolioContext';
import { useSession, signOut } from 'next-auth/react';

export default function TopConsole() {
    const { rates, loadingRates, lastUpdated, isInspectorOpen, setIsInspectorOpen } = usePortfolio();
    const pathname = usePathname();
    const [isAssetsDropdownOpen, setIsAssetsDropdownOpen] = useState(false);
    const [isPlanningDropdownOpen, setIsPlanningDropdownOpen] = useState(false);
    const [isLedgerDropdownOpen, setIsLedgerDropdownOpen] = useState(false);
    const [isBudgetDropdownOpen, setIsBudgetDropdownOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isAssetsHovered, setIsAssetsHovered] = useState(false);
    const [isPlanningHovered, setIsPlanningHovered] = useState(false);
    const [isLedgerHovered, setIsLedgerHovered] = useState(false);
    const [isBudgetHovered, setIsBudgetHovered] = useState(false);
    const { data: session } = useSession();

    const isDemoRoute = pathname.startsWith('/demo');

    const trackingTabs = [
        { id: 'dashboard', href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ];

    const budgetTabs = [
        { id: 'overview', href: '/budget', label: 'Overview', icon: LayoutDashboard },
        { id: 'transactions', href: '/budget/transactions', label: 'Transactions', icon: ArrowLeftRight },
        { id: 'categories', href: '/budget/categories', label: 'Categories', icon: Grid3X3 },
        { id: 'import', href: '/budget/import', label: 'Import', icon: Upload },
    ];

    const ledgerTabs = [
        { id: 'income', href: '/ledger/income', label: 'Income', icon: DollarSign },
        { id: 'investments', href: '/ledger/investments', label: 'Investments', icon: ArrowUpDown },
        { id: 'totals', href: '/ledger/totals', label: 'General Ledger', icon: BookOpen },
    ];

    const planningTabs = [
        { id: 'targets', href: '/planning/targets', label: 'Allocation', icon: Target },
        { id: 'forecast', href: '/planning/forecast', label: 'Forecast', icon: TrendingUp },
        { id: 'advisor', href: '/planning/advisor', label: 'Advisor', icon: Scale },
    ];

    const assetTabs = [
        { id: 'fixed-income', href: '/assets/fixed-income', label: 'Fixed Income', icon: Landmark },
        { id: 'real-estate', href: '/assets/real-estate', label: 'Real Estate', icon: HomeIcon },
        { id: 'equity', href: '/assets/equity', label: 'Equity', icon: LineChart },
        { id: 'crypto', href: '/assets/crypto', label: 'Crypto', icon: Bitcoin },
        { id: 'pensions', href: '/assets/pensions', label: 'Pensions', icon: Wallet },
        { id: 'debt', href: '/assets/debt', label: 'Debt', icon: CreditCard },
        { id: 'import', href: '/import', label: 'Import', icon: Upload },
    ];

    const activeAssetTab = assetTabs.find(t => pathname.startsWith(t.href));
    const isAssetRoute = !!activeAssetTab;

    const activePlanningTab = planningTabs.find(t => pathname.startsWith(t.href));
    const isPlanningRoute = !!activePlanningTab;

    const activeLedgerTab = ledgerTabs.find(t => pathname.startsWith(t.href));
    const isLedgerRoute = !!activeLedgerTab;

    const activeBudgetTab = budgetTabs.find(t =>
        t.href === '/budget' ? pathname === '/budget' : pathname.startsWith(t.href)
    );
    const isBudgetRoute = pathname.startsWith('/budget');

    // Reset hover/dropdown states on navigation
    useEffect(() => {
        setIsAssetsDropdownOpen(false);
        setIsPlanningDropdownOpen(false);
        setIsLedgerDropdownOpen(false);
        setIsBudgetDropdownOpen(false);
        setIsAssetsHovered(false);
        setIsPlanningHovered(false);
        setIsLedgerHovered(false);
        setIsBudgetHovered(false);
    }, [pathname]);



    return (
        <header className="h-12 md:h-16 w-full flex items-center justify-between px-3 md:px-4 lg:px-6 bg-[#1A0F2E]/90 backdrop-blur-md border-b border-[#D4AF37]/20 z-40 flex-shrink-0">

            {/* Left: Logo */}
            <Link href="/dashboard" className="relative flex items-center w-[60px] md:w-[90px] h-full flex-shrink-0 no-underline group z-[100]">
                <Image
                    src="/logos/ff-logo.png"
                    alt="Finance Funk"
                    width={120}
                    height={96}
                    className="absolute -top-2 left-0 md:left-2 h-16 md:h-24 w-auto drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)] group-hover:scale-[1.05] transition-all duration-500 pointer-events-none"
                    style={{ maxHeight: 'none', maxWidth: 'none' }}
                />
            </Link>

            {/* Navigation Tabs — left-aligned beside logo, hidden on mobile (BottomNav handles it) */}
            <nav id="ftue-nav" aria-label="Main navigation" className="hidden md:flex items-center gap-0 mr-auto ml-2">
                {/* DASHBOARD */}
                {trackingTabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = pathname === tab.href || (tab.href === '/dashboard' && pathname === '/');
                    const activeColor = '#D4AF37';
                    return (
                        <Link
                            key={tab.id}
                            href={tab.href}
                            className={`
                flex items-center gap-1.5 px-3 py-1.5 text-xs font-space font-medium tracking-widest uppercase whitespace-nowrap
                transition-all duration-200 bg-transparent no-underline
                ${isActive
                                    ? ''
                                    : 'text-[#F5F5DC]/40 hover:text-[#F5F5DC]/70'
                                }
              `}
                            style={isActive ? { color: activeColor } : {}}
                        >
                            <Icon size={13} strokeWidth={isActive ? 2 : 1.5} />
                            <span>{tab.label}</span>
                        </Link>
                    );
                })}

                {/* BUDGET DROPDOWN */}
                <div className="relative" onMouseEnter={() => !isDemoRoute && setIsBudgetHovered(true)} onMouseLeave={() => setIsBudgetHovered(false)}>
                    <button
                        onClick={() => {
                            if (isDemoRoute) {
                                window.dispatchEvent(new CustomEvent('switchDemoGoal', { detail: 'budget' }));
                            } else {
                                setIsBudgetDropdownOpen(!isBudgetDropdownOpen);
                            }
                        }}
                        className={`
              group flex items-center gap-1.5 px-3 py-1.5 text-xs font-space font-medium tracking-widest uppercase whitespace-nowrap
              transition-all duration-200 bg-transparent
              ${isBudgetRoute
                                ? 'text-[#34D399]'
                                : 'text-[#F5F5DC]/40 hover:text-[#F5F5DC]/70'
                            }
            `}
                        aria-expanded={isBudgetDropdownOpen}
                    >
                        <Wallet size={13} strokeWidth={isBudgetRoute ? 2 : 1.5} />
                        <span className="opacity-70 font-normal">Budget</span>
                        {activeBudgetTab && (() => {
                            return (
                                <>
                                    <span className="opacity-30 mx-0.5">/</span>
                                    <span className="font-semibold">{activeBudgetTab.label}</span>
                                </>
                            );
                        })()}
                        <AnimatePresence>
                            {(isBudgetHovered || isBudgetDropdownOpen) && (
                                <motion.span
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: 'auto', opacity: 0.5, rotate: isBudgetDropdownOpen ? 180 : 0 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    transition={{ duration: 0.15, ease: 'easeOut' }}
                                    className="text-2xs overflow-hidden inline-flex items-center justify-center ml-0.5"
                                >
                                    ▼
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>

                    {/* Dropdown Menu */}
                    <AnimatePresence>
                        {isBudgetDropdownOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setIsBudgetDropdownOpen(false)}
                                />

                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                    className="absolute top-full left-0 mt-2 w-48 bg-[#1A0F2E] border border-[#34D399]/20 shadow-2xl rounded-xl overflow-hidden z-20 backdrop-blur-xl"
                                >
                                    <div className="p-2 grid grid-cols-1 gap-1">
                                        {budgetTabs.map(tab => {
                                            const Icon = tab.icon;
                                            const isActive = tab.href === '/budget'
                                                ? pathname === '/budget'
                                                : pathname.startsWith(tab.href);
                                            return (
                                                <Link
                                                    key={tab.id}
                                                    href={tab.href}
                                                    onClick={() => setIsBudgetDropdownOpen(false)}
                                                    className={`
                            flex items-center gap-3 px-3 py-2.5 text-xs font-space font-bold tracking-widest uppercase
                            rounded-lg transition-all duration-200 text-left border-none no-underline
                            ${isActive
                                                            ? 'bg-[#34D399]/20 text-[#34D399]'
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

                {/* ASSETS DROPDOWN */}
                <div className="relative" onMouseEnter={() => !isDemoRoute && setIsAssetsHovered(true)} onMouseLeave={() => setIsAssetsHovered(false)}>
                    <button
                        onClick={() => {
                            if (isDemoRoute) {
                                window.dispatchEvent(new CustomEvent('switchDemoGoal', { detail: 'both' }));
                            } else {
                                setIsAssetsDropdownOpen(!isAssetsDropdownOpen);
                            }
                        }}
                        className={`
              group flex items-center gap-1.5 px-3 py-1.5 text-xs font-space font-medium tracking-widest uppercase whitespace-nowrap
              transition-all duration-200 bg-transparent
              ${isAssetRoute
                                ? 'text-[#CC5500]'
                                : 'text-[#F5F5DC]/40 hover:text-[#F5F5DC]/70'
                            }
            `}
                        aria-expanded={isAssetsDropdownOpen}
                    >
                        <LayoutDashboard size={13} strokeWidth={isAssetRoute ? 2 : 1.5} />
                        <span className="opacity-70 font-normal">Assets</span>
                        {activeAssetTab && (() => {
                            const ActiveIcon = activeAssetTab.icon;
                            return (
                                <>
                                    <span className="opacity-30 mx-0.5">/</span>
                                    <span className="font-semibold">{activeAssetTab.label}</span>
                                </>
                            );
                        })()}
                        <AnimatePresence>
                            {(isAssetsHovered || isAssetsDropdownOpen) && (
                                <motion.span
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: 'auto', opacity: 0.5, rotate: isAssetsDropdownOpen ? 180 : 0 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    transition={{ duration: 0.15, ease: 'easeOut' }}
                                    className="text-2xs overflow-hidden inline-flex items-center justify-center ml-0.5"
                                >
                                    ▼
                                </motion.span>
                            )}
                        </AnimatePresence>
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
                            flex items-center gap-3 px-3 py-2.5 text-xs font-space font-bold tracking-widest uppercase
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

                {/* PLANNING DROPDOWN */}
                <div className="relative" onMouseEnter={() => setIsPlanningHovered(true)} onMouseLeave={() => setIsPlanningHovered(false)}>
                    <button
                        onClick={() => setIsPlanningDropdownOpen(!isPlanningDropdownOpen)}
                        className={`
              group flex items-center gap-1.5 px-3 py-1.5 text-xs font-space font-medium tracking-widest uppercase whitespace-nowrap
              transition-all duration-200 bg-transparent
              ${isPlanningRoute
                                ? 'text-[#A78BFA]'
                                : 'text-[#F5F5DC]/40 hover:text-[#F5F5DC]/70'
                            }
            `}
                        aria-expanded={isPlanningDropdownOpen}
                    >
                        <TrendingUp size={13} strokeWidth={isPlanningRoute ? 2 : 1.5} />
                        <span className="opacity-70 font-normal">Planning</span>
                        {activePlanningTab && (() => {
                            const ActiveIcon = activePlanningTab.icon;
                            return (
                                <>
                                    <span className="opacity-30 mx-0.5">/</span>
                                    <span className="font-semibold">{activePlanningTab.label}</span>
                                </>
                            );
                        })()}
                        <AnimatePresence>
                            {(isPlanningHovered || isPlanningDropdownOpen) && (
                                <motion.span
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: 'auto', opacity: 0.5, rotate: isPlanningDropdownOpen ? 180 : 0 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    transition={{ duration: 0.15, ease: 'easeOut' }}
                                    className="text-2xs overflow-hidden inline-flex items-center justify-center ml-0.5"
                                >
                                    ▼
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>

                    {/* Dropdown Menu */}
                    <AnimatePresence>
                        {isPlanningDropdownOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setIsPlanningDropdownOpen(false)}
                                />

                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                    className="absolute top-full left-0 mt-2 w-48 bg-[#1A0F2E] border border-[#A78BFA]/20 shadow-2xl rounded-xl overflow-hidden z-20 backdrop-blur-xl"
                                >
                                    <div className="p-2 grid grid-cols-1 gap-1">
                                        {planningTabs.map(tab => {
                                            const Icon = tab.icon;
                                            const isActive = pathname === tab.href;
                                            return (
                                                <Link
                                                    key={tab.id}
                                                    href={tab.href}
                                                    onClick={() => setIsPlanningDropdownOpen(false)}
                                                    className={`
                             flex items-center gap-3 px-3 py-2.5 text-xs font-space font-bold tracking-widest uppercase
                             rounded-lg transition-all duration-200 text-left border-none no-underline
                             ${isActive
                                                            ? 'bg-[#A78BFA]/20 text-[#A78BFA]'
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

                {/* LEDGER DROPDOWN */}
                <div className="relative" onMouseEnter={() => setIsLedgerHovered(true)} onMouseLeave={() => setIsLedgerHovered(false)}>
                    <button
                        onClick={() => setIsLedgerDropdownOpen(!isLedgerDropdownOpen)}
                        className={`
              group flex items-center gap-1.5 px-3 py-1.5 text-xs font-space font-medium tracking-widest uppercase whitespace-nowrap
              transition-all duration-200 bg-transparent
              ${isLedgerRoute
                                ? 'text-[#D4AF37]'
                                : 'text-[#F5F5DC]/40 hover:text-[#F5F5DC]/70'
                            }
            `}
                        aria-expanded={isLedgerDropdownOpen}
                    >
                        <BookOpen size={13} strokeWidth={isLedgerRoute ? 2 : 1.5} />
                        <span className="opacity-70 font-normal">Ledger</span>
                        {activeLedgerTab && (() => {
                            const ActiveIcon = activeLedgerTab.icon;
                            return (
                                <>
                                    <span className="opacity-30 mx-0.5">/</span>
                                    <span className="font-semibold">{activeLedgerTab.label}</span>
                                </>
                            );
                        })()}
                        <AnimatePresence>
                            {(isLedgerHovered || isLedgerDropdownOpen) && (
                                <motion.span
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: 'auto', opacity: 0.5, rotate: isLedgerDropdownOpen ? 180 : 0 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    transition={{ duration: 0.15, ease: 'easeOut' }}
                                    className="text-2xs overflow-hidden inline-flex items-center justify-center ml-0.5"
                                >
                                    ▼
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>

                    {/* Dropdown Menu */}
                    <AnimatePresence>
                        {isLedgerDropdownOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setIsLedgerDropdownOpen(false)}
                                />

                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                    className="absolute top-full left-0 mt-2 w-48 bg-[#1A0F2E] border border-[#D4AF37]/20 shadow-2xl rounded-xl overflow-hidden z-20 backdrop-blur-xl"
                                >
                                    <div className="p-2 grid grid-cols-1 gap-1">
                                        {ledgerTabs.map(tab => {
                                            const Icon = tab.icon;
                                            const isActive = pathname === tab.href;
                                            return (
                                                <Link
                                                    key={tab.id}
                                                    href={tab.href}
                                                    onClick={() => setIsLedgerDropdownOpen(false)}
                                                    className={`
                            flex items-center gap-3 px-3 py-2.5 text-xs font-space font-bold tracking-widest uppercase
                            rounded-lg transition-all duration-200 text-left border-none no-underline
                            ${isActive
                                                            ? 'bg-[#D4AF37]/20 text-[#D4AF37]'
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
                <div id="ftue-currency-pill">
                    <CurrencyPill />
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsInspectorOpen(!isInspectorOpen)}
                    className={`
            p-2 rounded-lg border
            ${isInspectorOpen
                            ? 'border-[#D4AF37]/50 text-[#D4AF37] bg-[#D4AF37]/10'
                            : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                        }
          `}
                    title="Command Center"
                >
                    <LayoutGrid size={16} />
                </Button>

                {/* User Avatar Dropdown */}
                {session?.user && (
                    <div className="relative" id="ftue-settings-mobile">
                        <button
                            id="ftue-settings"
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/10 hover:border-[#D4AF37]/50 transition-all duration-200 bg-[#D4AF37]/10 flex items-center justify-center p-0 cursor-pointer"
                            title={session.user.name || session.user.email || undefined}
                        >
                            {session.user.image ? (
                                <Image src={session.user.image} alt={session.user.name || 'User'} width={32} height={32} className="w-full h-full object-cover" unoptimized />
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
                                            <p className="text-xs font-space text-parchment/30 m-0 truncate">{session.user.email}</p>
                                        </div>
                                        <div className="p-1.5">
                                            <Link
                                                href="/profile"
                                                onClick={() => setIsUserMenuOpen(false)}
                                                className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-space font-medium tracking-wide rounded-lg text-parchment/60 hover:text-parchment hover:bg-white/5 transition-all no-underline"
                                            >
                                                <Settings size={14} className="text-[#D4AF37]/60" />
                                                Settings
                                            </Link>
                                            {(session.user as any).is_admin && (
                                                <Link
                                                    href="/admin"
                                                    onClick={() => setIsUserMenuOpen(false)}
                                                    className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-space font-medium tracking-wide rounded-lg text-[#D4AF37]/70 hover:text-[#D4AF37] hover:bg-[#D4AF37]/5 transition-all no-underline"
                                                >
                                                    <Shield size={14} className="text-[#D4AF37]/60" />
                                                    Admin Dashboard
                                                </Link>
                                            )}

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => { setIsUserMenuOpen(false); signOut({ callbackUrl: '/login' }); }}
                                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-space font-medium tracking-wide rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 text-left"
                                            >
                                                <LogOut size={14} />
                                                Sign Out
                                            </Button>
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
