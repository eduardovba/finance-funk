"use client";
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SUPPORTED_CURRENCIES, CURRENCY_LIST } from '@/lib/currency';
import { usePortfolio } from '@/context/PortfolioContext';

/**
 * A compact inline currency picker for hero cards.
 * Shows the effective currency (per-category override or topCurrency).
 * Includes an "Auto" option that clears the override, reverting to topCurrency.
 * 
 * @param {string} topCurrency - The computed topCurrency for this tab
 * @param {string} category - The category key (e.g. 'equity', 'crypto', 'fixedIncome', 'realEstate', 'pensions', 'debt')
 */
export default function DisplayCurrencyPicker({ topCurrency, category }) {
    const { displayCurrencyOverrides, setDisplayCurrencyOverride } = usePortfolio();
    const override = displayCurrencyOverrides?.[category] || null;
    const effectiveCurrency = override || topCurrency;
    const meta = SUPPORTED_CURRENCIES[effectiveCurrency];

    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && inputRef.current) inputRef.current.focus();
        if (!isOpen) setSearch('');
    }, [isOpen]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        if (!q) return CURRENCY_LIST;
        return CURRENCY_LIST.filter(c =>
            c.code.toLowerCase().includes(q) ||
            c.name.toLowerCase().includes(q)
        );
    }, [search]);

    const handleSelect = (code) => {
        setDisplayCurrencyOverride(category, code);
        setIsOpen(false);
    };

    const handleAutoSelect = () => {
        setDisplayCurrencyOverride(category, null);
        setIsOpen(false);
    };

    const isAutoMode = override === null;

    return (
        <div ref={containerRef} className="relative inline-flex" style={{ zIndex: 50 }}>
            {/* Trigger Pill */}
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] hover:border-white/[0.15] transition-all duration-200 cursor-pointer group"
                title="Change display currency"
            >
                <span className="text-xs">{meta?.flag}</span>
                <span className="text-[10px] font-space font-bold text-white/60 group-hover:text-white/90 tracking-wider transition-colors">
                    {effectiveCurrency}
                </span>
                {isAutoMode && (
                    <span className="text-[8px] text-white/30 font-space uppercase tracking-widest">auto</span>
                )}
                <svg className={`w-2.5 h-2.5 text-white/30 group-hover:text-white/50 transition-all duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div
                    className="absolute top-full mt-2 right-0 w-52 bg-[#0B0611] backdrop-blur-xl border border-[#D4AF37]/20 rounded-xl shadow-2xl z-[1000] overflow-hidden"
                    style={{ animation: 'fadeIn 0.15s ease-out' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Search */}
                    <div className="p-2 border-b border-white/5">
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search currency..."
                            className="w-full px-3 py-2 text-xs font-space bg-white/5 border border-white/10 rounded-lg text-parchment placeholder:text-parchment/30 outline-none focus:border-[#D4AF37]/40 transition-colors"
                        />
                    </div>

                    <div className="max-h-52 overflow-y-auto custom-scrollbar">
                        {/* Auto option */}
                        {!search && (
                            <>
                                <button
                                    onClick={handleAutoSelect}
                                    className={`w-full flex items-center gap-3 px-3 py-3 md:py-2.5 text-left transition-all duration-150 border-none cursor-pointer active:scale-[0.98] ${isAutoMode
                                        ? 'bg-[#D4AF37]/15 text-[#D4AF37]'
                                        : 'bg-transparent text-parchment/80 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <span className="text-base">🔄</span>
                                    <span className="text-xs font-space font-bold tracking-wider">Auto</span>
                                    <span className="text-[10px] text-parchment/40 ml-auto">Use native ({topCurrency})</span>
                                </button>
                                <div className="h-px bg-white/5 mx-2" />
                            </>
                        )}

                        {/* Currency list */}
                        {filtered.map(c => (
                            <button
                                key={c.code}
                                onClick={() => handleSelect(c.code)}
                                className={`w-full flex items-center gap-3 px-3 py-3 md:py-2.5 text-left transition-all duration-150 border-none cursor-pointer active:scale-[0.98] ${!isAutoMode && c.code === effectiveCurrency
                                    ? 'bg-[#D4AF37]/15 text-[#D4AF37]'
                                    : 'bg-transparent text-parchment/80 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <span className="text-base">{c.flag}</span>
                                <span className="text-xs font-space font-bold tracking-wider">{c.code}</span>
                                <span className="text-[10px] text-parchment/40 ml-auto">{c.name}</span>
                            </button>
                        ))}

                        {filtered.length === 0 && (
                            <div className="px-3 py-4 text-center text-xs text-parchment/30 font-space">
                                No currencies found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
