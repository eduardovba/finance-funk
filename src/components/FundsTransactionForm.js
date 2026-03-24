import { useState } from 'react';
import CurrencySelector from './CurrencySelector';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';

export default function FundsTransactionForm({ onSubmit, onCancel }) {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        fund: '',
        investment: '',
        quantity: '',
        costPerShare: '',
        currency: 'BRL',
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

    const currencySymbol = SUPPORTED_CURRENCIES[formData.currency]?.symbol || 'R$';

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            date: formData.date,
            fund: formData.fund,
            investment: parseFloat(formData.investment) || 0,
            quantity: parseInt(formData.quantity) || 0,
            costPerShare: parseFloat(formData.costPerShare) || 0,
            currency: formData.currency,
            isSalaryContribution: formData.isSalaryContribution || false
        });
    };

    return (
        <div className="relative rounded-2xl p-8" style={{ background: 'var(--card-bg)', maxWidth: '600px', width: '90vw', border: '1px solid var(--glass-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <h2 className="text-2xl" style={{ margin: '0 0 24px 0' }}>Add Fund Transaction</h2>

            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-4">
                    {/* Date */}
                    <div>
                        <label className="block mb-1.5" style={{ color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>
                            Date *
                        </label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => handleChange('date', e.target.value)}
                            required
                            className="w-full rounded-lg text-[0.9rem]" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', padding: '10px 12px', color: 'var(--fg-primary)' }}
                        />
                    </div>

                    {/* Fund */}
                    <div>
                        <label className="block mb-1.5" style={{ color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>
                            Fund *
                        </label>
                        <input
                            type="text"
                            value={formData.fund}
                            onChange={(e) => handleChange('fund', e.target.value)}
                            placeholder="e.g., XP - PVBI11"
                            required
                            className="w-full rounded-lg text-[0.9rem]" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', padding: '10px 12px', color: 'var(--fg-primary)' }}
                        />
                    </div>

                    {/* Investment & Currency Row */}
                    <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <div>
                            <label className="block mb-1.5" style={{ color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>
                                Investment ({currencySymbol}) *
                                <span className="text-xs ml-2" style={{ color: 'var(--fg-tertiary)' }}>
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
                                className="w-full rounded-lg text-[0.9rem]" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', padding: '10px 12px', color: 'var(--fg-primary)' }}
                            />
                        </div>
                        <div>
                            <CurrencySelector
                                label="Currency *"
                                value={formData.currency}
                                onChange={(val) => handleChange('currency', val)}
                            />
                        </div>
                    </div>

                    {/* Quantity */}
                    <div>
                        <label className="block mb-1.5" style={{ color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>
                            Quantity of Shares *
                            <span className="text-xs ml-2" style={{ color: 'var(--fg-tertiary)' }}>
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
                            className="w-full rounded-lg text-[0.9rem]" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', padding: '10px 12px', color: 'var(--fg-primary)' }}
                        />
                    </div>

                    {/* Cost Per Share */}
                    <div>
                        <label className="block mb-1.5" style={{ color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>
                            Cost / Share ({currencySymbol}) *
                            <span className="text-xs ml-2" style={{ color: 'var(--fg-tertiary)' }}>
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
                            className="w-full rounded-lg text-[0.9rem]" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', padding: '10px 12px', color: 'var(--fg-primary)' }}
                        />
                    </div>

                    <div className="flex items-center gap-2" style={{ padding: '0 4px' }}>
                        <input
                            type="checkbox"
                            checked={formData.isSalaryContribution || false}
                            onChange={e => handleChange('isSalaryContribution', e.target.checked)}
                            id="fund-salary-contribution"
                            style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)' }}
                        />
                        <label htmlFor="fund-salary-contribution" className="text-[0.9rem] cursor-pointer" style={{ color: '#fff' }}>
                            Funded by Salary Contribution
                        </label>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-8">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-lg text-[0.9rem] cursor-pointer" style={{ background: 'transparent', border: '1px solid var(--glass-border)', padding: '10px 24px', color: 'var(--fg-primary)', transition: 'all 0.2s' }}
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
                        className="btn-primary text-[0.9rem]" style={{ padding: '10px 24px' }}
                    >
                        Add Transaction
                    </button>
                </div>
            </form>
        </div>
    );
}
