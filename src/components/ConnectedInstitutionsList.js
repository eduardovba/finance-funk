"use client";

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, RefreshCw, Trash2, Banknote, ShieldCheck } from 'lucide-react';
import { syncItem, deleteConnection } from '@/app/actions/pluggy-sync';
import SyncReviewModal from './SyncReviewModal';

// This would ideally be a Server Action to fetch connections and their assets
// For this UI, we assume a fetch/swr pattern or props
export default function ConnectedInstitutionsList() {
    const [connections, setConnections] = useState([]);
    const [expanded, setExpanded] = useState({});
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState({});

    // Phase 3: Review Flow
    const [reviewModal, setReviewModal] = useState({ isOpen: false, assets: [], institution: '' });

    const fetchConnections = async () => {
        setLoading(true);
        try {
            // In a real implementation, this would call an API or Server Action
            const res = await fetch('/api/pluggy/connections');
            const data = await res.json();
            setConnections(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch connections', err);
            setConnections([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConnections();
    }, []);

    const toggleExpand = (id) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleSync = async (itemId) => {
        setSyncing(prev => ({ ...prev, [itemId]: true }));
        try {
            await syncItem(itemId);
            await fetchConnections();
        } finally {
            setSyncing(prev => ({ ...prev, [itemId]: false }));
        }
    };

    const handleDelete = async (itemId) => {
        if (!confirm('Are you sure you want to disconnect this bank? All synced assets will be removed.')) return;
        await deleteConnection(itemId);
        await fetchConnections();
    };

    if (loading) return (
        <div className="space-y-4 animate-pulse">
            {[1, 2].map(i => (
                <div key={i} className="h-24 bg-white/5 rounded-xl" />
            ))}
        </div>
    );

    if (connections.length === 0) return (
        <div className="p-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
            <Banknote className="mx-auto w-8 h-8 text-white/20 mb-3" />
            <p className="text-xs text-parchment/40 uppercase tracking-widest">No banks connected</p>
        </div>
    );

    return (
        <div className="space-y-4">
            {Array.isArray(connections) && connections.map(conn => {
                const pendingAssets = conn.assets?.filter(a => a.sync_status === 'PENDING') || [];
                const activeAssets = conn.assets?.filter(a => a.sync_status === 'ACTIVE') || [];

                return (
                    <div key={conn.id} className="group overflow-hidden rounded-2xl bg-white/[0.03] border border-white/5 hover:border-[#D4AF37]/30 transition-all">
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => toggleExpand(conn.id)}>
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center relative overflow-hidden">
                                    {conn.institution_logo_url ? (
                                        <img
                                            src={conn.institution_logo_url}
                                            alt={conn.institution_name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.style.display = 'none';
                                                e.target.parentNode.innerHTML = `
                                                    <svg class="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                    </svg>
                                                `;
                                            }}
                                        />
                                    ) : (
                                        <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                    )}
                                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${conn.status === 'UPDATED' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h5 className="font-bebas text-lg tracking-widest text-[#D4AF37] m-0 leading-tight">
                                            {conn.institution_name}
                                        </h5>
                                        {pendingAssets.length > 0 && (
                                            <span className="px-1.5 py-0.5 rounded bg-[#D4AF37] text-black text-[8px] font-bold animate-pulse">
                                                {pendingAssets.length} NEW
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] font-space text-parchment/40 m-0 uppercase flex items-center gap-2">
                                        Last Synced: {new Date(conn.last_sync_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                {pendingAssets.length > 0 && (
                                    <button
                                        onClick={() => setReviewModal({ isOpen: true, assets: pendingAssets, institution: conn.institution_name })}
                                        className="px-3 py-1.5 rounded-lg bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-bebas tracking-widest transition-all mr-2"
                                    >
                                        Review
                                    </button>
                                )}
                                <button
                                    onClick={() => handleSync(conn.pluggy_item_id)}
                                    disabled={syncing[conn.pluggy_item_id]}
                                    className="p-2 rounded-lg hover:bg-white/5 text-parchment/60 hover:text-[#D4AF37] transition-all"
                                >
                                    <RefreshCw size={14} className={syncing[conn.pluggy_item_id] ? 'animate-spin' : ''} />
                                </button>
                                <button
                                    onClick={() => handleDelete(conn.pluggy_item_id)}
                                    className="p-2 rounded-lg hover:bg-white/5 text-parchment/60 hover:text-red-400 transition-all"
                                >
                                    <Trash2 size={14} />
                                </button>
                                <button onClick={() => toggleExpand(conn.id)} className="p-2 text-parchment/40 hover:text-parchment transition-all">
                                    {expanded[conn.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </button>
                            </div>
                        </div>

                        {expanded[conn.id] && (
                            <div className="border-t border-white/5 bg-black/20 p-4 space-y-2">
                                {activeAssets.length > 0 ? (
                                    activeAssets.map(asset => (
                                        <div key={asset.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all group/asset">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-space text-parchment/80">{asset.name}</span>
                                                <span className="text-[10px] text-parchment/30 uppercase tracking-tighter">{asset.broker}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest ${asset.category === 'Cash' ? 'bg-blue-500/10 text-blue-400' :
                                                    asset.category === 'Equity' ? 'bg-emerald-500/10 text-emerald-400' :
                                                        asset.category === 'Fixed Income' ? 'bg-orange-500/10 text-orange-400' :
                                                            asset.category === 'Real Estate' ? 'bg-indigo-500/10 text-indigo-400' :
                                                                'bg-white/10 text-parchment/50'
                                                    }`}>
                                                    {asset.category}
                                                </span>
                                                <span className="text-xs font-space text-[#D4AF37]">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: asset.currency || 'BRL' }).format(asset.balance || 0)}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[10px] text-parchment/20 text-center py-2 uppercase tracking-widest">
                                        {pendingAssets.length > 0 ? 'Review pending assets to see them here' : 'No active assets found'}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            <SyncReviewModal
                isOpen={reviewModal.isOpen}
                onClose={() => setReviewModal({ ...reviewModal, isOpen: false })}
                assets={reviewModal.assets}
                institutionName={reviewModal.institution}
                onComplete={fetchConnections}
            />
        </div>
    );
}
