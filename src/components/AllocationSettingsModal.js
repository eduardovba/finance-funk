import React, { useState, useEffect } from 'react';

export default function AllocationSettingsModal({ onClose, onSave }) {
    const [targets, setTargets] = useState({
        Equity: 0,
        FixedIncome: 0,
        RealEstate: 0,
        Crypto: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/allocation-targets')
            .then(res => res.json())
            .then(data => {
                setTargets(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load targets", err);
                setLoading(false);
            });
    }, []);

    const handleChange = (bucket, value) => {
        setTargets(prev => ({
            ...prev,
            [bucket]: parseFloat(value) || 0
        }));
    };

    const handleSave = async () => {
        try {
            const res = await fetch('/api/allocation-targets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(targets)
            });
            if (res.ok) {
                onSave(targets);
                onClose();
            }
        } catch (e) {
            console.error("Failed to save targets", e);
        }
    };

    const total = Object.values(targets).reduce((a, b) => a + b, 0);

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
            <div className="glass-card" style={{ position: 'relative', width: '400px', padding: '24px' }}>
                <h3 style={{ marginBottom: '20px' }}>Allocation Targets (%)</h3>

                {loading ? <p>Loading...</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {Object.keys(targets).map(bucket => (
                            <div key={bucket} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ color: 'var(--fg-secondary)', fontSize: '0.9rem' }}>
                                    {bucket === 'FixedIncome' ? 'Fixed Income' : bucket === 'RealEstate' ? 'Real Estate' : bucket}
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="number"
                                        value={targets[bucket]}
                                        onChange={(e) => handleChange(bucket, e.target.value)}
                                        style={{
                                            width: '80px', background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)', color: 'white',
                                            padding: '8px', borderRadius: '4px', textAlign: 'right'
                                        }}
                                    />
                                    <span>%</span>
                                </div>
                            </div>
                        ))}

                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                            <span>Total</span>
                            <span style={{ color: Math.abs(total - 100) < 0.1 ? 'var(--accent-color)' : 'var(--error)' }}>
                                {total.toFixed(1)}%
                            </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                            <button className="btn-edit" onClick={onClose}>Cancel</button>
                            <button className="btn-primary" onClick={handleSave}>Save Targets</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
