import React, { useState, useEffect } from 'react';
import AssetSearch from './AssetSearch';
import ConfirmationModal from './ConfirmationModal';
import { formatCurrency } from '@/lib/currency';

export default function LiveTrackingTab({ marketData, onRefresh }) {
    const [assets, setAssets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [assetToDelete, setAssetToDelete] = useState(null);

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        try {
            const res = await fetch('/api/live-assets');
            const data = await res.json();
            setAssets(data);
        } catch (error) {
            console.error('Failed to fetch assets:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddAsset = async (assetData) => {
        // Determine type based on asset data
        let type = 'Stock (US)';
        if (assetData.type === 'CRYPTOCURRENCY') type = 'Crypto';
        else if (assetData.symbol.endsWith('.SA')) type = 'Stock (Bovespa)';
        else if (assetData.exchange === 'LSE' || assetData.symbol.endsWith('.L')) type = 'Stock (UK)';

        try {
            const res = await fetch('/api/live-assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticker: assetData.symbol,
                    name: assetData.name,
                    type: type
                })
            });
            if (res.ok) {
                fetchAssets();
                onRefresh();
            }
        } catch (error) {
            console.error('Failed to add asset:', error);
        }
    };

    const handleDeleteClick = (ticker) => {
        setAssetToDelete(ticker);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!assetToDelete) return;
        try {
            const res = await fetch(`/api/live-assets?ticker=${assetToDelete}`, { method: 'DELETE' });
            if (res.ok) {
                fetchAssets();
                onRefresh();
                setIsDeleteModalOpen(false);
                setAssetToDelete(null);
            }
        } catch (error) {
            console.error('Failed to delete asset:', error);
        }
    };

    // Group assets by type
    const sections = {
        'Stock (Bovespa)': assets.filter(a => a.type === 'Stock (Bovespa)'),
        'Stock (US)': assets.filter(a => a.type === 'Stock (US)'),
        'Stock (UK)': assets.filter(a => a.type === 'Stock (UK)'),
        'Crypto': assets.filter(a => a.type === 'Crypto'),
    };

    const renderAssetTable = (title, items, currencyCode) => {
        if (items.length === 0) return null;

        return (
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden', marginBottom: '32px' }}>
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--glass-border)',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{title}</h3>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: '16px 24px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Ticker</th>
                            <th style={{ padding: '16px 24px', color: 'var(--fg-secondary)', fontSize: '0.85rem' }}>Name</th>
                            <th style={{ padding: '16px 24px', color: 'var(--fg-secondary)', fontSize: '0.85rem', textAlign: 'right' }}>Live Price ({currencyCode})</th>
                            <th style={{ padding: '16px 24px', color: 'var(--fg-secondary)', fontSize: '0.85rem', textAlign: 'right' }}>Change %</th>
                            <th style={{ padding: '16px 24px', color: 'var(--fg-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(asset => {
                            const data = marketData[asset.ticker];
                            const price = data?.price;
                            const change = data?.changePercent;
                            const isPositive = change >= 0;

                            return (
                                <tr key={asset.ticker} className="asset-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '16px 24px', fontWeight: 'bold', color: 'var(--accent-color)' }}>{asset.ticker}</td>
                                    <td style={{ padding: '16px 24px' }}>{asset.name}</td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: '600', fontSize: '1.1rem' }}>
                                        {price ? formatCurrency(price, currencyCode) : '-'}
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', color: isPositive ? 'var(--accent-color)' : 'var(--error)' }}>
                                        {change ? `${isPositive ? '+' : ''}${change.toFixed(2)}%` : '-'}
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => handleDeleteClick(asset.ticker)}
                                            style={{
                                                background: 'transparent', border: 'none', color: 'var(--error)',
                                                cursor: 'pointer', opacity: 0.6, transition: 'all 0.2s', fontSize: '1.2rem'
                                            }}
                                            onMouseEnter={e => { e.target.style.opacity = 1; e.target.style.transform = 'scale(1.1)' }}
                                            onMouseLeave={e => { e.target.style.opacity = 0.6; e.target.style.transform = 'scale(1)' }}
                                        >
                                            ✕
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '48px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <h2 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '16px' }}>Live Market Analysis</h2>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <AssetSearch onSelect={handleAddAsset} />
                </div>
            </div>

            <div>
                {isLoading ? (
                    <div style={{ textAlign: 'center', color: 'var(--fg-secondary)', padding: '40px' }}>Loading tracked assets...</div>
                ) : (
                    <>
                        {renderAssetTable('🇧🇷 Brazilian Stocks', sections['Stock (Bovespa)'], 'BRL')}
                        {renderAssetTable('🇺🇸 US Stocks', sections['Stock (US)'], 'USD')}
                        {renderAssetTable('🇬🇧 UK Stocks', sections['Stock (UK)'], 'GBP')}
                        {renderAssetTable('💎 Crypto', sections['Crypto'], 'USD')}

                        {assets.length === 0 && (
                            <div style={{ textAlign: 'center', color: 'var(--fg-secondary)', padding: '40px', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                                Use the search bar above to start tracking your first asset.
                            </div>
                        )}
                    </>
                )}
            </div>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                title="Remove Asset"
                message={`Are you sure you want to stop tracking ${assetToDelete}?`}
                onConfirm={handleConfirmDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
            />
        </div>
    );
}
