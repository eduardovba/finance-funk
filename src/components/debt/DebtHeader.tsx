import React from 'react';
import { formatCurrency } from '@/lib/currency';
import { convertCurrency } from '@/lib/currency';
import _DisplayCurrencyPicker from '../DisplayCurrencyPicker';
import _HeroDetailDrawer from '../HeroDetailDrawer';
const DisplayCurrencyPicker = _DisplayCurrencyPicker as any;
const HeroDetailDrawer = _HeroDetailDrawer as any;
import type { LenderSummary } from './types';

interface DebtHeaderProps {
    combinedLenders: string[];
    lenderSummary: Record<string, LenderSummary>;
    lenderDict: Record<string, string>;
    effectiveCurrency: string;
    topCurrency: string;
    grandTotal: number;
    rates: Record<string, number> | null | undefined;
    setExpandedLenders: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
}

export default function DebtHeader({ combinedLenders, lenderSummary, lenderDict, effectiveCurrency, topCurrency, grandTotal, rates, setExpandedLenders }: DebtHeaderProps) {
    const lenderCards = combinedLenders
        .filter(l => lenderSummary[l])
        .map(l => {
            const s = lenderSummary[l];
            const cur = lenderDict[l] || 'BRL';
            const totalInTop = convertCurrency(s.total, cur, effectiveCurrency, rates as any);
            return { lender: l, totalInTop, cur, rawTotal: s.total };
        })
        .sort((a, b) => Math.abs(b.totalInTop) - Math.abs(a.totalInTop));

    return (
        <div id="ftue-debt-header" className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden mb-12">
            <div id="ftue-debt-hero" style={{
                padding: '24px',
                background: 'linear-gradient(180deg, rgba(244, 63, 94, 0.08) 0%, rgba(255,255,255,0) 100%)',
                borderBottom: '1px solid var(--glass-border)',
                textAlign: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--fg-secondary)', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    💳 Debt Portfolio
                    <DisplayCurrencyPicker topCurrency={topCurrency} category="debt" />
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>{formatCurrency(grandTotal, effectiveCurrency)}</div>
            </div>

            {lenderCards.length > 0 && (
                <div id="ftue-debt-lenders" style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                    {lenderCards.map(item => (
                        <div key={item.lender} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 hover:bg-white/[0.06] transition-colors cursor-pointer"
                            onClick={() => {
                                const el = document.getElementById(encodeURIComponent(item.lender));
                                if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    setExpandedLenders(prev => ({ ...prev, [item.lender]: true }));
                                }
                            }}>
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-white/80 text-sm font-semibold">{item.lender}</span>
                                <span className="text-rose-400 text-sm font-bold">{formatCurrency(item.totalInTop, effectiveCurrency)}</span>
                            </div>
                            {item.cur !== effectiveCurrency && (
                                <div className="text-white/40 text-xs">≈ {formatCurrency(item.rawTotal, item.cur)}</div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <HeroDetailDrawer categoryId="debt" effectiveCurrency={effectiveCurrency} totalCurrentValue={grandTotal} />
        </div>
    );
}
