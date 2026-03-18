import React from 'react';
import { formatCurrency } from '@/lib/currency';
import _DisplayCurrencyPicker from '../DisplayCurrencyPicker';
import _HeroDetailDrawer from '../HeroDetailDrawer';
const DisplayCurrencyPicker = _DisplayCurrencyPicker as any;
const HeroDetailDrawer = _HeroDetailDrawer as any;
import type { SummaryCard } from './types';

interface REHeroProps {
    totalValue: number;
    totalInvestment: number;
    totalPnL: number;
    totalROI: number;
    realisedPnL: number;
    topCurrency: string;
    effectiveCurrency: string;
    summaryCards: SummaryCard[];
}

export default function REHero({
    totalValue, totalInvestment, totalPnL, totalROI, realisedPnL,
    topCurrency, effectiveCurrency, summaryCards,
}: REHeroProps) {
    return (
        <div id="ftue-re-header" className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden mb-12">
            {/* Hero Total */}
            <div id="ftue-re-hero" style={{
                padding: '24px',
                background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(255,255,255,0) 100%)',
                borderBottom: '1px solid var(--glass-border)',
                textAlign: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--fg-secondary)', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    🏢 Real Estate Portfolio
                    <DisplayCurrencyPicker topCurrency={topCurrency} category="realEstate" />
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>{formatCurrency(totalValue, effectiveCurrency)}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--fg-secondary)' }}>Invested: {formatCurrency(totalInvestment, effectiveCurrency)}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: totalPnL >= 0 ? 'var(--vu-green)' : 'var(--error)' }}>
                        {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL, effectiveCurrency)} ({totalROI >= 0 ? '+' : ''}{totalROI.toFixed(1)}%)
                    </span>
                    {realisedPnL !== 0 && (
                        <span style={{ fontSize: '0.85rem', color: 'var(--fg-secondary)' }}>
                            Realised: <span style={{ color: realisedPnL >= 0 ? 'var(--vu-green)' : 'var(--error)', fontWeight: 600 }}>
                                {realisedPnL >= 0 ? '+' : ''}{formatCurrency(realisedPnL, effectiveCurrency)}
                            </span>
                        </span>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div id="ftue-re-cards" style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                {summaryCards.filter((s: SummaryCard) => s.currentValue > 0.01 || s.purchasePrice > 0.01).map((s: SummaryCard) => (
                    <div
                        key={s.name}
                        onClick={() => {
                            const el = document.getElementById(encodeURIComponent(s.name));
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className="cursor-pointer hover:bg-white/5 transition-colors"
                        style={{
                            padding: '16px', borderRadius: '16px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            position: 'relative', overflow: 'hidden'
                        }}
                    >
                        <div style={{
                            position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px',
                            background: s.pnl >= 0 ? '#10b981' : '#ef4444',
                            borderRadius: '3px 0 0 3px'
                        }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff', marginBottom: '4px' }}>{s.name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--fg-secondary)' }}>Cost: {formatCurrency(s.purchasePrice, s.currency)}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>{formatCurrency(s.currentValue, s.currency)}</div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: s.pnl >= 0 ? 'var(--vu-green)' : 'var(--error)', marginTop: '2px' }}>
                                    {s.pnl >= 0 ? '+' : ''}{formatCurrency(s.pnl, s.currency)} ({s.roi >= 0 ? '+' : ''}{s.roi.toFixed(1)}%)
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <HeroDetailDrawer categoryId="real-estate" effectiveCurrency={effectiveCurrency} totalCurrentValue={totalValue} />
        </div>
    );
}
