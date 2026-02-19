"use client";

import { useState } from 'react';

export default function AirbnbTransactionForm({ onAdd, onCancel }) {
    const [formData, setFormData] = useState(() => {
        const now = new Date();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mmm = months[now.getMonth()];
        const yy = now.getFullYear().toString().slice(-2);
        return {
            month: `${mmm}-${yy}`,
            type: 'Revenue',
            amount: '',
            costType: 'Maintenance',
            notes: ''
        };
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const entry = {
            month: formData.month,
            type: formData.type,
            amount: parseFloat(formData.amount) || 0,
            notes: formData.notes
        };

        if (formData.type === 'Cost') {
            entry.costType = formData.costType;
        }

        onAdd(entry);
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
            <h2 style={{ marginBottom: '24px' }}>Add Airbnb Transaction</h2>
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
                            <option value="Revenue" style={{ background: '#111' }}>Revenue</option>
                            <option value="Cost" style={{ background: '#111' }}>Cost</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '8px' }}>Amount (R$)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00"
                        required
                        className="glass-card"
                        style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                    />
                </div>

                {formData.type === 'Cost' && (
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '8px' }}>Cost Type</label>
                        <select
                            value={formData.costType}
                            onChange={(e) => setFormData({ ...formData, costType: e.target.value })}
                            className="glass-card"
                            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                        >
                            <option value="Maintenance" style={{ background: '#111' }}>Maintenance</option>
                            <option value="Utilities" style={{ background: '#111' }}>Utilities</option>
                            <option value="Property Tax" style={{ background: '#111' }}>Property Tax</option>
                            <option value="Management Fee" style={{ background: '#111' }}>Management Fee</option>
                            <option value="Repairs" style={{ background: '#111' }}>Repairs</option>
                            <option value="Other" style={{ background: '#111' }}>Other</option>
                        </select>
                    </div>
                )}

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

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <button type="submit" className="btn-primary" style={{ flex: 1 }}>Add Transaction</button>
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
