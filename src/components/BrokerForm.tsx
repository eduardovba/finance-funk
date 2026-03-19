"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui';
import _CurrencySelector from './CurrencySelector';
const CurrencySelector = _CurrencySelector as any;

interface BrokerFormProps {
    onSave: (broker: any) => void;
    onCancel: () => void;
    assetClass?: string | null;
    label?: string;
}

export default function BrokerForm({ onSave, onCancel, assetClass = null, label = 'Broker' }: BrokerFormProps) {
    const [formData, setFormData] = useState({
        name: '',
        currency: 'BRL',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setError(`${label} name is required.`);
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const res = await fetch('/api/brokers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, assetClass }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save broker.');
            }

            const savedBroker = await res.json();
            if (onSave) onSave(savedBroker);
        } catch (err: any) {
            console.error('Error saving broker:', err);
            setError(err.message);
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
            <h4 className="font-bebas text-xl tracking-widest text-[#D4AF37] mb-6">ADD NEW {label.toUpperCase()}</h4>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1">
                {error && (
                    <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">{label} Name</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={`e.g. ${label === 'Lender' ? 'Dad' : 'Trading 212'}`}
                        className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50 focus:bg-white/10 transition-all font-space"
                        autoFocus
                    />
                </div>

                <div>
                    <label className="block text-xs text-parchment/70 tracking-wide uppercase mb-2">Default Currency</label>
                    <CurrencySelector
                        value={formData.currency}
                        onChange={(val: string) => setFormData({ ...formData, currency: val })}
                    />
                </div>

                <div className="mt-auto pt-6 flex gap-3">
                    <Button type="button" variant="secondary" onClick={onCancel} disabled={isSaving} className="flex-1">
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" disabled={isSaving} className="flex-1">
                        {isSaving ? (
                            <div className="w-5 h-5 rounded-full border-2 border-[#1A0F2E]/30 border-t-[#1A0F2E] animate-spin" />
                        ) : `Save ${label}`}
                    </Button>
                </div>
            </form>
        </div>
    );
}
