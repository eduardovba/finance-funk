import React from 'react';
import { formatCurrency, convertCurrency } from '@/lib/currency';
import _DisplayCurrencyPicker from '../DisplayCurrencyPicker';
import _HeroDetailDrawer from '../HeroDetailDrawer';
const DisplayCurrencyPicker = _DisplayCurrencyPicker as any;
const HeroDetailDrawer = _HeroDetailDrawer as any;

interface CryptoHeaderProps {
    brokers: string[];
    activeHoldings: any[];
    lockedPnL: Record<string, number>;
    brokerDict: Record<string, string>;
    brokerGroups: Record<string, any[]>;
    marketData: Record<string, any>;
    rates: Record<string, number> | null;
    topCurrency: string;
    effectiveCurrency: string;
}

export default function CryptoHeader({
    brokers, activeHoldings, lockedPnL, brokerDict, brokerGroups, marketData, rates, topCurrency, effectiveCurrency
}: CryptoHeaderProps) {
    let totalBase = 0;
    let totalCostBase = 0;
    let totalLockedBase = 0;

    const brokerSummaries = brokers.map(b => {
        const items = brokerGroups[b] || [];
        const cur = brokerDict[b] || 'GBP';
        let cv = 0, pp = 0;
        items.forEach((h: any) => {
            let rawPrice = 0;
            let assetCurrency = cur;
            if (h.asset === 'Cash') {
                rawPrice = 1.0;
            } else if (h.asset === 'Monzo - Equity') {
                rawPrice = 14.41;
            } else if (h.ticker && marketData[h.ticker]) {
                rawPrice = marketData[h.ticker].price;
                assetCurrency = marketData[h.ticker].currency || 'USD';
            }

            let lp = rawPrice;
            if (activeHoldings.length > 0 && assetCurrency !== cur && rawPrice > 0 && rates) {
                if (cur === 'GBP') {
                    if (assetCurrency === 'USD') lp = rawPrice / rates.USD;
                    else if (assetCurrency === 'BRL') lp = rawPrice / rates.BRL;
                } else if (cur === 'USD') {
                    if (assetCurrency === 'GBP') lp = rawPrice * rates.USD;
                    else if (assetCurrency === 'BRL') lp = (rawPrice / rates.BRL) * rates.USD;
                } else if (cur === 'BRL') {
                    if (assetCurrency === 'GBP') lp = rawPrice * rates.BRL;
                    else if (assetCurrency === 'USD') lp = (rawPrice / rates.USD) * rates.BRL;
                }
            }

            cv += lp ? lp * Math.abs(h.qty) : h.totalCost;
            pp += h.totalCost;
        });
        const locked = lockedPnL[b] || 0;

        const toBaseCurrency = (amount: number, currency: string) => {
            if (!rates) return amount;
            return convertCurrency(amount, currency, effectiveCurrency, rates);
        };

        const cvBase = toBaseCurrency(cv, cur);
        const ppBase = toBaseCurrency(pp, cur);
        const lockedBase = toBaseCurrency(locked, cur);

        totalBase += cvBase;
        totalCostBase += ppBase;
        totalLockedBase += lockedBase;

        const pnl = cvBase - ppBase + lockedBase;
        const roi = ppBase !== 0 ? (pnl / ppBase * 100) : 0;

        return { broker: b, currentValue: cvBase, purchasePrice: ppBase, pnl, roi };
    });

    const totalPnL = totalBase - totalCostBase + totalLockedBase;
    const totalROI = totalCostBase !== 0 ? totalPnL / totalCostBase * 100 : 0;

    return (
        <div id="ftue-crypto-header" className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden mb-12">
            {/* Hero Total */}
            <div id="ftue-crypto-hero" style={{
                padding: '24px',
                background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.08) 0%, rgba(255,255,255,0) 100%)',
                borderBottom: '1px solid var(--glass-border)',
                textAlign: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--fg-secondary)', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    ₿ Crypto Portfolio
                    <DisplayCurrencyPicker topCurrency={topCurrency} category="crypto" />
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>{formatCurrency(totalBase, effectiveCurrency)}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--fg-secondary)' }}>Invested: {formatCurrency(totalCostBase, effectiveCurrency)}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: totalPnL >= 0 ? 'var(--vu-green)' : 'var(--error)' }}>
                        {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL, effectiveCurrency)} ({totalROI >= 0 ? '+' : ''}{totalROI.toFixed(1)}%)
                    </span>
                </div>
            </div>

            {/* Broker Summary Cards */}
            <div id="ftue-crypto-exchanges" style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                {brokerSummaries.filter(s => s.currentValue > 0.01 || s.purchasePrice > 0.01).map(s => (
                    <div
                        key={s.broker}
                        onClick={() => {
                            const el = document.getElementById(encodeURIComponent(s.broker));
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className="cursor-pointer hover:bg-white/5 transition-colors"
                        style={{
                            padding: '16px',
                            borderRadius: '16px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{
                            position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px',
                            background: s.pnl >= 0 ? '#10b981' : '#ef4444',
                            borderRadius: '3px 0 0 3px'
                        }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff', marginBottom: '4px' }}>{s.broker}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--fg-secondary)' }}>Cost: {formatCurrency(s.purchasePrice, effectiveCurrency)}</div>
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

            <HeroDetailDrawer categoryId="crypto" effectiveCurrency={effectiveCurrency} totalCurrentValue={totalBase} />
        </div>
    );
}
