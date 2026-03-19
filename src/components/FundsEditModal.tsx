import React, { useState } from 'react';
import { Button, Input } from '@/components/ui';

interface FundsEditModalProps {
    transaction: any;
    onSave: (t: any) => void;
    onCancel: () => void;
}

export default function FundsEditModal({ transaction, onSave, onCancel }: FundsEditModalProps) {
    const [editedTransaction, setEditedTransaction] = useState(transaction || {
        date: '',
        fund: '',
        investment: 0,
        quantity: 0,
        costPerShare: 0,
        isSalaryContribution: false
    });

    const handleChange = (field: string, value: any) => {
        setEditedTransaction({ ...editedTransaction, [field]: value });
    };

    const handleSave = () => {
        onSave(editedTransaction);
    };

    return (
        <div style={{
            position: 'relative',
            background: 'var(--card-bg)',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '600px',
            width: '90vw',
            border: '1px solid var(--glass-border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '1.5rem' }}>
                Edit Transaction - <span style={{ color: 'var(--accent-color)' }}>{editedTransaction.fund}</span>
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                    <label style={{ display: 'block', color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>Date</label>
                    <Input type="date" value={editedTransaction.date} onChange={(e) => handleChange('date', e.target.value)} />
                </div>
                <div>
                    <label style={{ display: 'block', color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>Fund</label>
                    <Input type="text" value={editedTransaction.fund} onChange={(e) => handleChange('fund', e.target.value)} placeholder="e.g., XP - PVBI11" />
                </div>
                <div>
                    <label style={{ display: 'block', color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>Investment (R$)</label>
                    <Input type="number" step="0.01" value={editedTransaction.investment} onChange={(e) => handleChange('investment', parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                    <label style={{ display: 'block', color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>Quantity of Shares</label>
                    <Input type="number" step="1" value={editedTransaction.quantity} onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 0)} />
                </div>
                <div>
                    <label style={{ display: 'block', color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>Cost / Share (R$)</label>
                    <Input type="number" step="0.01" value={editedTransaction.costPerShare} onChange={(e) => handleChange('costPerShare', parseFloat(e.target.value) || 0)} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px' }}>
                    <input
                        type="checkbox"
                        checked={editedTransaction.isSalaryContribution || false}
                        onChange={e => handleChange('isSalaryContribution', e.target.checked)}
                        id="fund-edit-salary-contribution"
                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)' }}
                    />
                    <label htmlFor="fund-edit-salary-contribution" style={{ color: '#fff', fontSize: '0.9rem', cursor: 'pointer' }}>
                        Funded by Salary Contribution
                    </label>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                <Button variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button variant="primary" onClick={handleSave}>Save Changes</Button>
            </div>
        </div>
    );
}
