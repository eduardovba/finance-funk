import { useState } from 'react';
import CurrencySelector from './CurrencySelector';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import { Card } from '@/components/ui/card';

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
            currency: 'BRL',
            costType: 'Maintenance',
            notes: ''
        };
    });

    const currencySymbol = SUPPORTED_CURRENCIES[formData.currency]?.symbol || 'R$';

    const handleSubmit = (e) => {
        e.preventDefault();
        const entry = {
            month: formData.month,
            type: formData.type,
            amount: parseFloat(formData.amount) || 0,
            currency: formData.currency,
            notes: formData.notes
        };

        if (formData.type === 'Cost') {
            entry.costType = formData.costType;
        }

        onAdd(entry);
    };

    return (
        <Card variant="flat" className="w-full p-8" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000, maxWidth: '450px', border: '1px solid var(--glass-border)', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
            <h2 className="mb-6">Add Airbnb Transaction</h2>
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
                            <option value="Revenue" style={{ background: '#111' }}>Revenue</option>
                            <option value="Cost" style={{ background: '#111' }}>Cost</option>
                        </select>
                    </div>
                </div>

                <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', alignItems: 'end' }}>
                    <div>
                        <label className="block mb-2" style={{ fontSize: '0.8rem', color: 'white' }}>Amount ({currencySymbol})</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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
                </div>

                {formData.type === 'Cost' && (
                    <div>
                        <label className="block mb-2" style={{ fontSize: '0.8rem', color: 'white' }}>Cost Type</label>
                        <select
                            value={formData.costType}
                            onChange={(e) => setFormData({ ...formData, costType: e.target.value })}
                            className="w-full p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
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
                    <label className="block mb-2" style={{ fontSize: '0.8rem', color: 'white' }}>Notes</label>
                    <input
                        type="text"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Optional notes"
                        className="w-full p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                    />
                </div>

                <div className="flex gap-3 mt-3">
                    <button type="submit" className="btn-primary" style={{ flex: 1 }}>Add Transaction</button>
                    <button type="button" onClick={onCancel} className="rounded-xl cursor-pointer" style={{ flex: 1, padding: '12px 24px', border: '1px solid var(--glass-border)', background: 'transparent', color: '#94a3b8' }}>Cancel</button>
                </div>
            </form>
        </Card>
    );
}
