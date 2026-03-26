'use client';

import React from 'react';
import { formatDayLabel } from '@/lib/budgetUtils';
import TransactionRow from '@/components/budget/TransactionRow';
import type { BudgetCategory, BudgetTransaction } from '@/types';

interface TransactionDayGroupProps {
    date: string;                     // YYYY-MM-DD
    transactions: BudgetTransaction[];
    categories: BudgetCategory[];
    selectedTxIds: Set<number>;
    onToggleSelect: (id: number) => void;
    onDelete: (id: number) => void;
    onEdit: (transaction: BudgetTransaction) => void;
}

export default function TransactionDayGroup({ date, transactions, categories, selectedTxIds, onToggleSelect, onDelete, onEdit }: TransactionDayGroupProps) {
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    return (
        <div className="mb-5">
            {/* Day header */}
            <h4 className="text-xs text-[#F5F5DC]/35 uppercase tracking-[2px] font-space mb-2 px-1">
                {formatDayLabel(date)}
            </h4>

            {/* Transaction rows */}
            <div className="flex flex-col gap-1.5">
                {transactions.map(tx => (
                    <TransactionRow
                        key={tx.id}
                        transaction={tx}
                        category={categoryMap.get(tx.category_id ?? -1)}
                        isSelected={selectedTxIds.has(tx.id)}
                        onToggleSelect={() => onToggleSelect(tx.id)}
                        onDelete={onDelete}
                        onEdit={onEdit}
                    />
                ))}
            </div>
        </div>
    );
}
