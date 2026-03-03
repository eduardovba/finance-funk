import React, { useState, useEffect } from 'react';
import { Eye, TrendingUp, TrendingDown, RefreshCcw } from 'lucide-react';
import AssetSearch from './AssetSearch';
import ConfirmationModal from './ConfirmationModal';
import { formatCurrency } from '@/lib/currency';

export default function LiveTrackingTab({ marketData, onRefresh, isMarketDataLoading }) {
    const [assets, setAssets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [assetToDelete, setAssetToDelete] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [varianceMode, setVarianceMode] = useState({}); // { [ticker]: '1D' | '1M' }

    useEffect(() => {
        fetchAssets();
    }, []);

    const toggleVarianceMode = (ticker) => {
        setVarianceMode(prev => ({
            ...prev,
            [ticker]: prev[ticker] === '1M' ? '1D' : '1M'
        }));
    };

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

    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        if (onRefresh) {
            await onRefresh();
        }
        setIsRefreshing(false);
    };

    const handleAddAsset = async (assetData) => {
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

    const sections = [
        { title: '🇺🇸 US Equities', type: 'Stock (US)', currency: 'USD' },
        { title: '🇬🇧 UK Equities', type: 'Stock (UK)', currency: 'GBP' },
        { title: '🇧🇷 BR Equities', type: 'Stock (Bovespa)', currency: 'BRL' },
        { title: '💎 Crypto Assets', type: 'Crypto', currency: 'USD' }
    ];

    const renderAssetGrid = (title, items, currencyCode) => {
        if (items.length === 0) return null;

        return (
            <div key={title} className="mb-12">
                <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-3">
                    <h3 className="font-bebas text-2xl tracking-widest text-parchment/80 m-0">{title}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {items.map(asset => {
                        const data = marketData[asset.ticker];
                        const price = data?.price;
                        const change1D = data?.changePercent;
                        const change1M = data?.change1M;

                        const currentVarianceMode = varianceMode[asset.ticker] || '1D';
                        const displayChange = currentVarianceMode === '1D' ? change1D : change1M;
                        const isPositive = displayChange >= 0;
                        const ChangeIcon = isPositive ? TrendingUp : TrendingDown;
                        const tooltipText = currentVarianceMode === '1D' ? "24h Variance" : "Monthly Variance";

                        return (
                            <div
                                key={asset.ticker}
                                className="relative group bg-[#1A0F2E]/80 border border-white/10 rounded-xl p-5 hover:bg-[#231540] hover:border-[#D4AF37]/40 hover:shadow-[0_8px_25px_rgba(212,175,55,0.15)] transition-all duration-300 flex flex-col justify-between"
                                style={{
                                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                                }}
                            >
                                {/* Delete button (hidden until hover) */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(asset.ticker); }}
                                    className="absolute top-2 right-2 bg-black/40 text-parchment/40 hover:text-red-400 hover:bg-black/60 rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10 border border-white/5"
                                    title="Remove from Watchlist"
                                >
                                    ✕
                                </button>

                                <div className="mb-4">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-lg text-[#D4AF37] m-0 tracking-wide font-mono">
                                            {asset.ticker}
                                        </h4>
                                    </div>
                                    <p className="text-xs text-parchment/50 m-0 line-clamp-1 truncate pr-6" title={asset.name}>
                                        {asset.name}
                                    </p>
                                </div>

                                <div className="mt-auto flex justify-between items-end">
                                    <div className="flex flex-col">
                                        <span className="font-mono text-xs text-parchment/30 uppercase tracking-widest mb-1">Current</span>
                                        <span className="font-mono text-xl text-parchment font-semibold tracking-tight">
                                            {price ? formatCurrency(price, currencyCode) : '---'}
                                        </span>
                                    </div>

                                    <div
                                        onClick={(e) => { e.stopPropagation(); toggleVarianceMode(asset.ticker); }}
                                        title={tooltipText}
                                        className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded border cursor-pointer select-none transition-all active:scale-95 ${isPositive
                                            ? 'bg-vu-green/10 text-vu-green border-vu-green/30 hover:bg-vu-green/20'
                                            : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                                            }`}>
                                        <div className="flex items-center gap-1.5">
                                            <ChangeIcon size={14} />
                                            <span className="font-mono text-sm font-bold">
                                                {displayChange !== undefined ? `${Math.abs(displayChange).toFixed(2)}%` : '---'}
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-bold opacity-60 leading-none">{currentVarianceMode}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' }}>
            {/* Header matches Planning Tab style */}
            <div className="flex flex-col items-center justify-center mb-10 relative">
                <div className="absolute right-0 top-0">
                    <button
                        onClick={handleManualRefresh}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 bg-[#1A0F2E] border border-white/10 hover:border-[#D4AF37]/50 text-parchment/70 px-4 py-2 rounded-lg transition-all"
                    >
                        <RefreshCcw size={16} className={isRefreshing ? 'animate-spin text-[#D4AF37]' : ''} />
                        <span className="text-sm font-mono tracking-wide">{isRefreshing ? 'REFRESHING...' : 'REFRESH'}</span>
                    </button>
                </div>
                <h2 className="text-[#D4AF37] text-4xl m-0 mb-8 font-bebas tracking-widest drop-shadow-[0_0_12px_rgba(212,175,55,0.6)] uppercase text-center flex items-center justify-center gap-4">
                    <Eye className="text-[#D4AF37]" size={36} />
                    Watchlist
                </h2>

                <div className="w-full max-w-xl">
                    <AssetSearch onSelect={handleAddAsset} />
                </div>
            </div>

            <div>
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
                    </div>
                ) : (
                    <>
                        {isMarketDataLoading && (
                            <div className="flex justify-center items-center gap-3 mb-8 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] px-6 py-3 rounded-lg animate-pulse w-full max-w-xl mx-auto">
                                <RefreshCcw size={18} className="animate-spin" />
                                <span className="font-mono text-sm uppercase tracking-widest">Fetching live market data...</span>
                            </div>
                        )}
                        {sections.map(section => {
                            const sectionAssets = assets.filter(a => a.type === section.type);
                            return renderAssetGrid(section.title, sectionAssets, section.currency);
                        })}

                        {assets.length === 0 && (
                            <div className="text-center py-20 bg-[#1A0F2E]/50 border border-white/5 rounded-2xl">
                                <Eye size={48} className="text-parchment/20 mx-auto mb-4" />
                                <h3 className="text-xl text-parchment/60 m-0 mb-2 font-mono">Your Watchlist is Empty</h3>
                                <p className="text-parchment/40 m-0 max-w-md mx-auto">
                                    Search for stocks, ETFs, or cryptocurrencies above to add them to your live tracking watchlist.
                                </p>
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
