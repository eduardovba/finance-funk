'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, ArrowLeftRight, Grid3X3, Upload, ChevronDown } from 'lucide-react';
import useBudgetStore from '@/stores/useBudgetStore';
import { SUPPORTED_CURRENCIES, type CurrencyInfo } from '@/lib/currency';

const TABS = [
    { href: '/budget', label: 'Overview', icon: LayoutDashboard },
    { href: '/budget/transactions', label: 'Transactions', icon: ArrowLeftRight },
    { href: '/budget/categories', label: 'Planner', icon: Grid3X3 },
    { href: '/budget/import', label: 'Import', icon: Upload },
];

const CURRENCY_OPTIONS: CurrencyInfo[] = Object.values(SUPPORTED_CURRENCIES);

function isActive(href: string, pathname: string): boolean {
    return href === '/budget' ? pathname === '/budget' : pathname.startsWith(href);
}

export default function BudgetTabs() {
    const pathname = usePathname();
    const { displayCurrency, setAndPersistCurrency, hydrateSettings } = useBudgetStore();
    const [currencyOpen, setCurrencyOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Hydrate currency preference from kv_store on mount
    useEffect(() => {
        hydrateSettings();
    }, [hydrateSettings]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setCurrencyOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const currentCurrencyMeta = SUPPORTED_CURRENCIES[displayCurrency] ?? SUPPORTED_CURRENCIES.BRL;

    return (
        <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] px-2 py-1.5 flex items-center justify-between gap-2 mb-6">
            {/* Tab Pills */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const active = isActive(tab.href, pathname);
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={`
                                flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-space font-medium
                                tracking-wider uppercase whitespace-nowrap no-underline transition-all duration-200
                                ${active
                                    ? 'bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30 shadow-[0_0_12px_rgba(52,211,153,0.15)]'
                                    : 'text-[#F5F5DC]/40 hover:text-[#F5F5DC]/70 hover:bg-white/[0.04] border border-transparent'
                                }
                            `}
                        >
                            <Icon size={13} strokeWidth={active ? 2 : 1.5} />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </Link>
                    );
                })}
            </div>

            {/* Currency Selector */}
            <div ref={dropdownRef} className="relative flex-shrink-0">
                <button
                    onClick={() => setCurrencyOpen(!currencyOpen)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-space font-medium
                        tracking-wider uppercase bg-white/[0.04] border border-white/[0.06] hover:border-[#34D399]/30
                        text-[#F5F5DC]/60 hover:text-[#F5F5DC] transition-all duration-200"
                >
                    <span>{currentCurrencyMeta.flag}</span>
                    <span className="hidden sm:inline">{displayCurrency}</span>
                    <ChevronDown size={12} className={`transition-transform duration-200 ${currencyOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                    {currencyOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 top-full mt-2 w-52 bg-[#121418]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
                        >
                            <div className="p-1.5">
                                {CURRENCY_OPTIONS.map(c => {
                                    const selected = c.code === displayCurrency;
                                    return (
                                        <button
                                            key={c.code}
                                            onClick={() => { setAndPersistCurrency(c.code); setCurrencyOpen(false); }}
                                            className={`
                                                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                                                transition-all duration-150
                                                ${selected
                                                    ? 'bg-[#34D399]/15 text-[#34D399]'
                                                    : 'text-[#F5F5DC]/60 hover:bg-white/[0.06] hover:text-[#F5F5DC]'
                                                }
                                            `}
                                        >
                                            <span className="text-base">{c.flag}</span>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-space font-bold tracking-wider">{c.code}</span>
                                                <span className="text-2xs font-space text-inherit/50">{c.name}</span>
                                            </div>
                                            {selected && (
                                                <span className="ml-auto text-[#34D399] text-xs">✓</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
