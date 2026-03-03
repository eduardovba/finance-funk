"use client";

import { useState, useEffect } from 'react';
import CurrencySelector from './CurrencySelector';
import { usePortfolio } from '../context/PortfolioContext';
import { convertCurrency } from '@/lib/currency';

export default function DebtTransactionForm({ onSave, onCancel, initialData = null, rates: propRates }) {
    const { primaryCurrency, rates: contextRates } = usePortfolio();
    const rates = propRates || contextRates;

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        lender: '',
        amount: '',
        currency: primaryCurrency,
        obs: '',
        isSalaryContribution: false
    });

    useEffect(() => {
        if (initialData) {
            // Heuristic: Default to BRL for editing if not specified, using value_brl
            // A smarter way would be to check if one is rounder, but BRL is safe for now as base
            setFormData({
                date: initialData.date,
                lender: initialData.lender,
                obs: initialData.obs,
                amount: initialData.value_brl || 0,
                currency: initialData.currency || 'BRL',
                isSalaryContribution: initialData.isSalaryContribution || false
            });
        }
    }, [initialData]);

    const handleSubmit = (e) => {
        e.preventDefault();

        const amount = parseFloat(formData.amount) || 0;
        let val_brl = 0;
        let val_gbp = 0;

        // Use standard convertCurrency helper
        val_gbp = convertCurrency(amount, formData.currency, 'GBP', rates);
        val_brl = convertCurrency(amount, formData.currency, 'BRL', rates);

        onSave({
            id: initialData?.id,
            date: formData.date,
            lender: formData.lender,
            obs: formData.obs,
            value_brl: val_brl,
            value_gbp: val_gbp,
            isSalaryContribution: formData.isSalaryContribution
        });
    };

    return (
        <div className="glass-card" style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            width: '100%',
            maxWidth: '450px',
            padding: '32px',
            border: '1px solid var(--glass-border)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.5)'
        }}>
            <h2 style={{ marginBottom: '24px' }}>{initialData ? 'Edit Debt' : 'Add Debt'}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '8px' }}>Date</label>
                        <input
                            type="text"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            placeholder="YYYY-MM-DD"
                            className="glass-card"
                            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '8px' }}>Lender</label>
                        <input
                            type="text"
                            value={formData.lender}
                            onChange={(e) => setFormData({ ...formData, lender: e.target.value })}
                            placeholder="e.g. Dad"
                            className="glass-card"
                            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
                    <div style={{ gridColumn: 'span 1' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '8px' }}>Value</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            placeholder="0.00"
                            className="glass-card"
                            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                        />
                    </div>
                    <div style={{ gridColumn: 'span 1' }}>
                        <CurrencySelector
                            value={formData.currency}
                            onChange={(val) => setFormData({ ...formData, currency: val })}
                        />
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '8px' }}>Observations</label>
                    <input
                        type="text"
                        value={formData.obs}
                        onChange={(e) => setFormData({ ...formData, obs: e.target.value })}
                        placeholder="Notes..."
                        className="glass-card"
                        style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                        type="checkbox"
                        checked={formData.isSalaryContribution || false}
                        onChange={e => setFormData({ ...formData, isSalaryContribution: e.target.checked })}
                        id="debt-salary-contribution"
                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)' }}
                    />
                    <label htmlFor="debt-salary-contribution" style={{ color: '#fff', fontSize: '0.9rem', cursor: 'pointer' }}>
                        Funded by Salary Contribution
                    </label>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <button type="submit" className="btn-primary" style={{ flex: 1 }}>Confirm</button>
                    <button type="button" onClick={onCancel} style={{
                        flex: 1,
                        padding: '12px 24px',
                        borderRadius: '12px',
                        border: '1px solid var(--glass-border)',
                        background: 'transparent',
                        color: '#94a3b8',
                        cursor: 'pointer'
                    }}>Cancel</button>
                </div>
            </form>
        </div>
    );
}
