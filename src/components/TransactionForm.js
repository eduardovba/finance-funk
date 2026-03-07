"use client";

import { useState, useEffect } from 'react';
import CurrencySelector from './CurrencySelector';

export default function TransactionForm({ onAdd, onCancel, initialData = null, isDrawerMode = false, assetClass = null, activeBrokers = [] }) {
    const [brokers, setBrokers] = useState([]);

    // Default fallback brokers if database is totally empty
    const defaultBrokers = assetClass === 'Equity' ? ['Trading 212', 'XP', 'Monzo'] :
        assetClass === 'Fixed Income' ? ['Inter', 'Santander', 'XP'] :
            assetClass === 'Crypto' ? ['Binance', 'Coinbase'] :
                ['XP', 'Inter'];

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        broker: initialData?.broker || defaultBrokers[0],
        investment: '',
        interest: '',
        currency: 'BRL',
        notes: '',
        isSalaryContribution: false
    });

    useEffect(() => {
        const fetchBrokers = async () => {
            try {
                const url = assetClass ? `/api/brokers?assetClass=${encodeURIComponent(assetClass)}` : '/api/brokers';
                const res = await fetch(url);
                const data = await res.json();
                const fetchedBrokerNames = data.brokers && data.brokers.length > 0 ? data.brokers.map(b => b.name) : [];
                const mergedBrokers = [...new Set([...fetchedBrokerNames, ...activeBrokers])].sort((a, b) => a.localeCompare(b));

                if (mergedBrokers.length > 0) {
                    setBrokers(mergedBrokers);
                    // Update default selection if not editing and current isn't in new list
                    if (!initialData && !mergedBrokers.includes(formData.broker)) {
                        setFormData(prev => ({ ...prev, broker: mergedBrokers[0] }));
                    }
                } else {
                    setBrokers(defaultBrokers);
                }
            } catch (e) {
                console.error('Failed to fetch brokers', e);
                setBrokers(defaultBrokers);
            }
        };
        fetchBrokers();
    }, [assetClass]);

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                // Ensure numbers are converted to strings for inputs if needed, 
                // though React handles numbers in inputs fine usually.
                investment: initialData.investment,
                interest: initialData.interest,
                isSalaryContribution: initialData.isSalaryContribution || false
            });
        }
    }, [initialData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onAdd({
            ...formData,
            id: initialData?.id, // Preserve ID if editing
            investment: parseFloat(formData.investment) || 0,
            interest: parseFloat(formData.interest) || 0,
            isSalaryContribution: formData.isSalaryContribution || false
        });
    };

    const containerStyle = isDrawerMode
        ? { display: 'flex', flexDirection: 'column', height: '100%' }
        : {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            width: '100%',
            maxWidth: '450px',
            padding: '32px',
            border: '1px solid var(--glass-border)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.5)'
        };

    return (
        <div className={isDrawerMode ? "animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col" : "glass-card"} style={isDrawerMode ? {} : containerStyle}>
            {isDrawerMode ? (
                <h4 className="font-bebas text-xl tracking-widest text-[#D4AF37] mb-6 flex-shrink-0">
                    {initialData ? 'EDIT TRANSACTION' : 'ADD TRANSACTION'}
                </h4>
            ) : (
                <h2 style={{ marginBottom: '24px' }}>{initialData ? 'Edit Transaction' : 'Add Transaction'}</h2>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: isDrawerMode ? 1 : 'none' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '8px' }}>Date</label>
                        <input
                            type="text"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="glass-card"
                            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '8px' }}>Broker</label>
                        <select
                            value={formData.broker}
                            onChange={(e) => setFormData({ ...formData, broker: e.target.value })}
                            className="glass-card"
                            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                        >
                            {brokers.map(b => (
                                <option key={b} value={b} style={{ background: '#111' }}>{b}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
                    <div style={{ gridColumn: 'span 1' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '8px' }}>Amount</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.investment}
                            onChange={(e) => setFormData({ ...formData, investment: e.target.value })}
                            placeholder="0.00"
                            className="glass-card"
                            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
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
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '8px' }}>Interest Payment</label>
                    <input
                        type="number"
                        step="0.01"
                        value={formData.interest}
                        onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                        placeholder="0.00"
                        className="glass-card"
                        style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                        type="checkbox"
                        checked={formData.isSalaryContribution || false}
                        onChange={e => setFormData({ ...formData, isSalaryContribution: e.target.checked })}
                        id="fixed-salary-contribution"
                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)' }}
                    />
                    <label htmlFor="fixed-salary-contribution" style={{ color: '#fff', fontSize: '0.9rem', cursor: 'pointer' }}>
                        Funded by Salary Contribution
                    </label>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', paddingTop: '24px' }}>
                    <button type="button" onClick={onCancel} style={{
                        flex: 1,
                        padding: '12px 24px',
                        borderRadius: '12px',
                        border: '1px solid var(--glass-border)',
                        background: 'transparent',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        fontSize: '0.875rem'
                    }} className="font-space">Cancel</button>
                    <button type="submit" className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#CC5500] to-[#D4AF37] text-[#1A0F2E] font-bold tracking-wide uppercase text-sm hover:brightness-110 hover:shadow-lg shadow-[#D4AF37]/20 transition-all font-space">
                        Confirm
                    </button>
                </div>
            </form>
        </div>
    );
}
