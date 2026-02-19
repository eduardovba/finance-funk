import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AllocationChart({ actual, targets }) {
    // Transform data for Recharts
    // buckets: ['Equity', 'FixedIncome', 'RealEstate', 'Crypto']
    // actual: { Equity: 1000, ... } (Amounts)
    // targets: { Equity: 50, ... } (Percentages)

    const totalActual = Object.values(actual.buckets).reduce((a, b) => a + b, 0);

    const data = [
        {
            name: 'Equity',
            Actual: totalActual ? (actual.buckets.Equity / totalActual * 100) : 0,
            Target: targets.Equity || 0,
            fill: '#3b82f6'
        },
        {
            name: 'Fixed Income',
            Actual: totalActual ? (actual.buckets.FixedIncome / totalActual * 100) : 0,
            Target: targets.FixedIncome || 0,
            fill: '#10b981'
        },
        {
            name: 'Real Estate',
            Actual: totalActual ? (actual.buckets.RealEstate / totalActual * 100) : 0,
            Target: targets.RealEstate || 0,
            fill: '#ef4444'
        },
        {
            name: 'Crypto',
            Actual: totalActual ? (actual.buckets.Crypto / totalActual * 100) : 0,
            Target: targets.Crypto || 0,
            fill: '#f59e0b'
        }
    ];

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="glass-card" style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <p style={{ color: 'var(--fg-primary)', marginBottom: '8px', fontWeight: 600 }}>{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} style={{ marginBottom: '4px', fontSize: '0.9rem', color: entry.dataKey === 'Actual' ? entry.payload.fill : 'var(--fg-secondary)' }}>
                            {entry.name}: {entry.value.toFixed(1)}%
                            {entry.dataKey === 'Actual' && (
                                <span style={{ marginLeft: '8px', opacity: 0.7 }}>
                                    (£{(actual.buckets[label === 'Fixed Income' ? 'FixedIncome' : label.replace(' ', '')] || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })})
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} stroke="var(--fg-secondary)" tick={{ fill: 'var(--fg-secondary)' }} tickFormatter={(val) => `${val}%`} />
                    <YAxis dataKey="name" type="category" stroke="var(--fg-secondary)" tick={{ fill: 'var(--fg-secondary)', fontSize: 12 }} width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="Actual" name="Actual %" barSize={20} radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Target" name="Target %" fill="rgba(255,255,255,0.1)" barSize={20} radius={[0, 4, 4, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
