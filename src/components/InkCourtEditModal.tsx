import React, { useState } from 'react';
import { Button, Input } from '@/components/ui';

interface InkCourtEditModalProps {
    transaction: any;
    onSave: (t: any) => void;
    onCancel: () => void;
}

export default function InkCourtEditModal({ transaction, onSave, onCancel }: InkCourtEditModalProps) {
    const [editedTransaction, setEditedTransaction] = useState(transaction || {
        month: '',
        costs: 0,
        principal: 0,
        interest: 0,
        source: '',
        notes: '',
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
                Edit Transaction - <span style={{ color: 'var(--accent-color)' }}>{editedTransaction.month}</span>
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                    <label style={{ display: 'block', color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>Month</label>
                    <Input type="text" value={editedTransaction.month} onChange={(e) => handleChange('month', e.target.value)} placeholder="MMM-YY (e.g., Jan-26)" />
                </div>
                <div>
                    <label style={{ display: 'block', color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>Costs (£)</label>
                    <Input type="number" step="0.01" value={editedTransaction.costs} onChange={(e) => handleChange('costs', parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                    <label style={{ display: 'block', color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>Principal (£)</label>
                    <Input type="number" step="0.01" value={editedTransaction.principal} onChange={(e) => handleChange('principal', parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                    <label style={{ display: 'block', color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>Interest (£)</label>
                    <Input type="number" step="0.01" value={editedTransaction.interest} onChange={(e) => handleChange('interest', parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                    <label style={{ display: 'block', color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>Source</label>
                    <Input type="text" value={editedTransaction.source} onChange={(e) => handleChange('source', e.target.value)} placeholder="e.g., Mortgage, Deposit" />
                </div>
                <div>
                    <label style={{ display: 'block', color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>Notes (Optional)</label>
                    <Input type="text" value={editedTransaction.notes || ''} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Optional notes" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px' }}>
                    <input
                        type="checkbox"
                        checked={editedTransaction.isSalaryContribution || false}
                        onChange={e => handleChange('isSalaryContribution', e.target.checked)}
                        id="mortgage-edit-salary-contribution"
                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)' }}
                    />
                    <label htmlFor="mortgage-edit-salary-contribution" style={{ color: '#fff', fontSize: '0.9rem', cursor: 'pointer' }}>
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
