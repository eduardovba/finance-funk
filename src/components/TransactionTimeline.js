import React from 'react';
import { Card } from '@/components/ui/card';

/**
 * Mobile-First Ledger timeline replacing standard wide tables
 * 
 * @param {Array} transactions
 * @param {Function} onEdit
 * @param {Function} onDelete
 * @param {Function} renderItem - Custom render function for the content
 */
export default function TransactionTimeline({
    transactions = [],
    onEdit,
    onDelete,
    renderItem
}) {
    if (!transactions.length) {
        return (
            <div className="text-center py-8 text-white/40 text-sm italic">
                No transactions recorded.
            </div>
        );
    }

    return (
        <div className="relative pl-3 space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
            {transactions.map((tr, idx) => (
                <div key={tr.id || idx} className="relative flex items-start gap-4 z-10">

                    {/* Timeline Node Symbol */}
                    <div className="absolute left-[-5px] top-1/2 -mt-1.5 w-3 h-3 rounded-full border-2 border-[var(--bg-primary)] bg-white/20 shadow-sm" />

                    {/* Item Card */}
                    <Card className="flex-1 p-3.5 hover:bg-white/5 transition-colors duration-200">
                        <div className="flex justify-between items-start gap-2 mb-2">
                            <div className="flex flex-col">
                                {renderItem ? renderItem(tr) : (
                                    <>
                                        <span className="font-medium text-sm text-white/90 truncate max-w-[180px]">
                                            {tr.asset || tr.ticker || 'Transaction'}
                                        </span>
                                        <span className="text-xs text-white/40">{tr.date}</span>
                                    </>
                                )}
                            </div>

                            {/* Action Menu (Replaces Inline Edit/Delete buttons) */}
                            <div className="flex items-center gap-1">
                                {onEdit && (
                                    <button
                                        onClick={() => onEdit(tr)}
                                        className="p-1.5 text-white/40 hover:text-white/80 active:scale-95 transition-all"
                                        aria-label="Edit"
                                    >
                                        ✎
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        onClick={() => onDelete(tr.id)}
                                        className="p-1.5 text-rose-500/60 hover:text-rose-400 active:scale-95 transition-all"
                                        aria-label="Delete"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            ))}
        </div>
    );
}
