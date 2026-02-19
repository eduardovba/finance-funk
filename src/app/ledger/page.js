"use client";

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import CurrencyPill from '@/components/CurrencyPill';
import { normalizeTransactions } from '@/lib/ledgerUtils';
import { formatCurrency } from '@/lib/currency';

export default function LedgerPage() {
    const [transactions, setTransactions] = useState([]);
    const [rates, setRates] = useState({ GBP: 1, BRL: 0, USD: 0 });
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterSalary, setFilterSalary] = useState(false);
    const [filterCategory, setFilterCategory] = useState('All');
    const [filterYear, setFilterYear] = useState('All');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Rates (reuse existing logic or fetch new)
                // We'll trust the pill/context will eventually have it, but here we can just fetch one data point for BRL
                // or assume defaults. Page usually fetches market data. 
                // Let's just default to what we have or fetch `live-assets` later.
                // For now, let's focus on transactions.

                const [
                    equityRes,
                    cryptoRes,
                    pensionRes,
                    debtRes,
                    txRes, // Fixed Income / General
                    reRes // Real Estate
                ] = await Promise.all([
                    fetch('/api/equity-transactions'),
                    fetch('/api/crypto-transactions'),
                    fetch('/api/pension-transactions'),
                    fetch('/api/debt-transactions'),
                    fetch('/api/transactions'),
                    fetch('/api/real-estate')
                ]);

                const equity = await equityRes.json();
                const crypto = await cryptoRes.json();
                const pensions = await pensionRes.json();
                const debt = await debtRes.json();
                const fixedIncome = await txRes.json();
                const realEstate = await reRes.json();

                const all = normalizeTransactions({
                    equity: Array.isArray(equity) ? equity : [],
                    crypto: Array.isArray(crypto) ? crypto : [],
                    pensions: Array.isArray(pensions) ? pensions : [],
                    debt: Array.isArray(debt) ? debt : [],
                    fixedIncome: Array.isArray(fixedIncome) ? fixedIncome : [],
                    realEstate
                });

                setTransactions(all);
                setLoading(false);
            } catch (err) {
                console.error("Failed to load ledger data", err);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Filter Logic
    const filtered = transactions.filter(tr => {
        if (filterSalary && !tr.isSalaryContribution) return false;
        if (filterCategory !== 'All' && tr.category !== filterCategory) return false;
        if (filterYear !== 'All' && !tr.date.startsWith(filterYear)) return false;
        return true;
    });

    // Stats
    const totalFlowGBP = filtered.reduce((acc, tr) => {
        // Convert everything to GBP for summary? Or BRL?
        // User seems BRL focused for Dashboard, but GBP for Net Worth?
        // Let's sum in BRL for Salary Contribution (since Salary is likely BRL/GBP?)
        // Let's show base currency flow for now or just skip totals if mixed currencies.
        return acc;
    }, 0);

    const uniqueYears = [...new Set(transactions.map(t => t.date.substring(0, 4)))].sort().reverse();
    const categories = ['All', 'Equity', 'Crypto', 'Fixed Income', 'Pension', 'Debt', 'Real Estate'];

    return (
        <div style={{ display: 'flex', gap: '32px', padding: '32px', backgroundColor: 'var(--bg-primary)', minHeight: '100vh' }}>
            <Sidebar activeItem="ledger" onNavigate={(id) => window.location.href = id === 'dashboard' ? '/' : `/${id}`} />

            <main style={{ flex: 1, minWidth: 0 }}>
                <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 className="text-gradient" style={{ fontSize: '2.5rem' }}>General Ledger</h1>
                </header>

                {/* Filters */}
                <div className="glass-card" style={{ padding: '24px', marginBottom: '32px', display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '1rem' }}>
                        <input
                            type="checkbox"
                            checked={filterSalary}
                            onChange={e => setFilterSalary(e.target.checked)}
                            style={{ width: '20px', height: '20px', accentColor: 'var(--accent-color)' }}
                        />
                        <span style={{ color: filterSalary ? 'var(--accent-color)' : 'var(--fg-primary)', fontWeight: filterSalary ? 'bold' : 'normal' }}>
                            Salary Contributions Only
                        </span>
                    </label>

                    <div style={{ width: '1px', height: '40px', background: 'var(--glass-border)' }}></div>

                    <select
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                        className="glass-card"
                        style={{ padding: '8px 16px', color: 'white', minWidth: '150px' }}
                    >
                        {categories.map(c => <option key={c} value={c} style={{ background: '#111' }}>{c}</option>)}
                    </select>

                    <select
                        value={filterYear}
                        onChange={e => setFilterYear(e.target.value)}
                        className="glass-card"
                        style={{ padding: '8px 16px', color: 'white', minWidth: '100px' }}
                    >
                        <option value="All" style={{ background: '#111' }}>All Years</option>
                        {uniqueYears.map(y => <option key={y} value={y} style={{ background: '#111' }}>{y}</option>)}
                    </select>

                    <div style={{ marginLeft: 'auto', color: 'var(--fg-secondary)' }}>
                        Showing {filtered.length} transactions
                    </div>
                </div>

                {/* Table */}
                <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--fg-secondary)' }}>Loading transactions...</div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--glass-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                    <th style={{ padding: '16px', color: 'var(--fg-secondary)' }}>Date</th>
                                    <th style={{ padding: '16px', color: 'var(--fg-secondary)' }}>Category</th>
                                    <th style={{ padding: '16px', color: 'var(--fg-secondary)' }}>Description</th>
                                    <th style={{ padding: '16px', color: 'var(--fg-secondary)', textAlign: 'right' }}>Amount</th>
                                    <th style={{ padding: '16px', color: 'var(--fg-secondary)', textAlign: 'center' }}>Salary?</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((tr) => (
                                    <tr key={tr.id} style={{ borderBottom: '1px solid var(--glass-border)' }} className="ledger-row">
                                        <td style={{ padding: '16px', whiteSpace: 'nowrap' }}>{tr.date}</td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{
                                                padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem',
                                                backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)'
                                            }}>
                                                {tr.category}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px' }}>{tr.description}</td>
                                        <td style={{ padding: '16px', textAlign: 'right', fontFamily: 'monospace', fontSize: '1rem', color: tr.flow >= 0 ? 'var(--accent-color)' : 'var(--fg-primary)' }}>
                                            {formatCurrency(tr.flow, tr.currency)}
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'center' }}>
                                            {tr.isSalaryContribution ? '✅' : ''}
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: 'var(--fg-secondary)' }}>No transactions found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
}
