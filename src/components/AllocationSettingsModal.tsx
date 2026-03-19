import React, { useState, useEffect } from 'react';
import { Button, Input } from '@/components/ui';
import { Modal } from '@/components/ui/modal';

interface AllocationSettingsModalProps {
    onClose: () => void;
    onSave: (targets: Record<string, number>) => void;
}

export default function AllocationSettingsModal({ onClose, onSave }: AllocationSettingsModalProps) {
    const [targets, setTargets] = useState<Record<string, number>>({
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

    const handleChange = (bucket: string, value: string) => {
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
        <Modal open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
            <Modal.Content>
                <Modal.Title>Allocation Targets (%)</Modal.Title>
            {loading ? <p>Loading...</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {Object.keys(targets).map(bucket => (
                        <div key={bucket} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ color: 'var(--fg-secondary)', fontSize: '0.9rem' }}>
                                {bucket === 'FixedIncome' ? 'Fixed Income' : bucket === 'RealEstate' ? 'Real Estate' : bucket}
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Input
                                    type="number"
                                    value={targets[bucket]}
                                    onChange={(e) => handleChange(bucket, e.target.value)}
                                    className="w-20 text-right"
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
                        <Button variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button variant="primary" onClick={handleSave}>Save Targets</Button>
                    </div>
                </div>
            )}
            </Modal.Content>
        </Modal>
    );
}
