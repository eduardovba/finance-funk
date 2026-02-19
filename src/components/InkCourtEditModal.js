import { useState } from 'react';

export default function InkCourtEditModal({ transaction, onSave, onCancel }) {
    const [editedTransaction, setEditedTransaction] = useState(transaction || {
        month: '',
        costs: 0,
        principal: 0,
        interest: 0,
        source: '',
        notes: '',
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
                Edit Transaction - <span style={{ color: 'var(--accent-color)' }}>{editedTransaction.month}</span>
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Month */}
                <div>
                    <label style={{ display: 'block', color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>
                        Month
                    </label>
                    <input
                        type="text"
                        value={editedTransaction.month}
                        onChange={(e) => handleChange('month', e.target.value)}
                        placeholder="MMM-YY (e.g., Jan-26)"
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

                {/* Costs */}
                <div>
                    <label style={{ display: 'block', color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>
                        Costs (£)
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={editedTransaction.costs}
                        onChange={(e) => handleChange('costs', parseFloat(e.target.value) || 0)}
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

                {/* Principal */}
                <div>
                    <label style={{ display: 'block', color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>
                        Principal (£)
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={editedTransaction.principal}
                        onChange={(e) => handleChange('principal', parseFloat(e.target.value) || 0)}
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

                {/* Interest */}
                <div>
                    <label style={{ display: 'block', color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>
                        Interest (£)
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={editedTransaction.interest}
                        onChange={(e) => handleChange('interest', parseFloat(e.target.value) || 0)}
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

                {/* Source */}
                <div>
                    <label style={{ display: 'block', color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>
                        Source
                    </label>
                    <input
                        type="text"
                        value={editedTransaction.source}
                        onChange={(e) => handleChange('source', e.target.value)}
                        placeholder="e.g., Mortgage, Deposit"
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

                {/* Notes */}
                <div>
                    <label style={{ display: 'block', color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>
                        Notes (Optional)
                    </label>
                    <input
                        type="text"
                        value={editedTransaction.notes || ''}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        placeholder="Optional notes"
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
                        id="mortgage-edit-salary-contribution"
                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)' }}
                    />
                    <label htmlFor="mortgage-edit-salary-contribution" style={{ color: '#fff', fontSize: '0.9rem', cursor: 'pointer' }}>
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
