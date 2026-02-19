import { useState } from 'react';

export default function FundsEditModal({ transaction, onSave, onCancel }) {
    const [editedTransaction, setEditedTransaction] = useState(transaction || {
        date: '',
        fund: '',
        investment: 0,
        quantity: 0,
        costPerShare: 0,
        isSalaryContribution: false
    });

    const handleChange = (field, value) => {
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
                {/* Date */}
                <div>
                    <label style={{ display: 'block', color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>
                        Date
                    </label>
                    <input
                        type="date"
                        value={editedTransaction.date}
                        onChange={(e) => handleChange('date', e.target.value)}
                        style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            color: 'var(--fg-primary)',
                            fontSize: '0.9rem'
                        }}
                    />
                </div>

                {/* Fund */}
                <div>
                    <label style={{ display: 'block', color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>
                        Fund
                    </label>
                    <input
                        type="text"
                        value={editedTransaction.fund}
                        onChange={(e) => handleChange('fund', e.target.value)}
                        placeholder="e.g., XP - PVBI11"
                        style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            color: 'var(--fg-primary)',
                            fontSize: '0.9rem'
                        }}
                    />
                </div>

                {/* Investment */}
                <div>
                    <label style={{ display: 'block', color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>
                        Investment (R$)
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={editedTransaction.investment}
                        onChange={(e) => handleChange('investment', parseFloat(e.target.value) || 0)}
                        style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            color: 'var(--fg-primary)',
                            fontSize: '0.9rem'
                        }}
                    />
                </div>

                {/* Quantity */}
                <div>
                    <label style={{ display: 'block', color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>
                        Quantity of Shares
                    </label>
                    <input
                        type="number"
                        step="1"
                        value={editedTransaction.quantity}
                        onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 0)}
                        style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            color: 'var(--fg-primary)',
                            fontSize: '0.9rem'
                        }}
                    />
                </div>

                {/* Cost Per Share */}
                <div>
                    <label style={{ display: 'block', color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>
                        Cost / Share (R$)
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={editedTransaction.costPerShare}
                        onChange={(e) => handleChange('costPerShare', parseFloat(e.target.value) || 0)}
                        style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            color: 'var(--fg-primary)',
                            fontSize: '0.9rem'
                        }}
                    />
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
                <button
                    onClick={onCancel}
                    style={{
                        background: 'transparent',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '8px',
                        padding: '10px 24px',
                        color: 'var(--fg-primary)',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(255,255,255,0.05)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.background = 'transparent';
                    }}
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    className="btn-primary"
                    style={{
                        padding: '10px 24px',
                        fontSize: '0.9rem'
                    }}
                >
                    Save Changes
                </button>
            </div>
        </div>
    );
}
