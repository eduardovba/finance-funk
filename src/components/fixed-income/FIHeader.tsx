import React from 'react';
import { formatCurrency } from '@/lib/currency';
import _DisplayCurrencyPicker from '../DisplayCurrencyPicker';
import _HeroDetailDrawer from '../HeroDetailDrawer';
const DisplayCurrencyPicker = _DisplayCurrencyPicker as any;
const HeroDetailDrawer = _HeroDetailDrawer as any;
import type { BrokerSummary } from './types';

interface FIHeaderProps {
    brokerSummaries: BrokerSummary[];
    grandTotal: number;
    grandInv: number;
    effectiveCurrency: string;
    topCurrency: string;
}

export default function FIHeader({ brokerSummaries, grandTotal, grandInv, effectiveCurrency, topCurrency }: FIHeaderProps) {
    const grandPnL = grandTotal - grandInv;
    const grandROI = Math.abs(grandInv) > 0.1 ? (grandPnL / Math.abs(grandInv) * 100) : 0;

    return (
        <div id="ftue-fi-header" className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden mb-12">
            <div id="ftue-fi-hero" style={{
                padding: '24px',
                background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(255,255,255,0) 100%)',
                borderBottom: '1px solid var(--glass-border)',
                textAlign: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--fg-secondary)', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    📊 Fixed Income Portfolio
                    <DisplayCurrencyPicker topCurrency={topCurrency} category="fixedIncome" />
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>{formatCurrency(grandTotal, effectiveCurrency)}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--fg-secondary)' }}>Invested: {formatCurrency(grandInv, effectiveCurrency)}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: grandPnL >= 0 ? 'var(--vu-green)' : 'var(--error)' }}>
                        {grandPnL >= 0 ? '+' : ''}{formatCurrency(grandPnL, effectiveCurrency)} ({grandROI >= 0 ? '+' : ''}{grandROI.toFixed(1)}%)
                    </span>
                </div>
            </div>

            <div id="ftue-fi-accounts" style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                {brokerSummaries.map(s => (
                    <div key={s.broker}
                        onClick={() => {
                            const el = document.getElementById(encodeURIComponent(s.broker));
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className="cursor-pointer hover:bg-white/5 transition-colors"
                        style={{ padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}
                    >
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: s.pnl >= 0 ? '#10b981' : '#ef4444', borderRadius: '3px 0 0 3px' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff', marginBottom: '4px' }}>{s.broker}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--fg-secondary)' }}>{formatCurrency(s.nativeVal, s.nativeCur)}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>{formatCurrency(s.currentValue, effectiveCurrency)}</div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: s.pnl >= 0 ? 'var(--vu-green)' : 'var(--error)', marginTop: '2px' }}>
                                    {s.pnl >= 0 ? '+' : ''}{formatCurrency(s.pnl, effectiveCurrency)} ({s.roi >= 0 ? '+' : ''}{s.roi.toFixed(1)}%)
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <HeroDetailDrawer categoryId="fixed-income" effectiveCurrency={effectiveCurrency} totalCurrentValue={grandTotal} />
        </div>
    );
}
