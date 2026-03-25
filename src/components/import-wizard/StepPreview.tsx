"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Loader2, Table2, Zap, Sparkles, Copy } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface StepPreviewProps {
    transformedTxs: any[];
    assetClass: string;
    importing: boolean;
    onImport: () => void;
    onBack: () => void;
    showAssetClassColumn?: boolean;
    duplicateIndices?: Set<number>;
    onRemoveDuplicates?: () => void;
}

export default function StepPreview({ transformedTxs, assetClass, importing, onImport, onBack, showAssetClassColumn = false, duplicateIndices, onRemoveDuplicates }: StepPreviewProps) {
    const [expandedView, setExpandedView] = useState(false);
    const previewTxs = expandedView ? transformedTxs : transformedTxs.slice(0, 10);

    const uniqueAssets = new Set(transformedTxs.map((t: any) => t.asset || t.ticker)).size;
    const buys = transformedTxs.filter((t: any) => t.type === 'Buy').length;
    const sells = transformedTxs.filter((t: any) => t.type === 'Sell').length;
    const totalAmount = transformedTxs.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
    const dupeCount = duplicateIndices?.size ?? 0;

    const fmtNum = (n: number) => {
        if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
        return n.toFixed(2);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Transactions', value: transformedTxs.length, icon: Table2 },
                    { label: 'Unique Assets', value: uniqueAssets, icon: Zap },
                    { label: 'Buys / Sells', value: `${buys} / ${sells}`, icon: ArrowRight },
                    { label: 'Total Volume', value: fmtNum(totalAmount), icon: Sparkles },
                ].map(card => (
                    <Card key={card.label} variant="inset" className="!p-4 text-center">
                        <card.icon size={16} className="text-[#D4AF37]/50 mx-auto mb-2" />
                        <div className="text-xl font-bebas tracking-wider text-[#D4AF37]">{card.value}</div>
                        <div className="text-xs text-parchment/40 font-space uppercase tracking-widest">{card.label}</div>
                    </Card>
                ))}
            </div>

            {/* Duplicate Warning Banner */}
            {dupeCount > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl bg-[#1a1520]/80 backdrop-blur-2xl border border-red-400/20 border-t-red-400/30 shadow-[0_4px_16px_rgba(0,0,0,0.25)] px-4 py-3 flex items-center gap-3"
                >
                    <Copy size={16} className="text-red-400 flex-shrink-0" />
                    <span className="text-sm font-space text-[#F5F5DC]/60 flex-1">
                        <strong className="text-red-400">{dupeCount}</strong> potential duplicate{dupeCount !== 1 ? 's' : ''} found — {dupeCount === 1 ? 'this transaction appears' : 'these transactions appear'} to already exist in your ledger.
                    </span>
                    {onRemoveDuplicates && (
                        <button
                            onClick={onRemoveDuplicates}
                            className="px-3 py-1.5 rounded-lg bg-red-400/15 border border-red-400/30 text-red-400 text-xs font-space font-medium hover:bg-red-400/25 transition-colors whitespace-nowrap"
                        >
                            Remove Duplicates
                        </button>
                    )}
                </motion.div>
            )}

            {/* Transaction Table */}
            <Card variant="flat" className="!p-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                    <h4 className="text-[#D4AF37] font-bebas tracking-widest text-lg m-0">Transaction Preview</h4>
                    {transformedTxs.length > 10 && (
                        <button
                            onClick={() => setExpandedView(!expandedView)}
                            className="text-xs text-parchment/40 font-space hover:text-[#D4AF37] transition-colors"
                        >
                            {expandedView ? `Show less` : `Show all ${transformedTxs.length}`}
                        </button>
                    )}
                </div>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full">
                        <thead className="sticky top-0 bg-[#0d0814]">
                            <tr className="border-b border-white/5">
                                <th className="text-left px-4 py-2 text-xs uppercase tracking-widest text-parchment/40 font-space font-medium">Date</th>
                                <th className="text-left px-4 py-2 text-xs uppercase tracking-widest text-parchment/40 font-space font-medium">Asset</th>
                                <th className="text-left px-4 py-2 text-xs uppercase tracking-widest text-parchment/40 font-space font-medium">Type</th>
                                {showAssetClassColumn && (
                                    <th className="text-left px-4 py-2 text-xs uppercase tracking-widest text-parchment/40 font-space font-medium">Class</th>
                                )}
                                {['Equity', 'Crypto', 'Pension'].includes(assetClass) && !showAssetClassColumn && (
                                    <th className="text-right px-4 py-2 text-xs uppercase tracking-widest text-parchment/40 font-space font-medium">Qty</th>
                                )}
                                <th className="text-right px-4 py-2 text-xs uppercase tracking-widest text-parchment/40 font-space font-medium">Amount</th>
                                <th className="text-left px-4 py-2 text-xs uppercase tracking-widest text-parchment/40 font-space font-medium">CCY</th>
                            </tr>
                        </thead>
                        <tbody>
                            {previewTxs.map((tx: any, i: number) => {
                                const globalIdx = expandedView ? i : i; // index within transformedTxs
                                const isDupe = duplicateIndices?.has(globalIdx) ?? false;
                                return (
                                    <tr
                                        key={i}
                                        className={`border-b border-white/[0.03] transition-colors ${
                                            isDupe
                                                ? 'bg-red-900/20 hover:bg-red-900/30'
                                                : 'hover:bg-white/[0.02]'
                                        }`}
                                    >
                                        <td className="px-4 py-2.5 text-xs text-parchment/60 font-space whitespace-nowrap">
                                            <span className="flex items-center gap-2">
                                                {isDupe && (
                                                    <span className="text-2xs uppercase tracking-[1.5px] font-space font-bold px-1.5 py-0.5 rounded-lg bg-red-400/15 border border-red-400/30 text-red-400 flex-shrink-0">
                                                        Dupe
                                                    </span>
                                                )}
                                                {tx.date}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-parchment font-space font-medium truncate max-w-[180px]">{tx.asset || tx.ticker || '—'}</td>
                                        <td className="px-4 py-2.5">
                                            <span className={`text-xs font-space font-bold uppercase px-2 py-0.5 rounded-full
                                                ${tx.type === 'Buy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                {tx.type}
                                            </span>
                                        </td>
                                        {showAssetClassColumn && (
                                            <td className="px-4 py-2.5 text-xs text-parchment/50 font-space">{tx.assetClass || assetClass}</td>
                                        )}
                                        {['Equity', 'Crypto', 'Pension'].includes(assetClass) && !showAssetClassColumn && (
                                            <td className="px-4 py-2.5 text-xs text-parchment/60 font-space text-right">{tx.quantity?.toFixed(2)}</td>
                                        )}
                                        <td className="px-4 py-2.5 text-data-xs text-parchment font-space text-right ">{tx.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-2.5 text-xs text-parchment/40 font-space">{tx.currency}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Nav */}
            <div className="flex justify-between gap-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-parchment/60 text-sm font-space hover:bg-white/10 transition-all"
                >
                    <ArrowLeft size={16} /> Adjust Mapping
                </button>
                <button
                    onClick={onImport}
                    disabled={importing}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl btn-primary text-sm font-space disabled:opacity-50 transition-all"
                >
                    {importing ? (
                        <>
                            <Loader2 size={16} className="animate-spin" /> Importing...
                        </>
                    ) : (
                        <>
                            <Zap size={16} /> Import {transformedTxs.length} Transactions
                        </>
                    )}
                </button>
            </div>
        </motion.div>
    );
}
