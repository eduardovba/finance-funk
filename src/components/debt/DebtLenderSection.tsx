import React from 'react';
import { formatCurrency, convertCurrency } from '@/lib/currency';
import type { LenderSummary } from './types';

interface DebtLenderSectionProps {
    lenderName: string;
    data: LenderSummary;
    lenderCur: string;
    effectiveCurrency: string;
    rates: Record<string, number> | null | undefined;
    isOpen: boolean;
    isNewlyAdded: boolean;
    showEmptyLenders: boolean;
    explicitDbLenders: string[];
    onToggle: () => void;
    onAddClick: (lenderName: string) => void;
    onDeleteLenderClick: (lenderName: string) => void;
    onEditClick: (tr: any) => void;
    onDeleteClick: (id: string | number) => void;
    onSelectAsset: (tr: any, lenderName: string) => void;
}

export default function DebtLenderSection({
    lenderName, data, lenderCur, effectiveCurrency, rates,
    isOpen, isNewlyAdded, showEmptyLenders, explicitDbLenders,
    onToggle, onAddClick, onDeleteLenderClick, onEditClick, onDeleteClick, onSelectAsset
}: DebtLenderSectionProps) {
    if (!showEmptyLenders && !isNewlyAdded && data.transactions.length === 0) return null;

    const totalInTop = convertCurrency(data.total, lenderCur, effectiveCurrency, rates as any);
    const glowClass = isNewlyAdded ? 'shadow-[0_0_25px_rgba(212,175,55,0.4)] border-[#D4AF37] ring-1 ring-[#D4AF37]/50' : '';

    return (
        <div id={encodeURIComponent(lenderName)} className={`mb-8 rounded-2xl transition-all duration-1000 ${glowClass}`}>
            <div
                onClick={onToggle}
                className="flex justify-between items-center mb-4 px-4 py-3 cursor-pointer bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] hover:bg-[#121418]/70 rounded-2xl transition-colors shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-lg shrink-0">
                        🏦
                    </div>
                    <div className="flex flex-col">
                        <span className="text-white font-semibold">{lenderName}</span>
                        <span className={`text-xs font-medium ${data.total !== 0 ? 'text-rose-400' : 'text-white/40'}`}>
                            {formatCurrency(data.total, lenderCur)}{lenderCur !== effectiveCurrency ? ` · ≈ ${formatCurrency(totalInTop, effectiveCurrency)}` : ''}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <span className="text-xl font-bold text-white tracking-tight">{formatCurrency(data.total, lenderCur)}</span>
                        {lenderCur !== effectiveCurrency && <span className="text-xs text-white/40 mt-0.5">≈ {formatCurrency(totalInTop, effectiveCurrency)}</span>}
                    </div>

                    <div className="flex items-center gap-2">
                        {(explicitDbLenders.includes(lenderName) || data.transactions.length === 0) && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDeleteLenderClick(lenderName); }}
                                className="w-8 h-8 rounded-full bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center transition-colors shrink-0 text-sm"
                                title="Delete Lender"
                            >
                                🗑️
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); onAddClick(lenderName); }}
                            className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex items-center justify-center text-lg font-bold transition-colors shrink-0"
                            title="Add Transaction"
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>

            {isOpen && data.transactions.length > 0 && (
                <div className="px-4 pb-4">
                    <div className="bg-white/[0.02] rounded-xl border border-white/5 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="text-left px-4 py-3 text-white/40 text-xs font-medium uppercase tracking-wider">Date</th>
                                    <th className="text-right px-4 py-3 text-white/40 text-xs font-medium uppercase tracking-wider">Amount ({lenderCur})</th>
                                    <th className="text-right px-4 py-3 text-white/40 text-xs font-medium uppercase tracking-wider hidden sm:table-cell">Original (BRL)</th>
                                    <th className="text-left px-4 py-3 text-white/40 text-xs font-medium uppercase tracking-wider hidden md:table-cell">Notes</th>
                                    <th className="px-4 py-3 text-white/40 text-xs font-medium uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.transactions.map((tr, idx) => (
                                    <tr key={tr.id || idx} className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors cursor-pointer"
                                        onClick={() => onSelectAsset(tr, lenderName)}>
                                        <td className="px-4 py-3 text-white/70 font-mono text-xs">{tr.date}</td>
                                        <td className="px-4 py-3 text-right text-rose-400 font-bold font-mono">{formatCurrency(convertCurrency(tr.value_brl || 0, 'BRL', lenderCur, rates as any), lenderCur)}</td>
                                        <td className="px-4 py-3 text-right text-white/60 font-mono hidden sm:table-cell">{lenderCur !== 'BRL' ? formatCurrency(tr.value_brl, 'BRL') : '—'}</td>
                                        <td className="px-4 py-3 text-white/50 text-xs hidden md:table-cell max-w-[200px] truncate">{tr.obs || '—'}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center gap-1 justify-end">
                                                <button onClick={(e) => { e.stopPropagation(); onEditClick(tr); }}
                                                    className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs transition-colors" title="Edit">✏️</button>
                                                <button onClick={(e) => { e.stopPropagation(); onDeleteClick(tr.id!); }}
                                                    className="w-7 h-7 rounded-full bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center text-xs transition-colors" title="Delete">🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {isOpen && data.transactions.length === 0 && (
                <div className="px-4 pb-4">
                    <div className="bg-white/[0.02] rounded-xl border border-white/5 p-6 text-center">
                        <p className="text-white/40 text-sm">No transactions for this lender yet.</p>
                        <button onClick={() => onAddClick(lenderName)}
                            className="mt-3 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm font-medium transition-colors text-white/70">
                            Log a Debt
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
