import React, { useState } from 'react';
import { Button, Input } from '@/components/ui';

interface AirbnbEditModalProps {
    month: string;
    transactions: any[];
    onSave: (month: string, transactions: any[]) => void;
    onCancel: () => void;
}

export default function AirbnbEditModal({ month, transactions, onSave, onCancel }: AirbnbEditModalProps) {
    const [editedTransactions, setEditedTransactions] = useState(transactions || []);

    const handleTransactionChange = (index: number, field: string, value: any) => {
        const updated = [...editedTransactions];
        updated[index] = { ...updated[index], [field]: value };
        setEditedTransactions(updated);
    };

    const handleAddTransaction = () => {
        const newTransaction = {
            id: `${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
            type: 'Revenue',
            amount: 0,
            notes: ''
        };
        setEditedTransactions([...editedTransactions, newTransaction]);
    };

    const handleDeleteTransaction = (index: number) => {
        const updated = editedTransactions.filter((_: any, i: number) => i !== index);
        setEditedTransactions(updated);
    };

    const handleSave = () => {
        onSave(month, editedTransactions);
    };

    return (
        <div style={{
            position: 'relative',
            background: 'var(--card-bg)',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '800px',
            width: '90vw',
            maxHeight: '80vh',
            overflow: 'auto',
            border: '1px solid var(--glass-border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '1.5rem' }}>
                Edit Transactions - <span style={{ color: 'var(--accent-color)' }}>{month}</span>
            </h2>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                            <th style={{ padding: '12px', textAlign: 'left', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Type</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Cost Type</th>
                            <th style={{ padding: '12px', textAlign: 'right', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Amount (R$)</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Notes</th>
                            <th style={{ padding: '12px', textAlign: 'center', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {editedTransactions.map((transaction: any, index: number) => (
                            <tr key={transaction.id || index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '12px' }}>
                                    <select
                                        value={transaction.type}
                                        onChange={(e) => handleTransactionChange(index, 'type', e.target.value)}
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid var(--glass-border)',
                                            borderRadius: '6px',
                                            padding: '6px 10px',
                                            color: 'var(--fg-primary)',
                                            fontSize: '0.9rem',
                                            width: '100%'
                                        }}
                                    >
                                        <option value="Revenue">Revenue</option>
                                        <option value="Cost">Cost</option>
                                    </select>
                                </td>
                                <td style={{ padding: '12px' }}>
                                    {transaction.type === 'Cost' ? (
                                        <select
                                            value={transaction.costType || 'Maintenance'}
                                            onChange={(e) => handleTransactionChange(index, 'costType', e.target.value)}
                                            style={{
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid var(--glass-border)',
                                                borderRadius: '6px',
                                                padding: '6px 10px',
                                                color: 'var(--fg-primary)',
                                                fontSize: '0.9rem',
                                                width: '100%'
                                            }}
                                        >
                                            <option value="Maintenance">Maintenance</option>
                                            <option value="Utilities">Utilities</option>
                                            <option value="Property Tax">Property Tax</option>
                                            <option value="Management Fee">Management Fee</option>
                                            <option value="Repairs">Repairs</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    ) : (
                                        <span style={{ color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>-</span>
                                    )}
                                </td>
                                <td style={{ padding: '12px' }}>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={transaction.amount}
                                        onChange={(e) => handleTransactionChange(index, 'amount', parseFloat(e.target.value) || 0)}
                                        className="text-right"
                                    />
                                </td>
                                <td style={{ padding: '12px' }}>
                                    <Input
                                        type="text"
                                        value={transaction.notes || ''}
                                        onChange={(e) => handleTransactionChange(index, 'notes', e.target.value)}
                                        placeholder="Optional notes"
                                    />
                                </td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <Button variant="danger" size="sm" onClick={() => handleDeleteTransaction(index)}>Delete</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Button variant="primary" size="sm" onClick={handleAddTransaction} className="mt-5">
                + Add Transaction
            </Button>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                <Button variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button variant="primary" onClick={handleSave}>Save Changes</Button>
            </div>
        </div>
    );
}
