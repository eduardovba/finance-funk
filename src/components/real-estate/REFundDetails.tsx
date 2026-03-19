import React from 'react';
import _TransactionTimeline from '../TransactionTimeline';
const TransactionTimeline = _TransactionTimeline as any;
import { formatCurrency } from '@/lib/currency';
import type { FundHoldingComputed } from './types';

interface REFundDetailsProps {
    asset: FundHoldingComputed & { type?: string };
    handleFundBuyClick: (f: any) => void;
    handleFundSellClick: (f: any) => void;
    handleEditTransaction: (tr: any) => void;
    handleDeleteEntry: (id: any) => void;
}

export default function REFundDetails({
    asset, handleFundBuyClick, handleFundSellClick, handleEditTransaction, handleDeleteEntry,
}: REFundDetailsProps) {
    const avgCost = asset.totalQuantity > 0 ? asset.totalInvestment / asset.totalQuantity : 0;
    return (
        <>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                    <span className="block text-[0.75rem] text-white/40 uppercase tracking-widest mb-1.5">Shares</span>
                    <span className="text-sm font-medium text-white/90 font-mono tabular-nums">{asset.totalQuantity}</span>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                    <span className="block text-[0.75rem] text-white/40 uppercase tracking-widest mb-1.5">Live Price</span>
                    <span className="text-sm font-medium text-white/90 font-mono tabular-nums">{formatCurrency(asset.currentPrice, 'BRL')}</span>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                    <span className="block text-[0.75rem] text-white/40 uppercase tracking-widest mb-1.5">Avg Cost</span>
                    <span className="text-sm font-medium text-white/90 font-mono tabular-nums">{formatCurrency(avgCost, 'BRL')}</span>
                </div>
                <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl p-3">
                    <span className="block text-[0.75rem] text-[#D4AF37]/60 uppercase tracking-widest mb-1.5">Current Value</span>
                    <span className="text-sm font-bold text-[#D4AF37] font-mono tabular-nums">{formatCurrency(asset.currentValue, 'BRL')}</span>
                </div>
                <div className="col-span-2 bg-white/[0.02] border border-white/5 rounded-xl p-3 flex justify-between items-center">
                    <span className="text-[0.75rem] text-white/40 uppercase tracking-widest">Total P&L</span>
                    <span className={`text-sm font-bold font-mono tabular-nums ${asset.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {asset.pnl >= 0 ? '+' : ''}{formatCurrency(asset.pnl, 'BRL')} ({asset.roi >= 0 ? '+' : ''}{asset.roi.toFixed(1)}%)
                    </span>
                </div>
            </div>
            <div className="flex gap-3 mt-4">
                <button onClick={() => handleFundBuyClick(asset)} className="flex-1 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-semibold transition-colors">Buy</button>
                <button onClick={() => handleFundSellClick(asset)} className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-sm font-semibold transition-colors">Sell</button>
            </div>
            {asset.transactions && asset.transactions.length > 0 && (
                <div className="pt-4 border-t border-white/5 mt-4">
                    <h4 className="text-[0.75rem] text-white/40 uppercase tracking-[2px] mb-3">Transactions</h4>
                    <div className="bg-black/20 rounded-xl p-4 border border-white/[0.03]">
                        <TransactionTimeline transactions={asset.transactions.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)}
                            onEdit={(tr: any) => handleEditTransaction({ ...tr, category: 'fund' })}
                            onDelete={handleDeleteEntry}
                            renderItem={(tx: any) => (
                                <>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${tx.quantity >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                        <span className="font-medium text-[0.75rem] text-white/90 uppercase tracking-wider font-space">{tx.quantity >= 0 ? 'Bought' : 'Sold'}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm font-bold text-white tracking-tight font-mono tabular-nums">{formatCurrency(Math.abs(tx.investment), 'BRL')}</span>
                                        <span className="text-[0.75rem] text-white/40 font-mono tabular-nums tracking-tight">
                                            {tx.quantity?.toLocaleString(undefined, { maximumFractionDigits: 2 })} units • {tx.date}
                                        </span>
                                    </div>
                                </>
                            )} />
                    </div>
                </div>
            )}
        </>
    );
}
