"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import { SUPPORTED_CURRENCIES, CURRENCY_LIST, convertCurrency } from '@/lib/currency';

function CurrencyDropdown({ selected, onSelect, otherSelected, side, isOpen, onToggle }) {
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (isOpen && inputRef.current) inputRef.current.focus();
        if (!isOpen) setSearch('');
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) onToggle(false);
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onToggle]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        const all = CURRENCY_LIST.filter(c => c.code !== otherSelected);
        if (!q) return all;
        return all.filter(c =>
            c.code.toLowerCase().includes(q) ||
            c.name.toLowerCase().includes(q)
        );
    }, [search, otherSelected]);

    // Primary & secondary pinned at top
    const { primaryCurrency, secondaryCurrency } = usePortfolio();
    const pinned = [primaryCurrency, secondaryCurrency].filter(c => c !== otherSelected);
    const pinnedSet = new Set(pinned);
    const pinnedItems = pinned.map(c => SUPPORTED_CURRENCIES[c]).filter(Boolean);
    const otherItems = filtered.filter(c => !pinnedSet.has(c.code));

    const meta = SUPPORTED_CURRENCIES[selected];

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={() => onToggle(!isOpen)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/10 transition-all duration-200 bg-transparent border-none cursor-pointer"
            >
                <span className="text-base">{meta?.flag}</span>
                <span className="text-xs font-space font-bold tracking-wider text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]">
                    {selected}
                </span>
                <span className="text-2xs text-parchment/40 ml-0.5">▼</span>
            </button>

            {isOpen && (
                <div
                    className={`absolute top-full mt-2 w-56 bg-[#0B0611] backdrop-blur-xl border border-[#D4AF37]/20 rounded-xl shadow-2xl z-[900] overflow-hidden ${side === 'left' ? 'left-0' : 'right-0'}`}
                    style={{ animation: 'fadeIn 0.15s ease-out' }}
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

                    <div className="max-h-48 overflow-y-auto">
                        {/* Pinned currencies */}
                        {pinnedItems.length > 0 && (
                            <>
                                {pinnedItems.map(c => (
                                    <button
                                        key={c.code}
                                        onClick={() => { onSelect(c.code); onToggle(false); }}
                                        className={`w-full flex items-center gap-3 px-3 py-3.5 md:py-2.5 text-left transition-all duration-150 border-none cursor-pointer active:scale-[0.98] ${c.code === selected
                                            ? 'bg-[#D4AF37]/15 text-[#D4AF37]'
                                            : 'bg-transparent text-parchment/80 hover:bg-white/5 hover:text-white'
                                            }`}
                                    >
                                        <span className="text-base">{c.flag}</span>
                                        <span className="text-xs font-space font-bold tracking-wider">{c.code}</span>
                                        <span className="text-xs text-parchment/40 ml-auto">{c.name}</span>
                                    </button>
                                ))}
                                {otherItems.length > 0 && (
                                    <div className="h-px bg-white/5 mx-2" />
                                )}
                            </>
                        )}

                        {/* Other currencies */}
                        {otherItems.map(c => (
                            <button
                                key={c.code}
                                onClick={() => { onSelect(c.code); onToggle(false); }}
                                className={`w-full flex items-center gap-3 px-3 py-3.5 md:py-2.5 text-left transition-all duration-150 border-none cursor-pointer active:scale-[0.98] ${c.code === selected
                                    ? 'bg-[#D4AF37]/15 text-[#D4AF37]'
                                    : 'bg-transparent text-parchment/80 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <span className="text-base">{c.flag}</span>
                                <span className="text-xs font-space font-bold tracking-wider">{c.code}</span>
                                <span className="text-xs text-parchment/40 ml-auto">{c.name}</span>
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

export default function CurrencyPill() {
    const {
        rates, loadingRates, lastUpdated,
        primaryCurrency, setPrimaryCurrency,
        secondaryCurrency, setSecondaryCurrency,
        rateFlipped, setRateFlipped,
    } = usePortfolio();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [leftOpen, setLeftOpen] = useState(false);
    const [rightOpen, setRightOpen] = useState(false);
    const menuRef = useRef(null);

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const liveRate = useMemo(() => {
        if (!rates) return 0;
        return rateFlipped
            ? convertCurrency(1, secondaryCurrency, primaryCurrency, rates)
            : convertCurrency(1, primaryCurrency, secondaryCurrency, rates);
    }, [rates, primaryCurrency, secondaryCurrency, rateFlipped]);

    const formattedTime = lastUpdated ? lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const primaryMeta = SUPPORTED_CURRENCIES[primaryCurrency];
    const secondaryMeta = SUPPORTED_CURRENCIES[secondaryCurrency];

    return (
        <div className="relative" ref={menuRef}>
            {/* Minimal Pill (Collapsed) */}
            <div
                className="bg-[#0B0611] backdrop-blur-md border border-[#D4AF37]/30 rounded-full px-2.5 md:px-3 py-2 md:py-1.5 flex items-center gap-1.5 md:gap-2 cursor-pointer hover:border-[#D4AF37]/50 active:scale-[0.97] transition-all duration-300 shadow-lg shadow-black/40 group"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
                {/* Left Side: Primary Flag + Code */}
                <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    <span className="text-[14px] md:text-sm">{primaryMeta?.flag}</span>
                    <span className="text-xs md:text-xs font-space font-bold text-parchment/80 group-hover:text-[#D4AF37] transition-colors">{primaryCurrency}</span>
                </div>

                <div className="hidden md:block w-px h-3 bg-white/10" />

                <div className="md:hidden text-2xs text-parchment/50 group-hover:text-[#D4AF37] pl-0.5 transition-colors">▼</div>

                {/* Center: Flip Rate Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setRateFlipped(!rateFlipped);
                    }}
                    className="hidden md:flex bg-transparent border-none p-0 flex items-center gap-1 cursor-pointer"
                >
                    <span className="text-data-xs font-space  font-bold text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">
                        {loadingRates ? '...' : liveRate.toFixed(2)}
                    </span>
                    <span className="text-2xs text-parchment/30 group-hover:text-parchment/50">⇅</span>
                </button>

                <div className="hidden md:block w-px h-3 bg-white/10" />

                {/* Right Side: Secondary Code + Flag */}
                <div className="hidden md:flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs font-space font-bold text-parchment/60 group-hover:text-[#D4AF37] transition-colors">{secondaryCurrency}</span>
                    <span className="text-sm">{secondaryMeta?.flag}</span>
                </div>
            </div>

            {/* Expanded Mini Menu */}
            {isMenuOpen && (
                <div
                    className="absolute top-full right-0 mt-3 w-64 bg-[#0B0611] backdrop-blur-2xl border border-[#D4AF37]/20 rounded-2xl shadow-2xl p-4 z-[900]"
                    style={{ animation: 'pillExpand 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
                >
                    <div className="flex flex-col gap-4">
                        {/* Currency Selectors */}
                        <div className="flex items-center justify-between pb-3 border-b border-white/5">
                            <div className="flex flex-col gap-1">
                                <span className="text-2xs font-space text-parchment/40 uppercase tracking-widest pl-2">Primary</span>
                                <CurrencyDropdown
                                    selected={primaryCurrency}
                                    onSelect={setPrimaryCurrency}
                                    otherSelected={secondaryCurrency}
                                    side="left"
                                    isOpen={leftOpen}
                                    onToggle={(v) => { setLeftOpen(v); if (v) setRightOpen(false); }}
                                />
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span className="text-2xs font-space text-parchment/40 uppercase tracking-widest pr-2">Secondary</span>
                                <CurrencyDropdown
                                    selected={secondaryCurrency}
                                    onSelect={setSecondaryCurrency}
                                    otherSelected={primaryCurrency}
                                    side="right"
                                    isOpen={rightOpen}
                                    onToggle={(v) => { setRightOpen(v); if (v) setLeftOpen(false); }}
                                />
                            </div>
                        </div>

                        {/* Detailed Rate Info */}
                        <div className="space-y-3 px-1">
                            <div>
                                <div className="text-2xs font-space text-parchment/40 uppercase tracking-widest mb-1.5">Exchange Rate</div>
                                <div className="flex items-center justify-between px-2 py-1.5 bg-white/5 rounded-lg border border-white/5">
                                    <div className="text-xs font-medium text-parchment">
                                        {rateFlipped ? (
                                            <>1 {secondaryCurrency} = {liveRate.toFixed(4)} {primaryCurrency}</>
                                        ) : (
                                            <>1 {primaryCurrency} = {liveRate.toFixed(4)} {secondaryCurrency}</>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setRateFlipped(!rateFlipped)}
                                        className="text-xs text-[#D4AF37]/60 hover:text-[#D4AF37] transition-colors bg-transparent border-none cursor-pointer font-bold"
                                    >
                                        Flip
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <div className="text-2xs font-space text-parchment/40 uppercase tracking-widest mb-1">Source</div>
                                    <div className="text-xs text-parchment font-medium flex items-center gap-1.5">
                                        <span className="grayscale opacity-50 text-xs">📈</span>
                                        Google
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xs font-space text-parchment/40 uppercase tracking-widest mb-1">Updated</div>
                                    <div className="text-xs text-parchment font-medium">{formattedTime}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes pillExpand {
                    from { opacity: 0; transform: translateY(4px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
}
