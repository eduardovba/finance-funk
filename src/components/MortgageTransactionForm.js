import { useState } from 'react';
import CurrencySelector from './CurrencySelector';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import { Card } from '@/components/ui/card';

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
            currency: 'GBP',
            notes: 'Mortgage',
            isSalaryContribution: true
        };
    });

    const currencySymbol = SUPPORTED_CURRENCIES[formData.currency]?.symbol || '£';
    const principal = (parseFloat(formData.total) || 0) - (parseFloat(formData.interest) || 0);

    const handleSubmit = (e) => {
        e.preventDefault();
        onAdd({
            month: formData.month,
            costs: parseFloat(formData.total) || 0,
            principal: principal,
            interest: parseFloat(formData.interest) || 0,
            currency: formData.currency,
            source: formData.type,
            notes: formData.notes,
            isSalaryContribution: formData.isSalaryContribution || false
        });
    };

    return (
        <Card variant="flat" className="w-full p-8" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000, maxWidth: '450px', border: '1px solid var(--glass-border)', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
            <h2 className="mb-6">Add Mortgage Payment</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div>
                        <label className="block mb-2" style={{ fontSize: '0.8rem', color: 'white' }}>Month (e.g. Feb-26)</label>
                        <input
                            type="text"
                            value={formData.month}
                            onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                            placeholder="MMM-YY"
                            required
                            className="w-full p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                        />
                    </div>
                    <div>
                        <label className="block mb-2" style={{ fontSize: '0.8rem', color: 'white' }}>Type</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                        >
                            <option value="Mortgage" style={{ background: '#111' }}>Mortgage</option>
                            <option value="Fees" style={{ background: '#111' }}>Fees</option>
                            <option value="Others" style={{ background: '#111' }}>Others</option>
                        </select>
                    </div>
                </div>

                <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1.5fr)', alignItems: 'end' }}>
                    <div>
                        <label className="block mb-2" style={{ fontSize: '0.8rem', color: 'white' }}>Total Paid ({currencySymbol})</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.total}
                            onChange={(e) => setFormData({ ...formData, total: e.target.value })}
                            placeholder="0.00"
                            required
                            className="w-full p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                        />
                    </div>
                    <div>
                        <CurrencySelector
                            value={formData.currency}
                            onChange={(val) => setFormData({ ...formData, currency: val })}
                        />
                    </div>
                    <div>
                        <label className="block mb-2" style={{ fontSize: '0.8rem', color: 'white' }}>Interest ({currencySymbol})</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.interest}
                            onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                            placeholder="0.00"
                            className="w-full p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                        />
                    </div>
                </div>

                <div className="p-4 rounded-xl" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent-color)' }}>
                    <div className="mb-1" style={{ color: 'var(--fg-secondary)', fontSize: '0.8rem' }}>Calculated Principal</div>
                    <div className="text-2xl" style={{ fontWeight: '600', color: 'var(--accent-color)' }}>
                        {currencySymbol} {principal.toLocaleString(SUPPORTED_CURRENCIES[formData.currency]?.locale || 'en-GB', { minimumFractionDigits: 2 })}
                    </div>
                </div>

                <div>
                    <label className="block mb-2" style={{ fontSize: '0.8rem', color: 'white' }}>Notes</label>
                    <input
                        type="text"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Optional notes"
                        className="w-full p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={formData.isSalaryContribution || false}
                        onChange={e => setFormData({ ...formData, isSalaryContribution: e.target.checked })}
                        id="mortgage-salary-contribution"
                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)' }}
                    />
                    <label htmlFor="mortgage-salary-contribution" className="text-[0.9rem] cursor-pointer" style={{ color: '#fff' }}>
                        Funded by Salary Contribution
                    </label>
                </div>

                <div className="flex gap-3 mt-3">
                    <button type="submit" className="btn-primary" style={{ flex: 1 }}>Confirm payment</button>
                    <button type="button" onClick={onCancel} className="rounded-xl cursor-pointer" style={{ flex: 1, padding: '12px 24px', border: '1px solid var(--glass-border)', background: 'transparent', color: '#94a3b8' }}>Cancel</button>
                </div>
            </form>
        </Card>
    );
}
