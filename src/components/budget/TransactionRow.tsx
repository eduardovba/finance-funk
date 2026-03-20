'use client';

import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { formatCents } from '@/lib/budgetUtils';
import { convertCurrency } from '@/lib/fxConvert';
import useBudgetStore from '@/stores/useBudgetStore';
import type { BudgetCategory, BudgetTransaction } from '@/types';

interface TransactionRowProps {
    transaction: BudgetTransaction;
    category: BudgetCategory | undefined;
    onDelete: (id: number) => void;
}

export default function TransactionRow({ transaction, category, onDelete }: TransactionRowProps) {
    const [showDeleteBtn, setShowDeleteBtn] = useState(false);
    const isIncome = category?.is_income === 1;
    const { displayCurrency, fxRates } = useBudgetStore();
    const displayCents = convertCurrency(transaction.amount_cents, transaction.currency || 'BRL', displayCurrency, fxRates);
    const x = useMotionValue(0);
    const deleteOpacity = useTransform(x, [-100, -50], [1, 0]);
    const constraintRef = useRef(null);

    const handleDragEnd = (_: any, info: PanInfo) => {
        if (info.offset.x < -80) {
            onDelete(transaction.id);
        }
    };

    return (
        <div className="relative overflow-hidden rounded-xl" ref={constraintRef}>
            {/* Delete background (revealed on swipe) */}
            <motion.div
                className="absolute inset-0 bg-red-500/20 flex items-center justify-end pr-5 rounded-xl"
                style={{ opacity: deleteOpacity }}
            >
                <Trash2 size={18} className="text-red-400" />
            </motion.div>

            {/* Swipeable row */}
            <motion.div
                className="relative flex items-center gap-3 px-4 py-3 bg-[#121418]/60 backdrop-blur-xl border border-white/[0.04] rounded-xl cursor-grab active:cursor-grabbing group"
                drag="x"
                dragConstraints={{ left: -120, right: 0 }}
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
                style={{ x }}
                whileTap={{ scale: 0.99 }}
                onHoverStart={() => setShowDeleteBtn(true)}
                onHoverEnd={() => setShowDeleteBtn(false)}
            >
                {/* Category icon */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                    style={{ backgroundColor: (category?.color || '#D4AF37') + '20' }}
                >
                    {category?.icon || '💸'}
                </div>

                {/* Description & category name */}
                <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-space text-[#F5F5DC]/80 truncate">
                        {transaction.description || category?.name || 'Transaction'}
                    </span>
                    {transaction.description && category && (
                        <span className="text-[0.6875rem] font-space text-[#F5F5DC]/30 truncate">
                            {category.name}
                        </span>
                    )}
                </div>

                {/* Amount */}
                <span className={`text-sm font-mono tabular-nums flex-shrink-0 ${isIncome ? 'text-vu-green' : 'text-[#F5F5DC]/70'}`}>
                    {isIncome ? '+' : '-'}{formatCents(displayCents, displayCurrency)}
                </span>

                {/* Desktop delete button */}
                <AnimatedDeleteBtn show={showDeleteBtn} onClick={() => onDelete(transaction.id)} />
            </motion.div>
        </div>
    );
}

function AnimatedDeleteBtn({ show, onClick }: { show: boolean; onClick: () => void }) {
    if (!show) return null;
    return (
        <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="hidden md:flex p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
        >
            <Trash2 size={14} className="text-red-400/60 hover:text-red-400" />
        </motion.button>
    );
}
