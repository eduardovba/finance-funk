'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, EyeOff, Tag, Landmark, Wallet, TrendingUp, CircleDollarSign } from 'lucide-react';
import { updateAssetSyncStatus, batchVerifyAssets } from '@/app/actions/pluggy-sync';

const CATEGORIES = [
    { id: 'Cash', icon: Wallet, color: 'text-blue-400' },
    { id: 'Equity', icon: TrendingUp, color: 'text-green-400' },
    { id: 'Fixed Income', icon: Landmark, color: 'text-yellow-400' },
    { id: 'Real Estate', icon: Landmark, color: 'text-orange-400' },
    { id: 'Crypto', icon: CircleDollarSign, color: 'text-purple-400' },
];

export default function SyncReviewModal({ isOpen, onClose, assets, institutionName, onComplete }: any) {
    const [pendingAssets, setPendingAssets] = useState(assets || []);
    const [loading, setLoading] = useState(false);

    // Sync state with props when modal opens or assets change
    React.useEffect(() => {
        setPendingAssets(assets || []);
    }, [assets, isOpen]);

    const handleCategoryChange = async (assetId: string, newCategory: string) => {
        setPendingAssets((prev: any[]) => prev.map((a: any) =>
            a.id === assetId ? { ...a, category: newCategory } : a
        ));
    };

    const handleIgnore = (assetId: string) => {
        setPendingAssets((prev: any[]) => prev.filter((a: any) => a.id !== assetId));
        updateAssetSyncStatus(assetId, 'IGNORED');
    };

    const handleConfirmAll = async () => {
        setLoading(true);
        try {
            // 1. Update categories for all changed ones
            for (const asset of pendingAssets) {
                const original = assets.find((a: any) => a.id === asset.id);
                if (original.category !== asset.category) {
                    await updateAssetSyncStatus(asset.id, 'PENDING', asset.category);
                }
            }

            // 2. Batch verify all remaining
            await batchVerifyAssets(pendingAssets.map((a: any) => a.id));

            onComplete();
            onClose();
        } catch (err) {
            console.error('Verify error:', err);
            alert('Failed to verify assets.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-space">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-[#0F1115] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bebas tracking-widest text-[#D4AF37] m-0">Review New Assets</h2>
                        <p className="text-xs text-parchment/40 uppercase tracking-tighter m-0">
                            Found {pendingAssets.length} new records from {institutionName}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                        <X size={24} className="text-parchment/60" />
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {pendingAssets.length === 0 ? (
                        <div className="text-center py-12">
                            <Check size={48} className="text-green-500 mx-auto mb-4 opacity-20" />
                            <p className="text-parchment/40">No pending assets to review.</p>
                        </div>
                    ) : (
                        pendingAssets.map((asset: any) => (
                            <div key={asset.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                                <div className="flex-1">
                                    <h4 className="text-parchment font-medium m-0">{asset.name}</h4>
                                    <div className="flex items-center gap-3 mt-1 text-xs uppercase tracking-widest text-parchment/40">
                                        <span>{asset.broker}</span>
                                        <span className="w-1 h-1 rounded-full bg-white/10" />
                                        <span>
                                            {new Intl.NumberFormat('pt-BR', {
                                                style: 'currency',
                                                currency: asset.currency || 'BRL'
                                            }).format(Math.abs(asset.balance))}
                                        </span>

                                    </div>
                                </div>

                                {/* Category Selector */}
                                <div className="flex items-center gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
                                    {CATEGORIES.map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => handleCategoryChange(asset.id, cat.id)}
                                            className={`p-2 rounded-lg transition-all relative group ${asset.category === cat.id
                                                ? 'bg-indigo-500/20 text-indigo-400'
                                                : 'text-parchment/20 hover:text-parchment/60'
                                                }`}
                                            title={cat.id}
                                        >
                                            <cat.icon size={16} />
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-2xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap border border-white/10">
                                                {cat.id}
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => handleIgnore(asset.id)}
                                    className="p-3 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                    title="Ignore this asset"
                                >
                                    <EyeOff size={18} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-black/20 flex items-center justify-between">
                    <p className="text-xs text-parchment/30">
                        Ignored assets won't appear on your dashboard or in future syncs.
                    </p>
                    <button
                        onClick={handleConfirmAll}
                        disabled={loading || pendingAssets.length === 0}
                        className="px-8 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#C4A137] text-black font-bebas tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#D4AF37]/10"
                    >
                        {loading ? 'Confirming...' : 'Add to Portfolio'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
