"use client";

import { useState } from 'react';

export default function MortgageTransactionForm({ onAdd, onCancel }) {
    const [formData, setFormData] = useState(() => {
        const now = new Date();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mmm = months[now.getMonth()];
        const yy = now.getFullYear().toString().slice(-2);
        return {
            month: `${mmm}-${yy}`,
            type: 'Mortgage',
            total: '',
            interest: '',
            notes: 'Mortgage',
            isSalaryContribution: true // Default to true for mortgage usually? Or false? Let's default to false to be safe/consistent.
            // Actually, for mortgage, it's almost always salary. But let's stick to false or let user check it. 
            // User asked for a checkbox.
        };
    });

    const principal = (parseFloat(formData.total) || 0) - (parseFloat(formData.interest) || 0);

    const handleSubmit = (e) => {
        e.preventDefault();
        onAdd({
            month: formData.month,
            costs: parseFloat(formData.total) || 0,
            principal: principal,
            interest: parseFloat(formData.interest) || 0,
            source: formData.type,
            notes: formData.notes,
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
            <h2 style={{ marginBottom: '24px' }}>Add Mortgage Payment</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '8px' }}>Month (e.g. Feb-26)</label>
                        <input
                            type="text"
                            value={formData.month}
                            onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                            className="glass-card"
                            placeholder="MMM-YY"
                            required
                            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '8px' }}>Type</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="glass-card"
                            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                        >
                            <option value="Mortgage" style={{ background: '#111' }}>Mortgage</option>
                            <option value="Fees" style={{ background: '#111' }}>Fees</option>
                            <option value="Others" style={{ background: '#111' }}>Others</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '8px' }}>Total Paid (£)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.total}
                            onChange={(e) => setFormData({ ...formData, total: e.target.value })}
                            placeholder="0.00"
                            required
                            className="glass-card"
                            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '8px' }}>Interest (£)</label>
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
                </div>

                <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid var(--accent-color)' }}>
                    <div style={{ color: 'var(--fg-secondary)', fontSize: '0.8rem', marginBottom: '4px' }}>Calculated Principal</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--accent-color)' }}>
                        £ {principal.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '8px' }}>Notes</label>
                    <input
                        type="text"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="glass-card"
                        placeholder="Optional notes"
                        style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                        type="checkbox"
                        checked={formData.isSalaryContribution || false}
                        onChange={e => setFormData({ ...formData, isSalaryContribution: e.target.checked })}
                        id="mortgage-salary-contribution"
                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)' }}
                    />
                    <label htmlFor="mortgage-salary-contribution" style={{ color: '#fff', fontSize: '0.9rem', cursor: 'pointer' }}>
                        Funded by Salary Contribution
                    </label>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <button type="submit" className="btn-primary" style={{ flex: 1 }}>Confirm payment</button>
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
