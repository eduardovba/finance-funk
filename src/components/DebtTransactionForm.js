"use client";

import { useState, useEffect } from 'react';
import CurrencySelector from './CurrencySelector';
import { usePortfolio } from '../context/PortfolioContext';
import { convertCurrency } from '@/lib/currency';
import { Card } from '@/components/ui/card';

export default function DebtTransactionForm({ onSave, onCancel, initialData = null, rates: propRates }) {
    const { primaryCurrency, rates: contextRates } = usePortfolio();
    const rates = propRates || contextRates;

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        lender: '',
        amount: '',
        currency: primaryCurrency,
        obs: '',
        isSalaryContribution: false
    });

    useEffect(() => {
        if (initialData) {
            // Heuristic: Default to BRL for editing if not specified, using value_brl
            // A smarter way would be to check if one is rounder, but BRL is safe for now as base
            setFormData({
                date: initialData.date,
                lender: initialData.lender,
                obs: initialData.obs,
                amount: initialData.value_brl || 0,
                currency: initialData.currency || 'BRL',
                isSalaryContribution: initialData.isSalaryContribution || false
            });
        }
    }, [initialData]);

    const handleSubmit = (e) => {
        e.preventDefault();

        const amount = parseFloat(formData.amount) || 0;
        let val_brl = 0;
        let val_gbp = 0;

        // Use standard convertCurrency helper
        val_gbp = convertCurrency(amount, formData.currency, 'GBP', rates);
        val_brl = convertCurrency(amount, formData.currency, 'BRL', rates);

        onSave({
            id: initialData?.id,
            date: formData.date,
            lender: formData.lender,
            obs: formData.obs,
            value_brl: val_brl,
            value_gbp: val_gbp,
            isSalaryContribution: formData.isSalaryContribution
        });
    };

    return (
        <Card variant="flat" className="w-full p-8" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000, maxWidth: '450px', border: '1px solid var(--glass-border)', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
            <h2 className="mb-6">{initialData ? 'Edit Debt' : 'Add Debt'}</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div>
                        <label className="block mb-2" style={{ fontSize: '0.8rem', color: 'white' }}>Date</label>
                        <input
                            type="text"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            placeholder="YYYY-MM-DD"
                            className="w-full p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                        />
                    </div>
                    <div>
                        <label className="block mb-2" style={{ fontSize: '0.8rem', color: 'white' }}>Lender</label>
                        <input
                            type="text"
                            value={formData.lender}
                            onChange={(e) => setFormData({ ...formData, lender: e.target.value })}
                            placeholder="e.g. Dad"
                            className="w-full p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                        />
                    </div>
                </div>

                <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'end' }}>
                    <div style={{ gridColumn: 'span 1' }}>
                        <label className="block mb-2" style={{ fontSize: '0.8rem', color: 'white' }}>Value</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            placeholder="0.00"
                            className="w-full p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                        />
                    </div>
                    <div style={{ gridColumn: 'span 1' }}>
                        <CurrencySelector
                            value={formData.currency}
                            onChange={(val) => setFormData({ ...formData, currency: val })}
                        />
                    </div>
                </div>

                <div>
                    <label className="block mb-2" style={{ fontSize: '0.8rem', color: 'white' }}>Observations</label>
                    <input
                        type="text"
                        value={formData.obs}
                        onChange={(e) => setFormData({ ...formData, obs: e.target.value })}
                        placeholder="Notes..."
                        className="w-full p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={formData.isSalaryContribution || false}
                        onChange={e => setFormData({ ...formData, isSalaryContribution: e.target.checked })}
                        id="debt-salary-contribution"
                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)' }}
                    />
                    <label htmlFor="debt-salary-contribution" className="text-[0.9rem] cursor-pointer" style={{ color: '#fff' }}>
                        Funded by Salary Contribution
                    </label>
                </div>

                <div className="flex gap-3 mt-3">
                    <button type="submit" className="btn-primary" style={{ flex: 1 }}>Confirm</button>
                    <button type="button" onClick={onCancel} className="rounded-xl cursor-pointer" style={{ flex: 1, padding: '12px 24px', border: '1px solid var(--glass-border)', background: 'transparent', color: '#94a3b8' }}>Cancel</button>
                </div>
            </form>
        </Card>
    );
}
