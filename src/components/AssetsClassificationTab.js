import React, { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/currency';
import pensionMap from '../data/pension_fund_map.json';

import { usePortfolio } from '@/context/PortfolioContext';

export default function AssetsClassificationTab({
    assetClasses,
    onSave, // Function to call when save is clicked
    equityTransactions,
    cryptoTransactions,
    pensionTransactions,
    debtTransactions,
    transactions, // fixed income
    realEstate
}) {


    const [localOverrides, setLocalOverrides] = useState(assetClasses || {});
    const [isSaving, setIsSaving] = useState(false);
    const [filterCategory, setFilterCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [saveConfirmation, setSaveConfirmation] = useState(false);
    const [isExpandedMobile, setIsExpandedMobile] = useState(false); // Mobile accordion state

    // The 5 allocation buckets (used in dropdowns)
    const ALLOCATION_BUCKETS = ['Equity', 'Fixed Income', 'Real Estate', 'Crypto', 'Cash'];
    // Filter tabs include source types too
    const FILTER_TABS = ['Equity', 'Fixed Income', 'Real Estate', 'Crypto', 'Cash', 'Pensions', 'Debt'];
    const CURRENCIES = ['BRL', 'GBP', 'USD', 'EUR'];

    // Gather all unique assets across the portfolio
    const allAssets = useMemo(() => {
        const assetsMap = new Map();

        const addAsset = (name, defaultCategory, defaultCurrency = 'GBP', sourceType = null, broker = null) => {
            if (!name) return;
            if (!assetsMap.has(name)) {
                assetsMap.set(name, {
                    name,
                    defaultCategory,
                    defaultCurrency,
                    sourceType: sourceType || defaultCategory, // Track where asset originates from
                    broker: broker || null
                });
            } else if (broker && !assetsMap.get(name).broker) {
                // Backfill broker if missing
                assetsMap.get(name).broker = broker;
            }
        };

        // 1. Equity (including Cash balances at broker)
        const brokerCashSeen = new Set();
        equityTransactions?.forEach(tr => {
            const ticker = tr.ticker || tr.name || tr.asset;
            const brokerName = tr.broker;

            // Determine currency
            let currency = tr.currency || 'GBP';
            if (ticker?.endsWith('.SA')) currency = 'BRL';
            if (ticker?.endsWith('-USD') || tr.currency === 'USD') currency = 'USD';

            // Add the individual ticker/asset
            if (ticker && ticker !== 'Cash') {
                addAsset(ticker, 'Equity', currency, 'Equity', brokerName);
            }

            // Cash balance entries: ticker === 'Cash' or asset === 'Cash'
            if (ticker === 'Cash' || tr.asset === 'Cash') {
                const cashKey = brokerName ? `Cash (${brokerName})` : 'Cash';
                if (!brokerCashSeen.has(cashKey)) {
                    brokerCashSeen.add(cashKey);
                    addAsset(cashKey, 'Cash', 'GBP', 'Equity', brokerName);
                }
            }

            // Add broker-level aggregate (for assets that aren't individual tickers)
            if (brokerName && !ticker) {
                addAsset(brokerName, 'Equity', 'GBP', 'Equity', brokerName);
            }
        });

        // 2. Crypto
        cryptoTransactions?.forEach(tr => {
            addAsset(tr.asset || tr.ticker, 'Crypto', 'USD', 'Crypto', tr.broker || null);
        });

        // 3. Pensions — classify into allocation buckets but track source as 'Pensions'
        pensionTransactions?.forEach(tr => {
            let allocationCat = tr.allocationClass || 'Equity';
            if (tr.asset === 'Cash') {
                allocationCat = 'Cash';
            } else {
                const mapEntry = pensionMap.find(m => m.asset === tr.asset);
                if (mapEntry && mapEntry.allocations) {
                    let topCat = null;
                    let topVal = -1;
                    for (const [cat, val] of Object.entries(mapEntry.allocations)) {
                        if (val > topVal) { topCat = cat; topVal = val; }
                    }
                    if (topCat) allocationCat = topCat;
                }
            }

            if (tr.asset === 'Cash') {
                // Pension cash: show as "Cash (Broker)" so it appears in Cash filter
                const brokerLabel = tr.broker || tr.provider || null;
                const cashKey = brokerLabel ? `Cash (${brokerLabel})` : 'Cash (Pensions)';
                addAsset(cashKey, 'Cash', 'GBP', 'Pensions', brokerLabel);
            } else {
                addAsset(tr.asset, allocationCat, 'GBP', 'Pensions', tr.broker || tr.provider || null);
            }
        });

        // 4. Debt — default to Fixed Income, track source as 'Debt'
        debtTransactions?.forEach(tr => {
            addAsset(tr.lender || tr.name || tr.account, 'Fixed Income', 'BRL', 'Debt', null);
        });

        // 5. Fixed Income
        transactions?.forEach(tr => {
            addAsset(tr.account, 'Fixed Income', tr.currency || 'BRL', 'Fixed Income', tr.broker || null);
        });

        // 6. Real Estate
        if (realEstate?.properties) {
            realEstate.properties.forEach(p => {
                addAsset(p.name, 'Real Estate', p.currency || 'BRL', 'Real Estate', null);
            });
        }
        if (realEstate?.funds?.holdings) {
            addAsset('FIIs (Funds)', 'Real Estate', 'BRL', 'Real Estate', null);
            realEstate.funds.holdings.forEach(h => {
                addAsset(h.ticker, 'Real Estate', 'BRL', 'Real Estate', null);
            });
        }
        addAsset('Realised P&L', 'Real Estate', 'Mixed', 'Real Estate', null);

        return Array.from(assetsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [equityTransactions, cryptoTransactions, pensionTransactions, debtTransactions, transactions, realEstate]);

    const handleOverrideChange = (assetName, field, value) => {
        setLocalOverrides(prev => {
            const current = prev[assetName] || {};
            const targetAsset = allAssets.find(a => a.name === assetName);

            let newOverride = { ...current, [field]: value };

            if (field === 'category' && value === targetAsset.defaultCategory) {
                delete newOverride.category;
            }
            if (field === 'currency' && value === targetAsset.defaultCurrency) {
                delete newOverride.currency;
            }

            if (Object.keys(newOverride).length === 0) {
                const copy = { ...prev };
                delete copy[assetName];
                return copy;
            }

            return { ...prev, [assetName]: newOverride };
        });
    };

    const handleSaveClick = async () => {
        setIsSaving(true);
        await onSave(localOverrides);
        setIsSaving(false);
        setSaveConfirmation(true);
        setTimeout(() => setSaveConfirmation(false), 3000);
    };

    const filteredAssets = allAssets.filter(asset => {
        if (filterCategory !== 'All') {
            // Check if filter is a source type (Pensions, Debt) or an allocation category
            if (filterCategory === 'Pensions' || filterCategory === 'Debt') {
                if (asset.sourceType !== filterCategory) return false;
            } else {
                const currentCategory = localOverrides[asset.name]?.category || asset.defaultCategory;
                if (currentCategory !== filterCategory) return false;
            }
        }
        if (searchQuery.trim() !== '') {
            if (!asset.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        }
        return true;
    });

    return (
        <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] w-full mb-8 p-6 lg:p-8">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div
                    className="flex justify-between items-center w-full sm:w-auto cursor-pointer sm:cursor-default"
                    onClick={() => setIsExpandedMobile(!isExpandedMobile)}
                >
                    <div className="flex flex-col">
                        <h2 className="text-[#D4AF37] text-xl sm:text-2xl m-0 font-bebas tracking-widest drop-shadow-[0_0_8px_rgba(212,175,55,0.3)] uppercase">
                            Asset Classification
                        </h2>
                        <p className="text-white/40 text-xs sm:text-sm mt-1 sm:hidden">
                            Tap to configure individual asset overrides
                        </p>
                    </div>
                    <div className="sm:hidden text-[#D4AF37]">
                        {isExpandedMobile ? '▲' : '▼'}
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                    <button
                        onClick={handleSaveClick}
                        className="btn-primary w-full sm:w-auto py-2 px-6 text-sm flex justify-center items-center font-bold tracking-wider relative overflow-hidden"
                        disabled={isSaving}
                    >
                        {saveConfirmation && (
                            <span className="absolute inset-0 bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold tracking-widest z-10 backdrop-blur-sm">
                                SAVED
                            </span>
                        )}
                        {isSaving ? 'SAVING...' : 'SAVE CLASSIFICATIONS'}
                    </button>
                    <p className="hidden sm:block text-white/40 text-xs max-w-[250px] leading-tight">
                        Override default categories or currencies. These affect dashboard visualizations.
                    </p>
                </div>
            </header>

            {/* Accordion content wrapper for mobile */}
            <div className={`transition-all duration-300 overflow-hidden ${isExpandedMobile ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0 sm:max-h-full sm:opacity-100'}`}>

                <div className="mb-6 flex gap-2 flex-wrap items-center overflow-x-auto hide-scrollbar pb-2 sm:pb-0">
                    <input
                        type="text"
                        placeholder="Search assets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="px-4 py-2 rounded-full border border-white/10 bg-white/5 text-white/90 outline-none focus:border-[#D4AF37] transition-colors w-full sm:w-[200px]"
                    />
                    <button
                        onClick={() => setFilterCategory('All')}
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${filterCategory === 'All' ? 'bg-[#D4AF37] text-black' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/90'}`}
                    >
                        All
                    </button>
                    {FILTER_TABS.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFilterCategory(cat)}
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${filterCategory === cat ? 'bg-[#D4AF37] text-black' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/90'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAssets.map(asset => {
                        const overrideCat = localOverrides[asset.name]?.category;
                        const overrideCur = localOverrides[asset.name]?.currency;

                        const isCatOverridden = !!overrideCat && overrideCat !== asset.defaultCategory;
                        const isCurOverridden = !!overrideCur && overrideCur !== asset.defaultCurrency;

                        return (
                            <div key={asset.name} className="bg-white/5 border border-white/5 rounded-2xl p-4 transition-colors hover:bg-white/10">
                                <div className="mb-4">
                                    <h4 className="text-white/90 font-semibold text-lg mb-2">{asset.name}</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {asset.broker && (
                                            <span className="text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-1 rounded-lg">
                                                {asset.broker}
                                            </span>
                                        )}
                                        <span className="text-xs font-medium bg-white/10 text-white/60 px-2 py-1 rounded-lg">
                                            {asset.sourceType}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs text-white/40 font-medium">Allocation Category</label>
                                            {isCatOverridden && (
                                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-semibold tracking-wide uppercase">
                                                    Overridden
                                                </span>
                                            )}
                                        </div>
                                        <select
                                            value={overrideCat || asset.defaultCategory}
                                            onChange={(e) => handleOverrideChange(asset.name, 'category', e.target.value)}
                                            className={`w-full p-2.5 rounded-xl text-sm font-medium outline-none transition-colors appearance-none ${isCatOverridden
                                                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                                                : 'bg-white/5 border border-white/5 text-white/80 focus:border-white/20'
                                                }`}
                                        >
                                            {ALLOCATION_BUCKETS.map(cat => <option key={cat} value={cat} className="bg-slate-900 text-white">{cat}</option>)}
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs text-white/40 font-medium">Native Currency</label>
                                            {isCurOverridden && (
                                                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-semibold tracking-wide uppercase">
                                                    Overridden
                                                </span>
                                            )}
                                        </div>
                                        <select
                                            value={overrideCur || asset.defaultCurrency}
                                            onChange={(e) => handleOverrideChange(asset.name, 'currency', e.target.value)}
                                            className={`w-full p-2.5 rounded-xl text-sm font-medium outline-none transition-colors appearance-none ${isCurOverridden
                                                ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                                                : 'bg-white/5 border border-white/5 text-white/80 focus:border-white/20'
                                                }`}
                                        >
                                            {CURRENCIES.map(cur => <option key={cur} value={cur} className="bg-slate-900 text-white">{cur}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {filteredAssets.length === 0 && (
                        <div className="col-span-full py-12 text-center text-white/40 text-sm">
                            No assets found matching your filters.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
