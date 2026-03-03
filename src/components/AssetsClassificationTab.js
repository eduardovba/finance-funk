import React, { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/currency';
import pensionMap from '../data/pension_fund_map.json';

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
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }} className="glass-card">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 className="text-gradient" style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Asset Classification</h2>
                    <p style={{ color: 'var(--fg-secondary)', fontSize: '0.95rem' }}>
                        Override the default category or native currency for individual assets. These overrides affect entire dashboard visualizations and summaries.
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {saveConfirmation && (
                        <span style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            background: 'rgba(34, 197, 94, 0.15)',
                            color: '#22c55e',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            animation: 'fadeIn 0.3s ease'
                        }}>
                            ✓ Classifications saved
                        </span>
                    )}
                    <button
                        onClick={handleSaveClick}
                        className="btn-primary"
                        style={{ padding: '10px 24px', fontWeight: 600 }}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : 'Save Classifications'}
                    </button>
                </div>
            </header>

            <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                    type="text"
                    placeholder="Search assets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '30px',
                        border: '1px solid var(--glass-border)',
                        background: 'rgba(255,255,255,0.05)',
                        color: 'var(--fg-primary)',
                        outline: 'none',
                        marginRight: '8px',
                        width: '200px'
                    }}
                />
                <button
                    onClick={() => setFilterCategory('All')}
                    style={{
                        padding: '6px 16px', borderRadius: '30px', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                        background: filterCategory === 'All' ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)',
                        color: filterCategory === 'All' ? '#000' : 'var(--fg-secondary)'
                    }}
                >
                    All
                </button>
                {FILTER_TABS.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setFilterCategory(cat)}
                        style={{
                            padding: '6px 16px', borderRadius: '30px', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                            background: filterCategory === cat ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)',
                            color: filterCategory === cat ? '#000' : 'var(--fg-secondary)'
                        }}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)' }}>
                            <th style={{ padding: '16px', color: 'var(--fg-secondary)', fontWeight: 600 }}>Asset Name / Ticker</th>
                            <th style={{ padding: '16px', color: 'var(--fg-secondary)', fontWeight: 600 }}>Broker</th>
                            <th style={{ padding: '16px', color: 'var(--fg-secondary)', fontWeight: 600 }}>Source</th>
                            <th style={{ padding: '16px', color: 'var(--fg-secondary)', fontWeight: 600 }}>Allocation Category</th>
                            <th style={{ padding: '16px', color: 'var(--fg-secondary)', fontWeight: 600 }}>Native Currency</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAssets.map(asset => {
                            const overrideCat = localOverrides[asset.name]?.category;
                            const overrideCur = localOverrides[asset.name]?.currency;

                            const isCatOverridden = !!overrideCat && overrideCat !== asset.defaultCategory;
                            const isCurOverridden = !!overrideCur && overrideCur !== asset.defaultCurrency;

                            return (
                                <tr key={asset.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                                    <td style={{ padding: '16px', color: 'var(--fg-primary)', fontWeight: 500 }}>
                                        {asset.name}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        {asset.broker ? (
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                background: 'rgba(99, 102, 241, 0.12)',
                                                color: '#a5b4fc',
                                                border: '1px solid rgba(99, 102, 241, 0.25)'
                                            }}>
                                                {asset.broker}
                                            </span>
                                        ) : (
                                            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem' }}>—</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            background: 'rgba(255,255,255,0.06)',
                                            color: 'var(--fg-secondary)'
                                        }}>
                                            {asset.sourceType}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <select
                                                value={overrideCat || asset.defaultCategory}
                                                onChange={(e) => handleOverrideChange(asset.name, 'category', e.target.value)}
                                                style={{
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: `1px solid ${isCatOverridden ? 'var(--accent-color)' : 'var(--glass-border)'}`,
                                                    background: isCatOverridden ? 'rgba(212, 175, 55, 0.1)' : 'rgba(255,255,255,0.05)',
                                                    color: isCatOverridden ? 'var(--accent-color)' : 'var(--fg-primary)',
                                                    outline: 'none',
                                                    cursor: 'pointer',
                                                    minWidth: '160px'
                                                }}
                                            >
                                                {ALLOCATION_BUCKETS.map(cat => <option key={cat} value={cat} style={{ background: '#1a1a2e', color: '#fff' }}>{cat}</option>)}
                                            </select>
                                            {isCatOverridden && (
                                                <span style={{ fontSize: '0.75rem', background: 'var(--accent-color)', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Override (Def: {asset.defaultCategory})</span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <select
                                                value={overrideCur || asset.defaultCurrency}
                                                onChange={(e) => handleOverrideChange(asset.name, 'currency', e.target.value)}
                                                style={{
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: `1px solid ${isCurOverridden ? '#3b82f6' : 'var(--glass-border)'}`,
                                                    background: isCurOverridden ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.05)',
                                                    color: isCurOverridden ? '#3b82f6' : 'var(--fg-primary)',
                                                    outline: 'none',
                                                    cursor: 'pointer',
                                                    minWidth: '100px'
                                                }}
                                            >
                                                {CURRENCIES.map(cur => <option key={cur} value={cur} style={{ background: '#1a1a2e', color: '#fff' }}>{cur}</option>)}
                                            </select>
                                            {isCurOverridden && (
                                                <span style={{ fontSize: '0.75rem', background: '#3b82f6', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Override (Def: {asset.defaultCurrency})</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredAssets.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: 'var(--fg-secondary)' }}>
                                    No assets found matching your filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
