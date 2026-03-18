import React from 'react';
import { formatCurrency, convertCurrency } from '@/lib/currency';
import pensionMap from '../../data/pension_fund_map.json';
import _DisplayCurrencyPicker from '../DisplayCurrencyPicker';
import _HeroDetailDrawer from '../HeroDetailDrawer';
const DisplayCurrencyPicker = _DisplayCurrencyPicker as any;
const HeroDetailDrawer = _HeroDetailDrawer as any;

interface PensionsHeaderProps {
    brokers: string[];
    activeHoldings: any[];
    lockedPnL: Record<string, number>;
    brokerDict: Record<string, string>;
    marketData: Record<string, any>;
    livePrices: Record<string, any>;
    rates: Record<string, number> | null;
    topCurrency: string;
    effectiveCurrency: string;
}

export default function PensionsHeader({
    brokers, activeHoldings, lockedPnL, brokerDict, marketData, livePrices, rates, topCurrency, effectiveCurrency
}: PensionsHeaderProps) {
    const BASE_BROKER_CURRENCY: Record<string, string> = { 'Fidelity': 'GBP', 'Hargreaves Lansdown': 'GBP', 'Legal & General': 'GBP', 'OAB': 'GBP' };

    let totalGBP = 0;
    let totalCostGBP = 0;
    let totalLockedGBP = 0;

    const brokerSummaries = brokers.map(b => {
        const items = activeHoldings.filter(h => h.broker === b);
        const cur = brokerDict[b] || BASE_BROKER_CURRENCY[b] || 'GBP';
        let cv = 0, pp = 0;

        items.forEach(h => {
            let rawPrice = 0;
            let assetCurrency = cur;

            const mapEntry = (pensionMap as any[]).find((m: any) => m.asset === h.asset);

            if (h.asset === 'Cash') {
                rawPrice = 1.0;
            } else if (mapEntry && mapEntry.ticker && marketData[mapEntry.ticker]) {
                rawPrice = marketData[mapEntry.ticker].price;
                assetCurrency = marketData[mapEntry.ticker].currency || 'USD';
            } else if (livePrices[h.asset]) {
                rawPrice = livePrices[h.asset].price;
                assetCurrency = livePrices[h.asset].currency;
            } else {
                rawPrice = h.qty > 0 ? (h.totalCost / h.qty) : 0;
            }

            let lp = rawPrice;
            if (assetCurrency !== cur && rawPrice > 0 && rates) {
                if (cur === 'GBP') {
                    if (assetCurrency === 'USD') lp = rawPrice / rates.USD;
                    else if (assetCurrency === 'BRL') lp = rawPrice / rates.BRL;
                } else if (cur === 'USD') {
                    if (assetCurrency === 'GBP') lp = rawPrice * rates.USD;
                    else if (assetCurrency === 'BRL') lp = (rawPrice / rates.BRL) * rates.USD;
                }
            }

            cv += lp ? lp * Math.abs(h.qty) : h.totalCost;
            pp += h.totalCost;
        });

        const locked = lockedPnL[b] || 0;

        const toBase = (amount: number, currency: string) => {
            if (!rates) return amount;
            return convertCurrency(amount, currency, effectiveCurrency, rates);
        };

        const cvBase = toBase(cv, cur);
        const ppBase = toBase(pp, cur);
        const lockedBase = toBase(locked, cur);

        totalGBP += cvBase;
        totalCostGBP += ppBase;
        totalLockedGBP += lockedBase;

        const pnl = cvBase - ppBase + lockedBase;
        const roi = ppBase !== 0 ? (pnl / ppBase * 100) : 0;

        return { broker: b, currentValue: cvBase, purchasePrice: ppBase, pnl, roi };
    });

    const totalPnL = totalGBP - totalCostGBP + totalLockedGBP;
    const totalROI = totalCostGBP !== 0 ? totalPnL / totalCostGBP * 100 : 0;

    return (
        <div id="ftue-pensions-header" className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden mb-12">
            {/* Hero Total */}
            <div id="ftue-pensions-hero" style={{
                padding: '24px',
                background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(255,255,255,0) 100%)',
                borderBottom: '1px solid var(--glass-border)',
                textAlign: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--fg-secondary)', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    🛡️ Pension Portfolio
                    <DisplayCurrencyPicker topCurrency={topCurrency} category="pensions" />
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>{formatCurrency(totalGBP, effectiveCurrency)}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--fg-secondary)' }}>Invested: {formatCurrency(totalCostGBP, effectiveCurrency)}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: totalPnL >= 0 ? 'var(--vu-green)' : 'var(--error)' }}>
                        {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL, effectiveCurrency)} ({totalROI >= 0 ? '+' : ''}{totalROI.toFixed(1)}%)
                    </span>
                </div>
            </div>

            {/* Broker Summary Cards */}
            <div id="ftue-pensions-providers" style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
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

            <HeroDetailDrawer categoryId="pensions" effectiveCurrency={effectiveCurrency} totalCurrentValue={totalGBP} />
        </div>
    );
}
