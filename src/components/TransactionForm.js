"use client";

import { useState, useEffect } from 'react';
import CurrencySelector from './CurrencySelector';

export default function TransactionForm({ onAdd, onCancel, initialData = null }) {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        account: 'XP',
        investment: '',
        interest: '',
        currency: 'BRL',
        notes: '',
        isSalaryContribution: false
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                // Ensure numbers are converted to strings for inputs if needed, 
                // though React handles numbers in inputs fine usually.
                investment: initialData.investment,
                interest: initialData.interest,
                isSalaryContribution: initialData.isSalaryContribution || false
            });
        }
    }, [initialData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onAdd({
            ...formData,
            id: initialData?.id, // Preserve ID if editing
            investment: parseFloat(formData.investment) || 0,
            interest: parseFloat(formData.interest) || 0,
            isSalaryContribution: formData.isSalaryContribution || false
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
            <h2 style={{ marginBottom: '24px' }}>{initialData ? 'Edit Transaction' : 'Add Transaction'}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '8px' }}>Date</label>
                        <input
                            type="text"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="glass-card"
                            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '8px' }}>Account</label>
                        <select
                            value={formData.account}
                            onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                            className="glass-card"
                            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                        >
                            <option value="XP" style={{ background: '#111' }}>XP</option>
                            <option value="Inter" style={{ background: '#111' }}>Inter</option>
                            <option value="Santander" style={{ background: '#111' }}>Santander</option>
                            <option value="Monzo" style={{ background: '#111' }}>Monzo</option>
                            <option value="NuBank" style={{ background: '#111' }}>NuBank</option>
                            <option value="Fidelity" style={{ background: '#111' }}>Fidelity</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
                    <div style={{ gridColumn: 'span 1' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '8px' }}>Amount</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.investment}
                            onChange={(e) => setFormData({ ...formData, investment: e.target.value })}
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
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '8px' }}>Interest Payment</label>
                    <input
                        type="number"
                        step="0.01"
                        value={formData.interest}
                        onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                        placeholder="0.00"
                        className="glass-card"
                        style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                        type="checkbox"
                        checked={formData.isSalaryContribution || false}
                        onChange={e => setFormData({ ...formData, isSalaryContribution: e.target.checked })}
                        id="fixed-salary-contribution"
                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)' }}
                    />
                    <label htmlFor="fixed-salary-contribution" style={{ color: '#fff', fontSize: '0.9rem', cursor: 'pointer' }}>
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
