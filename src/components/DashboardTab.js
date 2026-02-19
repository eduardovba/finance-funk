
import React, { useState } from 'react';
import MetricCard from './MetricCard';
import ConsolidatedAssetTable from './ConsolidatedAssetTable';
import DashboardCharts from './DashboardCharts';

export default function DashboardTab({
    data,
    rates,
    historicalSnapshots,
    onRecordSnapshot,
    diffPrevMonth,
    diffPrevMonthGBP,
    diffTarget,
    diffTargetGBP,
    assetDiffs,
    isLoading
}) {
    const [isSnapshotting, setIsSnapshotting] = useState(false);

    const handleSnapshotClick = async () => {
        if (confirm('Are you sure you want to record a snapshot for the current month? This will overwrite any existing snapshot for this month.')) {
            setIsSnapshotting(true);
            await onRecordSnapshot();
            setIsSnapshotting(false);
        }
    };

    return (
        <div style={{ paddingBottom: '40px' }}>
            {/* Hero Section - Total Net Worth */}
            <div className="glass-card" style={{ padding: '0', marginBottom: '32px', border: '1px solid rgba(16, 185, 129, 0.2)', overflow: 'hidden' }}>
                <div style={{ padding: '40px', background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, rgba(0,0,0,0) 100%)' }}>
                    <h3 style={{ color: 'var(--fg-secondary)', marginBottom: '32px', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '3px', textAlign: 'center', opacity: 0.8 }}>
                        Total Net Worth
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: '40px', alignItems: 'center', opacity: isLoading ? 0.3 : 1, transition: 'opacity 0.3s ease' }}>

                        {/* BRL Section */}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                                <span style={{ fontSize: '1.2rem', color: 'var(--fg-secondary)', fontWeight: '500' }}>R$</span>
                                <span style={{ fontSize: '4rem', fontWeight: '800', letterSpacing: '-1px' }} className="text-gradient">
                                    {isLoading ? '---' : ((data.netWorth.amount / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }))}M
                                </span>
                            </div>

                            {/* BRL Variances */}
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', visibility: isLoading ? 'hidden' : 'visible' }}>
                                {/* BRL vs Last Month */}
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.95rem', fontWeight: '600', color: (diffPrevMonth?.amount || 0) >= 0 ? 'var(--accent-color)' : 'var(--error)' }}>
                                        {(diffPrevMonth?.amount || 0) >= 0 ? '↑' : '↓'} R$ {Math.abs(diffPrevMonth?.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', opacity: 0.8, marginTop: '2px' }}>
                                        vs Last Month ({(diffPrevMonth?.percentage || 0).toFixed(1)}%)
                                    </div>
                                </div>
                                {/* BRL vs Target */}
                                {Math.abs(diffTarget?.amount || 0) > 1 && (
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.95rem', fontWeight: '600', color: (diffTarget?.amount || 0) >= 0 ? 'var(--accent-color)' : 'var(--error)' }}>
                                            {(diffTarget?.amount || 0) >= 0 ? '+' : ''} R$ {Math.abs(diffTarget?.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', opacity: 0.8, marginTop: '2px' }}>
                                            vs Target ({(diffTarget?.percentage || 0).toFixed(1)}%)
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Divider */}
                        <div style={{ width: '1px', height: '120px', background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%)' }} />

                        {/* GBP Section */}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                                <span style={{ fontSize: '1.2rem', color: '#8b5cf6', fontWeight: '500' }}>£</span>
                                <span style={{
                                    fontSize: '3.5rem',
                                    fontWeight: '700',
                                    letterSpacing: '-1px',
                                    background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}>
                                    {isLoading ? '---' : ((data.netWorth.amount / rates.BRL / 1000).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 }))}k
                                </span>
                            </div>

                            {/* GBP Variances */}
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', visibility: isLoading ? 'hidden' : 'visible' }}>
                                {/* GBP vs Last Month */}
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.95rem', fontWeight: '600', color: (diffPrevMonthGBP?.amount || 0) >= 0 ? '#8b5cf6' : 'var(--error)' }}>
                                        {(diffPrevMonthGBP?.amount || 0) >= 0 ? '↑' : '↓'} £{Math.abs(diffPrevMonthGBP?.amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', opacity: 0.8, marginTop: '2px' }}>
                                        vs Last Month ({(diffPrevMonthGBP?.percentage || 0).toFixed(1)}%)
                                    </div>
                                </div>
                                {/* GBP vs Target */}
                                {Math.abs(diffTargetGBP?.amount || 0) > 1 && (
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.95rem', fontWeight: '600', color: (diffTargetGBP?.amount || 0) >= 0 ? '#8b5cf6' : 'var(--error)' }}>
                                            {(diffTargetGBP?.amount || 0) >= 0 ? '+' : ''} £{Math.abs(diffTargetGBP?.amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)', opacity: 0.8, marginTop: '2px' }}>
                                            vs Target ({(diffTargetGBP?.percentage || 0).toFixed(1)}%)
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            {/* Historical Charts */}
            <DashboardCharts historicalData={historicalSnapshots || []} currentMonthData={data} rates={rates} />

            {/* Sub-categories Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px', marginBottom: '48px' }}>
                {data.summaries.map((metric) => (
                    <MetricCard
                        key={metric.id}
                        title={metric.title}
                        amount={metric.amount}
                        currency="BRL"
                        rates={rates}
                        percentage={assetDiffs?.[metric.id]?.percentage || 0}
                        diffAmount={assetDiffs?.[metric.id]?.amount || 0}
                        invertColor={metric.id === 'debt'}
                        isLoading={isLoading}
                    />
                ))}
            </div>

            {/* Detailed Tables Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {data.categories.map((cat) => (
                    <ConsolidatedAssetTable
                        key={cat.id}
                        title={cat.title}
                        assets={cat.assets}
                        rates={rates}
                    />
                ))}
            </div>
        </div >
    );
}
