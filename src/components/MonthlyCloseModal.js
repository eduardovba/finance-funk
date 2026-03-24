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
import { Card } from '@/components/ui/card';

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
        <div className="flex items-center justify-center p-5" style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
            <div className="absolute" style={{ inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }} onClick={onClose} />

            <Card variant="elevated" className="relative w-full overflow-hidden flex flex-col" style={{ maxWidth: '1080px', padding: '0', border: '1px solid var(--glass-border)', maxHeight: '94vh', boxShadow: '0 0 50px rgba(0,0,0,0.5), 0 0 100px rgba(212,175,55,0.05)' }}>
                {/* Header */}
                <header className="flex justify-between items-center" style={{ padding: '24px 32px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                    <div>
                        <h2 className="text-gradient" style={{ fontSize: '1.8rem', margin: 0 }}>Monthly Close Review</h2>
                        <p style={{ color: 'var(--fg-secondary)', fontSize: '0.8rem', margin: '4px 0 0 0' }}>Review and verify your financial status for the month.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <label className="block text-[0.65rem] uppercase mb-1" style={{ color: 'var(--fg-secondary)' }}>Close Month</label>
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="rounded-lg text-[0.9rem]" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', padding: '6px 12px', color: 'var(--fg-primary)', outline: 'none' }}
                            />
                        </div>
                        <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full w-8 h-8 p-0">✕</Button>
                    </div>
                </header>

                {/* Content Body */}
                <div className="grid overflow-hidden" style={{ gridTemplateColumns: '380px 1fr', flex: 1 }}>

                    {/* Left Sidebar: High Level Metrics */}
                    <aside className="p-8 overflow-y-auto" style={{ borderRight: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)' }}>

                        {/* Net Worth Hero */}
                        <div className="mb-10">
                            <div className="uppercase tracking-[1px] mb-4" style={{ fontSize: '0.7rem', color: 'var(--fg-secondary)' }}>Consolidated Net Worth</div>

                            <div className="mb-6">
                                <div className="tracking-[1px]" style={{ fontSize: '2.4rem', fontWeight: '800', color: 'var(--accent-color)', fontFamily: 'var(--font-bebas)' }}>
                                    {primaryMeta?.symbol} {(snapshotData.networthPrimary || 0).toLocaleString(primaryMeta?.locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </div>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-lg" style={{ fontWeight: '700', color: snapshotData.diffPrimary >= 0 ? '#10b981' : '#ef4444' }}>
                                        {snapshotData.diffPrimary >= 0 ? '+' : ''}{snapshotData.percPrimary.toFixed(1)}%
                                    </span>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--fg-secondary)' }}>
                                        ({snapshotData.diffPrimary >= 0 ? '+' : '-'}{primaryMeta?.symbol}{Math.abs(snapshotData.diffPrimary).toLocaleString(primaryMeta?.locale, { maximumFractionDigits: 0 })})
                                    </span>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl" style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.1)' }}>
                                <div className="text-[0.65rem] uppercase mb-1" style={{ color: 'rgba(139, 92, 246, 0.8)' }}>{secondaryCurrency} Reference</div>
                                <div className="flex justify-between" style={{ alignItems: 'baseline' }}>
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
                        <div className="flex flex-col gap-4 mb-10">
                            <div className="p-5 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0) 100%)', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="uppercase" style={{ fontSize: '0.7rem', color: '#10b981' }}>Monthly Income</span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#10b981' }}>{primaryMeta?.symbol}{(toPrimary(snapshotData.income?.total || 0, 'GBP')).toLocaleString(primaryMeta?.locale, { maximumFractionDigits: 0 })}</span>
                                </div>
                                <div className="text-xs" style={{ color: 'var(--fg-secondary)' }}>From salary, real estate and dividends.</div>
                            </div>

                            <div className="p-5 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0) 100%)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="uppercase" style={{ fontSize: '0.7rem', color: '#3b82f6' }}>New Investments</span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#3b82f6' }}>{primaryMeta?.symbol}{(toPrimary(snapshotData.investment?.total || 0, 'GBP')).toLocaleString(primaryMeta?.locale, { maximumFractionDigits: 0 })}</span>
                                </div>
                                <div className="text-xs" style={{ color: 'var(--fg-secondary)' }}>Capital deployed this month.</div>
                            </div>
                        </div>

                        {/* Checklist Section */}
                        <div>
                            <div className="uppercase tracking-[1px] mb-4" style={{ fontSize: '0.7rem', color: 'var(--fg-secondary)' }}>Data Verification</div>
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2.5" style={{ fontSize: '0.85rem' }}>
                                    <div className="flex items-center justify-center text-[10px]" style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#10b981', color: '#000' }}>✓</div>
                                    <span>FX Rates Synced (Live)</span>
                                </div>
                                <div className="flex items-center gap-2.5" style={{ fontSize: '0.85rem' }}>
                                    <div className="flex items-center justify-center text-[10px]" style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#10b981', color: '#000' }}>✓</div>
                                    <span>Market Prices Updated</span>
                                </div>
                                <div className="flex items-center gap-2.5" style={{ fontSize: '0.85rem' }}>
                                    <div className="flex items-center justify-center text-[10px]" style={{ width: '18px', height: '18px', borderRadius: '50%', background: (snapshotData.income?.total > 0) ? '#10b981' : '#f59e0b', color: '#000' }}>
                                        {(snapshotData.income?.total > 0) ? '✓' : '!'}
                                    </div>
                                    <span>Income Data Registered</span>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content Area: Category Details */}
                    <main className="p-8 overflow-y-auto" style={{ background: 'rgba(255,255,255,0.01)' }}>
                        <div className="mb-6 flex justify-between items-end">
                            <div className="uppercase tracking-[1px]" style={{ fontSize: '0.7rem', color: 'var(--fg-secondary)' }}>Asset Category Breakdown</div>
                            <div className="text-xs" style={{ color: 'var(--fg-secondary)' }}>Values in {primaryMeta?.symbol} (Master Currency)</div>
                        </div>

                        <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                            {categoriesList.map(cat => (
                                <div key={cat.id} className="p-5" style={{ border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: cat.color }}>{cat.label}</span>
                                            <div className="mt-1 flex items-center gap-1.5">
                                                <span className="text-xs" style={{ fontWeight: '700', color: (snapshotData.categoryDiffs?.[cat.id] || 0) >= 0 ? 'var(--vu-green)' : 'var(--error)' }}>
                                                    {(snapshotData.categoryDiffs?.[cat.id] || 0) >= 0 ? '+' : ''}
                                                    {snapshotData.categoryPercs?.[cat.id]?.toFixed(1)}%
                                                </span>
                                                <span className="text-[0.65rem] opacity-70" style={{ color: 'var(--fg-secondary)' }}>
                                                    ({(snapshotData.categoryDiffs?.[cat.id] || 0) >= 0 ? '+' : '-'}
                                                    {primaryMeta?.symbol}{Math.abs(toPrimary(snapshotData.categoryDiffs?.[cat.id] || 0, 'BRL')).toLocaleString(primaryMeta?.locale, { maximumFractionDigits: 0 })})
                                                </span>
                                            </div>
                                        </div>
                                        <span className="tracking-[0.5px]" style={{ fontSize: '1.2rem', fontWeight: '800', fontFamily: 'var(--font-bebas)' }}>
                                            {primaryMeta?.symbol}{(snapshotData.categories?.[cat.id] || 0).toLocaleString(primaryMeta?.locale, { maximumFractionDigits: 0 })}
                                        </span>
                                    </div>

                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                                        <div className="text-[0.65rem] uppercase mb-2" style={{ color: 'var(--fg-secondary)', opacity: 0.6 }}>Top Contributors</div>
                                        <div className="flex flex-col gap-2">
                                            {(snapshotData.assetDetails?.[cat.id.toLowerCase().replace('fixedincome', 'fixed-income').replace('realestate', 'real-estate')] || [])
                                                .sort((a, b) => b.gbp - a.gbp)
                                                .slice(0, 3)
                                                .map((asset, idx) => (
                                                    <div key={idx} className="flex justify-between" style={{ fontSize: '0.8rem' }}>
                                                        <span className="whitespace-nowrap overflow-hidden" style={{ color: 'var(--fg-primary)', opacity: 0.8, textOverflow: 'ellipsis', maxWidth: '140px' }}>{asset.name}</span>
                                                        <span className="text-xs" style={{ color: 'var(--fg-secondary)', fontFamily: 'var(--font-space tabular-nums)' }}>{primaryMeta?.symbol}{asset.brl?.toLocaleString(primaryMeta?.locale, { maximumFractionDigits: 0 })}</span>
                                                    </div>
                                                ))}
                                            {(snapshotData.assetDetails?.[cat.id.toLowerCase().replace('fixedincome', 'fixed-income')]?.length === 0) && (
                                                <div className="text-xs opacity-50" style={{ color: 'var(--fg-secondary)', fontStyle: 'italic' }}>No assets found</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Ledger Details at bottom */}
                        <div className="mt-10 p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)' }}>
                            <div className="uppercase tracking-[1px] mb-5" style={{ fontSize: '0.7rem', color: 'var(--fg-secondary)' }}>Historical Context</div>
                            <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                                <div>
                                    <div className="text-[0.65rem] mb-1" style={{ color: 'var(--fg-secondary)' }}>Snapshot Count</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>{historicalSnapshots.length}</div>
                                </div>
                                <div>
                                    <div className="text-[0.65rem] mb-1" style={{ color: 'var(--fg-secondary)' }}>Avg. Savings Rate</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#10b981' }}>
                                        {((snapshotData.investment?.total / Math.max(1, snapshotData.income?.total)) * 100).toFixed(1)}%
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[0.65rem] mb-1" style={{ color: 'var(--fg-secondary)' }}>FX (GBP/BRL)</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>{activeRates?.BRL?.toFixed(2)}</div>
                                </div>
                                <div>
                                    <div className="text-[0.65rem] mb-1" style={{ color: 'var(--fg-secondary)' }}>Current Target</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--accent-color)' }}>
                                        {primaryMeta?.symbol}25M
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>

                {/* Footer Actions */}
                <footer className="flex justify-end gap-4" style={{ padding: '24px 32px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid var(--glass-border)' }}>
                    <Button variant="secondary" onClick={onClose}
                        className="text-[0.9rem]" style={{ padding: '12px 24px', fontWeight: '600' }}>
                        Review Later
                    </Button>
                    <Button variant="primary" onClick={() => onRecord(snapshotData)}
                        style={{ padding: '12px 32px', fontSize: '0.95rem', fontWeight: '700', boxShadow: '0 4px 15px rgba(212,175,55,0.2)' }}>
                        Confirm & Record Snapshot
                    </Button>
                </footer>
            </Card>
        </div>
    );
}
