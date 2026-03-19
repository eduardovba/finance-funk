import React, { useState, useMemo, useEffect } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { SUPPORTED_CURRENCIES } from '../lib/currency';
import { Button } from '@/components/ui';
import {
    getFixedIncomeSummary,
    getEquitySummary,
    getCryptoSummary,
    getPensionSummary,
    getRealEstateSummary,
    getDebtSummary
} from '../lib/portfolioUtils';
import { normalizeTransactions, calculateMonthlyIncome, calculateMonthlyInvestments } from '../lib/ledgerUtils';

export default function MonthlyCloseModal({
    isOpen,
    onClose,
    onRecord,
    rawTransactions,
    rawFixedIncome,
    rawEquity,
    rawCrypto,
    rawPensions,
    rawDebt,
    rawRealEstate,
    rates,
    marketData,
    pensionPrices,
    ledgerData,
    fxHistory,
    historicalSnapshots = [],
    assetClasses = {}
}) {
    const { primaryCurrency, secondaryCurrency, toPrimary, toSecondary, rates: contextRates } = usePortfolio();
    const activeRates = rates || contextRates;
    const now = new Date();
    // Default to last month if day is < 10, else current month
    const defaultMonth = now.getDate() < 10
        ? new Date(now.getFullYear(), now.getMonth() - 1)
        : now;

    const [selectedMonth, setSelectedMonth] = useState(
        `${defaultMonth.getFullYear()}-${String(defaultMonth.getMonth() + 1).padStart(2, '0')}`
    );


    // Get the last day of the selected month
    const endDate = useMemo(() => {
        const [year, month] = selectedMonth.split('-').map(Number);
        const d = new Date(year, month, 0); // Last day of month
        return d.toISOString().split('T')[0];
    }, [selectedMonth]);

    const snapshotData = useMemo(() => {
        const fi = getFixedIncomeSummary(rawFixedIncome, rates, endDate, assetClasses);
        const eq = getEquitySummary(rawEquity, marketData, rates, endDate, assetClasses);
        const cr = getCryptoSummary(rawCrypto, marketData, rates, endDate, assetClasses);
        const pn = getPensionSummary(rawPensions, rates, pensionPrices, marketData, endDate, assetClasses);
        const re = getRealEstateSummary(rawRealEstate || {}, marketData, rates, endDate, assetClasses);
        const db = getDebtSummary(rawDebt, rates, endDate, assetClasses);

        const totalPrimary = toPrimary(fi.total.gbp + eq.total.gbp + cr.total.gbp + pn.total.gbp + re.total.gbp - db.total.gbp, 'GBP');
        const totalSecondary = toSecondary(fi.total.gbp + eq.total.gbp + cr.total.gbp + pn.total.gbp + re.total.gbp - db.total.gbp, 'GBP');

        // Income/Investments for this specific month
        const allLive = normalizeTransactions({
            equity: rawEquity,
            crypto: rawCrypto,
            pensions: rawPensions,
            debt: rawDebt,
            fixedIncome: rawFixedIncome,
            realEstate: rawRealEstate
        }, activeRates, fxHistory);

        const filteredHistoricalIncome = (ledgerData?.income || []).filter(h => h.month !== selectedMonth);
        const filteredHistoricalInvestments = (ledgerData?.investments || []).filter(h => h.month !== selectedMonth);

        const combinedIncome = calculateMonthlyIncome(allLive, rawRealEstate, filteredHistoricalIncome, rawFixedIncome);
        const monthlyInv = calculateMonthlyInvestments(allLive, filteredHistoricalInvestments);

        const monthIncome = combinedIncome.find(d => d.month === selectedMonth) || { total: 0, salary: 0, realEstate: 0, equity: 0, fixedIncome: 0 };
        const monthInvest = monthlyInv.find(d => d.month === selectedMonth) || { total: 0, equity: 0, fixedIncome: 0, realEstate: 0, pensions: 0, crypto: 0, debt: 0 };

        // MoM Variation
        const sorted = [...historicalSnapshots].sort((a, b) => a.month.localeCompare(b.month));
        const prevSnapshot = sorted.filter(s => s.month < selectedMonth).pop();

        const diffPrimary = prevSnapshot ? totalPrimary - (prevSnapshot.networthPrimary || prevSnapshot.networthBRL || 0) : 0;
        const diffSecondary = prevSnapshot ? totalSecondary - (prevSnapshot.networthSecondary || prevSnapshot.networthGBP || 0) : 0;

        const prevPrimary = prevSnapshot ? (prevSnapshot.networthPrimary || prevSnapshot.networthBRL || 0) : 0;
        const percPrimary = prevPrimary !== 0 ? (diffPrimary / prevPrimary) * 100 : 0;

        const prevSecondary = prevSnapshot ? (prevSnapshot.networthSecondary || prevSnapshot.networthGBP || 0) : 0;
        const percSecondary = prevSecondary !== 0 ? (diffSecondary / prevSecondary) * 100 : 0;

        return {
            month: selectedMonth,
            networthPrimary: totalPrimary,
            networthSecondary: totalSecondary,
            // Keep legacy keys for backward compatibility if needed, but we focus on Primary/Secondary
            networthBRL: totalPrimary,
            networthGBP: totalSecondary,
            totalminuspensionsBRL: totalPrimary - pn.total.brl,
            totalminuspensionsGBP: totalSecondary - pn.total.gbp,
            totalminuspensionsUSD: (totalSecondary - pn.total.gbp) * (activeRates?.USD || 1.28),
            recordedAt: new Date().toISOString(),
            diffPrimary,
            diffSecondary,
            percPrimary,
            percSecondary,
            categories: {
                FixedIncome: fi.total.brl,
                Equity: eq.total.brl,
                RealEstate: re.total.brl,
                Crypto: cr.total.brl,
                Pensions: pn.total.brl,
                Debt: db.total.brl
            },
            categoryDiffs: {
                FixedIncome: prevSnapshot?.categories?.FixedIncome ? fi.total.brl - prevSnapshot.categories.FixedIncome : 0,
                Equity: prevSnapshot?.categories?.Equity ? eq.total.brl - prevSnapshot.categories.Equity : 0,
                RealEstate: prevSnapshot?.categories?.RealEstate ? re.total.brl - prevSnapshot.categories.RealEstate : 0,
                Crypto: prevSnapshot?.categories?.Crypto ? cr.total.brl - prevSnapshot.categories.Crypto : 0,
                Pensions: prevSnapshot?.categories?.Pensions ? pn.total.brl - prevSnapshot.categories.Pensions : 0,
                Debt: prevSnapshot?.categories?.Debt ? db.total.brl - prevSnapshot.categories.Debt : 0
            },
            categoryPercs: {
                FixedIncome: (prevSnapshot?.categories?.FixedIncome && prevSnapshot.categories.FixedIncome !== 0) ? ((fi.total.brl - prevSnapshot.categories.FixedIncome) / prevSnapshot.categories.FixedIncome) * 100 : 0,
                Equity: (prevSnapshot?.categories?.Equity && prevSnapshot.categories.Equity !== 0) ? ((eq.total.brl - prevSnapshot.categories.Equity) / prevSnapshot.categories.Equity) * 100 : 0,
                RealEstate: (prevSnapshot?.categories?.RealEstate && prevSnapshot.categories.RealEstate !== 0) ? ((re.total.brl - prevSnapshot.categories.RealEstate) / prevSnapshot.categories.RealEstate) * 100 : 0,
                Crypto: (prevSnapshot?.categories?.Crypto && prevSnapshot.categories.Crypto !== 0) ? ((cr.total.brl - prevSnapshot.categories.Crypto) / prevSnapshot.categories.Crypto) * 100 : 0,
                Pensions: (prevSnapshot?.categories?.Pensions && prevSnapshot.categories.Pensions !== 0) ? ((pn.total.brl - prevSnapshot.categories.Pensions) / prevSnapshot.categories.Pensions) * 100 : 0,
                Debt: (prevSnapshot?.categories?.Debt && prevSnapshot.categories.Debt !== 0) ? ((db.total.brl - prevSnapshot.categories.Debt) / prevSnapshot.categories.Debt) * 100 : 0
            },
            assetDetails: {
                'fixed-income': fi.individualHoldings || fi.assets.filter(a => !a.isTotal).map(a => ({ name: a.name, brl: a.brl, gbp: a.gbp })),
                'equity': eq.individualHoldings || eq.assets.filter(a => !a.isTotal).map(a => ({ name: a.name, brl: a.brl, gbp: a.gbp })),
                'real-estate': re.individualHoldings || re.assets.filter(a => !a.isTotal).map(a => ({ name: a.name || 'Real Estate', brl: a.brl, gbp: a.gbp })),
                'crypto': cr.individualHoldings || cr.assets.filter(a => !a.isTotal).map(a => ({ name: a.name, brl: a.brl, gbp: a.gbp })),
                'pensions': pn.individualHoldings || pn.assets.filter(a => !a.isTotal).map(a => ({ name: a.name, brl: a.brl, gbp: a.gbp })),
                'debt': db.individualHoldings || db.assets.filter(a => !a.isTotal).map(a => ({ name: a.name, brl: a.brl, gbp: a.gbp }))
            },
            income: monthIncome,
            investment: monthInvest
        };
    }, [selectedMonth, endDate, rawFixedIncome, rawEquity, rawCrypto, rawPensions, rawDebt, rawRealEstate, activeRates, marketData, pensionPrices, ledgerData, fxHistory, historicalSnapshots, primaryCurrency, secondaryCurrency, toPrimary, toSecondary, assetClasses]);

    const primaryMeta = SUPPORTED_CURRENCIES[primaryCurrency];
    const secondaryMeta = SUPPORTED_CURRENCIES[secondaryCurrency];

    if (!isOpen) return null;

    const categoriesList = [
        { id: 'FixedIncome', label: 'Fixed Income', color: '#10b981' },
        { id: 'Equity', label: 'Equity', color: 'var(--accent-color)' },
        { id: 'RealEstate', label: 'Real Estate', color: '#f59e0b' },
        { id: 'Crypto', label: 'Crypto', color: '#3b82f6' },
        { id: 'Pensions', label: 'Pensions', color: '#8b5cf6' },
        { id: 'Debt', label: 'Debt', color: '#ef4444' }
    ];

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }} onClick={onClose} />

            <div className="glass-card" style={{
                position: 'relative',
                width: '100%',
                maxWidth: '1080px',
                padding: '0',
                border: '1px solid var(--glass-border)',
                maxHeight: '94vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 0 50px rgba(0,0,0,0.5), 0 0 100px rgba(212,175,55,0.05)'
            }}>
                {/* Header */}
                <header style={{ padding: '24px 32px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <div>
                        <h2 className="text-gradient" style={{ fontSize: '1.8rem', margin: 0 }}>Monthly Close Review</h2>
                        <p style={{ color: 'var(--fg-secondary)', fontSize: '0.8rem', margin: '4px 0 0 0' }}>Review and verify your financial status for the month.</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ textAlign: 'right' }}>
                            <label style={{ display: 'block', color: 'var(--fg-secondary)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '4px' }}>Close Month</label>
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                style={{
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '6px',
                                    padding: '6px 12px',
                                    color: 'var(--fg-primary)',
                                    fontSize: '0.9rem',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full w-8 h-8 p-0">✕</Button>
                    </div>
                </header>

                {/* Content Body */}
                <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', flex: 1, overflow: 'hidden' }}>

                    {/* Left Sidebar: High Level Metrics */}
                    <aside style={{ borderRight: '1px solid var(--glass-border)', padding: '32px', background: 'rgba(0,0,0,0.2)', overflowY: 'auto' }}>

                        {/* Net Worth Hero */}
                        <div style={{ marginBottom: '40px' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Consolidated Net Worth</div>

                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ fontSize: '2.4rem', fontWeight: '800', color: 'var(--accent-color)', fontFamily: 'var(--font-bebas)', letterSpacing: '1px' }}>
                                    {primaryMeta?.symbol} {(snapshotData.networthPrimary || 0).toLocaleString(primaryMeta?.locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                                    <span style={{ fontSize: '1.1rem', fontWeight: '700', color: snapshotData.diffPrimary >= 0 ? '#10b981' : '#ef4444' }}>
                                        {snapshotData.diffPrimary >= 0 ? '+' : ''}{snapshotData.percPrimary.toFixed(1)}%
                                    </span>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--fg-secondary)' }}>
                                        ({snapshotData.diffPrimary >= 0 ? '+' : '-'}{primaryMeta?.symbol}{Math.abs(snapshotData.diffPrimary).toLocaleString(primaryMeta?.locale, { maximumFractionDigits: 0 })})
                                    </span>
                                </div>
                            </div>

                            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.1)' }}>
                                <div style={{ fontSize: '0.65rem', color: 'rgba(139, 92, 246, 0.8)', textTransform: 'uppercase', marginBottom: '4px' }}>{secondaryCurrency} Reference</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#a78bfa', fontFamily: 'var(--font-bebas)' }}>
                                        {secondaryMeta?.symbol} {(snapshotData.networthSecondary || 0).toLocaleString(secondaryMeta?.locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: snapshotData.diffSecondary >= 0 ? '#10b981' : '#ef4444' }}>
                                        {snapshotData.diffSecondary >= 0 ? '+' : ''}{snapshotData.percSecondary.toFixed(1)}% ({snapshotData.diffSecondary >= 0 ? '+' : '-'}{secondaryMeta?.symbol}{Math.abs(snapshotData.diffSecondary).toLocaleString(secondaryMeta?.locale, { maximumFractionDigits: 0 })})
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Income & Investment Mini Cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
                            <div style={{ padding: '20px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0) 100%)', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '0.7rem', color: '#10b981', textTransform: 'uppercase' }}>Monthly Income</span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#10b981' }}>{primaryMeta?.symbol}{(toPrimary(snapshotData.income?.total || 0, 'GBP')).toLocaleString(primaryMeta?.locale, { maximumFractionDigits: 0 })}</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)' }}>From salary, real estate and dividends.</div>
                            </div>

                            <div style={{ padding: '20px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0) 100%)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '0.7rem', color: '#3b82f6', textTransform: 'uppercase' }}>New Investments</span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#3b82f6' }}>{primaryMeta?.symbol}{(toPrimary(snapshotData.investment?.total || 0, 'GBP')).toLocaleString(primaryMeta?.locale, { maximumFractionDigits: 0 })}</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)' }}>Capital deployed this month.</div>
                            </div>
                        </div>

                        {/* Checklist Section */}
                        <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Data Verification</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#10b981', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>✓</div>
                                    <span>FX Rates Synced (Live)</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#10b981', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>✓</div>
                                    <span>Market Prices Updated</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: (snapshotData.income?.total > 0) ? '#10b981' : '#f59e0b', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                                        {(snapshotData.income?.total > 0) ? '✓' : '!'}
                                    </div>
                                    <span>Income Data Registered</span>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content Area: Category Details */}
                    <main style={{ padding: '32px', overflowY: 'auto', background: 'rgba(255,255,255,0.01)' }}>
                        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Asset Category Breakdown</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)' }}>Values in {primaryMeta?.symbol} (Master Currency)</div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                            {categoriesList.map(cat => (
                                <div key={cat.id} className="glass-card" style={{ padding: '20px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                        <div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: cat.color }}>{cat.label}</span>
                                            <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: '700',
                                                    color: (snapshotData.categoryDiffs?.[cat.id] || 0) >= 0 ? 'var(--vu-green)' : 'var(--error)'
                                                }}>
                                                    {(snapshotData.categoryDiffs?.[cat.id] || 0) >= 0 ? '+' : ''}
                                                    {snapshotData.categoryPercs?.[cat.id]?.toFixed(1)}%
                                                </span>
                                                <span style={{ fontSize: '0.65rem', color: 'var(--fg-secondary)', opacity: 0.7 }}>
                                                    ({(snapshotData.categoryDiffs?.[cat.id] || 0) >= 0 ? '+' : '-'}
                                                    {primaryMeta?.symbol}{Math.abs(toPrimary(snapshotData.categoryDiffs?.[cat.id] || 0, 'BRL')).toLocaleString(primaryMeta?.locale, { maximumFractionDigits: 0 })})
                                                </span>
                                            </div>
                                        </div>
                                        <span style={{ fontSize: '1.2rem', fontWeight: '800', fontFamily: 'var(--font-bebas)', letterSpacing: '0.5px' }}>
                                            {primaryMeta?.symbol}{(snapshotData.categories?.[cat.id] || 0).toLocaleString(primaryMeta?.locale, { maximumFractionDigits: 0 })}
                                        </span>
                                    </div>

                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--fg-secondary)', textTransform: 'uppercase', marginBottom: '8px', opacity: 0.6 }}>Top Contributors</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {(snapshotData.assetDetails?.[cat.id.toLowerCase().replace('fixedincome', 'fixed-income').replace('realestate', 'real-estate')] || [])
                                                .sort((a, b) => b.gbp - a.gbp)
                                                .slice(0, 3)
                                                .map((asset, idx) => (
                                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                                        <span style={{ color: 'var(--fg-primary)', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{asset.name}</span>
                                                        <span style={{ color: 'var(--fg-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{primaryMeta?.symbol}{asset.brl?.toLocaleString(primaryMeta?.locale, { maximumFractionDigits: 0 })}</span>
                                                    </div>
                                                ))}
                                            {(snapshotData.assetDetails?.[cat.id.toLowerCase().replace('fixedincome', 'fixed-income')]?.length === 0) && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', opacity: 0.5, fontStyle: 'italic' }}>No assets found</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Ledger Details at bottom */}
                        <div style={{ marginTop: '40px', padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>Historical Context</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
                                <div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--fg-secondary)', marginBottom: '4px' }}>Snapshot Count</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>{historicalSnapshots.length}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--fg-secondary)', marginBottom: '4px' }}>Avg. Savings Rate</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#10b981' }}>
                                        {((snapshotData.investment?.total / Math.max(1, snapshotData.income?.total)) * 100).toFixed(1)}%
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--fg-secondary)', marginBottom: '4px' }}>FX (GBP/BRL)</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>{activeRates?.BRL?.toFixed(2)}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--fg-secondary)', marginBottom: '4px' }}>Current Target</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--accent-color)' }}>
                                        {primaryMeta?.symbol}25M
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>

                {/* Footer Actions */}
                <footer style={{ padding: '24px 32px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                    <Button variant="secondary" onClick={onClose}
                        style={{ padding: '12px 24px', fontSize: '0.9rem', fontWeight: '600' }}>
                        Review Later
                    </Button>
                    <Button variant="primary" onClick={() => onRecord(snapshotData)}
                        style={{ padding: '12px 32px', fontSize: '0.95rem', fontWeight: '700', boxShadow: '0 4px 15px rgba(212,175,55,0.2)' }}>
                        Confirm & Record Snapshot
                    </Button>
                </footer>
            </div>
        </div>
    );
}
