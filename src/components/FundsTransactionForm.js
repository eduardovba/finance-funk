import { useState } from 'react';

export default function FundsTransactionForm({ onSubmit, onCancel }) {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        fund: '',
        investment: '',
        quantity: '',
        costPerShare: '',
        isSalaryContribution: false
    });

    const handleChange = (field, value) => {
        setFormData({ ...formData, [field]: value });

        // Auto-calculate costPerShare when investment and quantity are provided
        if (field === 'investment' || field === 'quantity') {
            const inv = field === 'investment' ? parseFloat(value) : parseFloat(formData.investment);
            const qty = field === 'quantity' ? parseInt(value) : parseInt(formData.quantity);
            if (inv && qty && qty !== 0) {
                setFormData(prev => ({ ...prev, costPerShare: (inv / qty).toFixed(2) }));
            }
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            date: formData.date,
            fund: formData.fund,
            investment: parseFloat(formData.investment) || 0,
            quantity: parseInt(formData.quantity) || 0,
            costPerShare: parseFloat(formData.costPerShare) || 0,
            isSalaryContribution: formData.isSalaryContribution || false
        });
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
            <h2 style={{ margin: '0 0 24px 0', fontSize: '1.5rem' }}>Add Fund Transaction</h2>

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Date */}
                    <div>
                        <label style={{ display: 'block', color: 'var(--fg-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>
                            Date *
                        </label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => handleChange('date', e.target.value)}
                            required
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
                            Fund *
                        </label>
                        <input
                            type="text"
                            value={formData.fund}
                            onChange={(e) => handleChange('fund', e.target.value)}
                            placeholder="e.g., XP - PVBI11"
                            required
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
                            Investment (R$) *
                            <span style={{ fontSize: '0.75rem', marginLeft: '8px', color: 'var(--fg-tertiary)' }}>
                                Use negative for sales
                            </span>
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.investment}
                            onChange={(e) => handleChange('investment', e.target.value)}
                            placeholder="0.00"
                            required
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
                            Quantity of Shares *
                            <span style={{ fontSize: '0.75rem', marginLeft: '8px', color: 'var(--fg-tertiary)' }}>
                                Use negative for sales
                            </span>
                        </label>
                        <input
                            type="number"
                            step="1"
                            value={formData.quantity}
                            onChange={(e) => handleChange('quantity', e.target.value)}
                            placeholder="0"
                            required
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
                            Cost / Share (R$) *
                            <span style={{ fontSize: '0.75rem', marginLeft: '8px', color: 'var(--fg-tertiary)' }}>
                                Auto-calculated
                            </span>
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.costPerShare}
                            onChange={(e) => handleChange('costPerShare', e.target.value)}
                            placeholder="0.00"
                            required
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
                            checked={formData.isSalaryContribution || false}
                            onChange={e => handleChange('isSalaryContribution', e.target.checked)}
                            id="fund-salary-contribution"
                            style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)' }}
                        />
                        <label htmlFor="fund-salary-contribution" style={{ color: '#fff', fontSize: '0.9rem', cursor: 'pointer' }}>
                            Funded by Salary Contribution
                        </label>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                    <button
                        type="button"
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
                        type="submit"
                        className="btn-primary"
                        style={{
                            padding: '10px 24px',
                            fontSize: '0.9rem'
                        }}
                    >
                        Add Transaction
                    </button>
                </div>
            </form>
        </div>
    );
}
