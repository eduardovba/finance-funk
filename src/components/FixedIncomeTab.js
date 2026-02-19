import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/currency';
import TransactionLedger from './TransactionLedger';

export default function FixedIncomeTab({ transactions, rates, onAddClick, onDeleteClick, onEditClick }) {
    const [ledgerOpen, setLedgerOpen] = useState(false);

    // Helper to derive Fixed Income balances and ROI from transactions
    const deriveFixedIncomeData = () => {
        const accountMap = {};
        const normalizedName = (name) => {
            if (!name) return 'Unknown';
            const lower = name.toLowerCase();
            if (lower.includes('nubank')) return 'NuBank';
            if (lower.includes('xp')) return 'XP';
            if (lower.includes('inter')) return 'Inter';
            if (lower.includes('santander')) return 'Santander';
            if (lower.includes('monzo')) return 'Monzo';
            if (lower.includes('fidelity')) return 'Fidelity';
            return name;
        };

        transactions.forEach(tr => {
            const gbpVal = tr.currency === 'GBP' ? tr.investment + tr.interest : (tr.investment + tr.interest) / rates.BRL;
            const invGbp = tr.currency === 'GBP' ? tr.investment : tr.investment / rates.BRL;

            const name = normalizedName(tr.account);
            if (!accountMap[name]) {
                accountMap[name] = { name, gbp: 0, brl: 0, usd: 0, investment: 0 };
            }
            accountMap[name].gbp += gbpVal;
            accountMap[name].investment += invGbp;
        });

        const assets = Object.values(accountMap)
            .map(acc => {
                const brl = acc.gbp * rates.BRL;
                const usd = acc.gbp * rates.USD;
                const roi = acc.investment !== 0 ? ((acc.gbp - acc.investment) / Math.abs(acc.investment)) * 100 : 0;

                return {
                    name: acc.name,
                    gbp: acc.gbp,
                    brl: brl,
                    usd: usd,
                    investment: acc.investment,
                    roi: roi
                };
            })
            .filter(asset => asset.brl >= 10);

        // Sort by BRL descending
        const sortedAssets = [...assets].sort((a, b) => b.brl - a.brl);

        const totalGbp = assets.reduce((sum, a) => sum + a.gbp, 0);
        const totalBrl = assets.reduce((sum, a) => sum + a.brl, 0);
        const totalUsd = assets.reduce((sum, a) => sum + a.usd, 0);
        const totalInv = assets.reduce((sum, a) => sum + a.investment, 0);
        const totalRoi = totalInv !== 0 ? ((totalGbp - totalInv) / Math.abs(totalInv)) * 100 : 0;
        const totalPnL = totalGbp - totalInv;

        return {
            assets: sortedAssets,
            totalGbp,
            totalBrl,
            totalUsd,
            totalInv,
            totalRoi,
            totalPnL
        };
    };

    const { assets, totalGbp, totalBrl, totalUsd, totalInv, totalRoi, totalPnL } = deriveFixedIncomeData();

    // Sort transactions for ledger: Newer (mostly recent) first
    // Assuming date format DD/MM/YYYY
    const sortedTransactions = [...transactions].sort((a, b) => {
        const dateA = a.date ? a.date.split('/').reverse().join('-') : '';
        const dateB = b.date ? b.date.split('/').reverse().join('-') : '';
        return dateB.localeCompare(dateA);
    });

    // Styling helpers
    const thStyle = { padding: '12px 24px', textAlign: 'left', color: 'var(--fg-secondary)', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.05)' };


    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 className="text-gradient" style={{ fontSize: '2.2rem', marginBottom: '32px', textAlign: 'center' }}>Fixed Income Consolidated Portfolio</h2>

            {/* Consolidated Summary */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '48px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{
                    padding: '20px 24px', borderBottom: '1px solid var(--glass-border)',
                    background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, rgba(255,255,255,0) 100%)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.3rem' }}>📊 Consolidated Summary</h3>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ color: totalPnL >= 0 ? 'var(--accent-color)' : 'var(--error)', fontWeight: 700, fontSize: '1.1rem' }}>
                            {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL, 'GBP')} ({totalRoi.toFixed(1)}%)
                        </span>
                        <div style={{ fontSize: '0.85rem', color: 'var(--fg-secondary)', marginTop: '4px' }}>
                            Total: {formatCurrency(totalBrl, 'BRL')}
                        </div>
                    </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                            <th style={thStyle}>Institution</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Value (BRL)</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Value (GBP)</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Net Investment (GBP)</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>ROI %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assets.map(asset => (
                            <tr key={asset.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '14px 24px', fontWeight: 600 }}>{asset.name}</td>
                                <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(asset.brl, 'BRL')}</td>
                                <td style={{ padding: '14px 24px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(asset.gbp, 'GBP')}</td>
                                <td style={{ padding: '14px 24px', textAlign: 'right', color: 'var(--fg-secondary)' }}>{formatCurrency(asset.investment, 'GBP')}</td>
                                <td style={{ padding: '14px 24px', textAlign: 'right', color: asset.roi >= 0 ? 'var(--accent-color)' : 'var(--error)', fontWeight: 600 }}>
                                    {asset.roi >= 0 ? '+' : ''}{asset.roi.toFixed(1)}%
                                </td>
                            </tr>
                        ))}
                        <tr style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>
                            <td style={{ padding: '14px 24px', fontWeight: 700, fontSize: '1.05rem' }}>Total</td>
                            <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 700, fontSize: '1.05rem' }}>{formatCurrency(totalBrl, 'BRL')}</td>
                            <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 600, color: 'var(--fg-secondary)' }}>{formatCurrency(totalGbp, 'GBP')}</td>
                            <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 600, color: 'var(--fg-secondary)' }}>{formatCurrency(totalInv, 'GBP')}</td>
                            <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 700, fontSize: '1.05rem', color: totalRoi >= 0 ? 'var(--accent-color)' : 'var(--error)' }}>
                                {totalRoi >= 0 ? '+' : ''}{totalRoi.toFixed(1)}%
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Transaction Ledger */}
            <TransactionLedger
                transactions={sortedTransactions}
                rates={rates}
                onAddClick={onAddClick}
                onDeleteClick={onDeleteClick}
                onEditClick={onEditClick}
                collapsible={true}
            />
        </div>
    );
}
