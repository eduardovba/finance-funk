"use client";

import { usePortfolio } from '@/context/PortfolioContext';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import { useState, useMemo, useRef, useEffect } from 'react';

export default function CurrencySelector({ value, onChange, label = "" }) {
    const { primaryCurrency, secondaryCurrency } = usePortfolio();
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);

    const selectedCurrency = SUPPORTED_CURRENCIES[value] || SUPPORTED_CURRENCIES['GBP'];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const sortedCurrencies = useMemo(() => {
        const all = Object.values(SUPPORTED_CURRENCIES);

        // Filter by search
        const filtered = all.filter(c =>
            c.code.toLowerCase().includes(search.toLowerCase()) ||
            c.name.toLowerCase().includes(search.toLowerCase())
        );

        // Separate pinned and others
        const pinned = [];
        const others = [];

        // We want primary and secondary at the top
        // But if they are the same, don't duplicate
        const topCodes = [primaryCurrency];
        if (secondaryCurrency !== primaryCurrency) topCodes.push(secondaryCurrency);

        filtered.forEach(c => {
            if (topCodes.includes(c.code)) {
                pinned.push(c);
            } else {
                others.push(c);
            }
        });

        // Sort pinned by their order in topCodes
        pinned.sort((a, b) => topCodes.indexOf(a.code) - topCodes.indexOf(b.code));

        return { pinned, others };
    }, [search, primaryCurrency, secondaryCurrency]);

    return (
        <div ref={containerRef} className="relative w-full">
            {label && <label className="block text-sm text-parchment/60 mb-2">{label}</label>}

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-white font-space tabular-nums"
            >
                <div className="flex items-center gap-3">
                    <span className="text-xl">{selectedCurrency.flag}</span>
                    <span className="font-bold">{selectedCurrency.code}</span>
                </div>
                <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute z-[900] mt-2 w-full bg-[#1A0F2E] border border-record/30 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 border-b border-white/5">
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search currency..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-data-sm text-white focus:outline-none focus:border-record/50 font-space "
                        />
                    </div>

                    <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                        {sortedCurrencies.pinned.length > 0 && (
                            <div className="p-1">
                                <div className="px-3 py-1 text-xs uppercase tracking-widest text-[#D4AF37] opacity-60 font-bold">Preferred</div>
                                {sortedCurrencies.pinned.map(c => (
                                    <button
                                        key={`pinned-${c.code}`}
                                        type="button"
                                        onClick={() => {
                                            onChange(c.code);
                                            setIsOpen(false);
                                            setSearch('');
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${value === c.code ? 'bg-record/20 text-[#D4AF37]' : 'hover:bg-white/5 text-parchment/80'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">{c.flag}</span>
                                            <span className="font-bold text-sm">{c.code}</span>
                                        </div>
                                        {value === c.code && <div className="w-1.5 h-1.5 rounded-full bg-record shadow-[0_0_8px_#D4AF37]" />}
                                    </button>
                                ))}
                                <div className="h-px bg-white/5 my-1 mx-2" />
                            </div>
                        )}

                        <div className="p-1">
                            {sortedCurrencies.others.map(c => (
                                <button
                                    key={`other-${c.code}`}
                                    type="button"
                                    onClick={() => {
                                        onChange(c.code);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${value === c.code ? 'bg-record/20 text-[#D4AF37]' : 'hover:bg-white/5 text-parchment/80'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">{c.flag}</span>
                                        <span className="font-bold text-sm">{c.code}</span>
                                        <span className="text-xs opacity-40 truncate max-w-[80px]">{c.name}</span>
                                    </div>
                                    {value === c.code && <div className="w-1.5 h-1.5 rounded-full bg-record" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
