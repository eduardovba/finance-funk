'use client';

import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Trash2, Pencil } from 'lucide-react';
import { formatCents } from '@/lib/budgetUtils';
import { convertCurrency } from '@/lib/fxConvert';
import useBudgetStore from '@/stores/useBudgetStore';
import type { BudgetCategory, BudgetTransaction } from '@/types';

interface TransactionRowProps {
    transaction: BudgetTransaction;
    category: BudgetCategory | undefined;
    isSelected: boolean;
    onToggleSelect: () => void;
    onDelete: (id: number) => void;
    onEdit: (transaction: BudgetTransaction) => void;
}

export default function TransactionRow({ transaction, category, isSelected, onToggleSelect, onDelete, onEdit }: TransactionRowProps) {
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
                className={`relative flex items-center gap-3 px-4 py-3 backdrop-blur-xl border rounded-xl cursor-grab active:cursor-grabbing group transition-all ${
                    isSelected
                        ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30 shadow-[0_4px_16px_rgba(212,175,55,0.1)]'
                        : 'bg-[#121418]/60 border-white/[0.04]'
                }`}
                drag="x"
                dragConstraints={{ left: -120, right: 0 }}
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
                style={{ x }}
                whileTap={{ scale: 0.99 }}
                onHoverStart={() => setShowDeleteBtn(true)}
                onHoverEnd={() => setShowDeleteBtn(false)}
            >
                {/* Selection Checkbox */}
                <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
                    onPointerDown={(e) => e.stopPropagation()}
                    style={{ width: 18, height: 18, minWidth: 18, minHeight: 18, padding: 0, borderRadius: 4 }}
                    className={`aspect-square border flex flex-shrink-0 items-center justify-center transition-colors touch-none ${
                        isSelected ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-white/[0.2] bg-white/[0.02] hover:border-white/[0.4]'
                    }`}
                >
                    {isSelected && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1.5 4.5L3.5 6.5L8.5 1.5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    )}
                </button>

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
                    <div className="flex items-center gap-2">
                        {transaction.description && category && (
                            <span className="text-2xs font-space text-[#F5F5DC]/30 truncate">
                                {category.name}
                            </span>
                        )}
                        {transaction.source && (
                            <span className="text-2xs uppercase tracking-[1px] font-space font-semibold px-1.5 py-px rounded bg-white/[0.04] border border-white/[0.06] text-[#F5F5DC]/25">
                                {transaction.source}
                            </span>
                        )}
                    </div>
                </div>

                {/* Amount */}
                <span className={`text-data-sm font-space  flex-shrink-0 ${isIncome ? 'text-vu-green' : 'text-[#F5F5DC]/70'}`}>
                    {isIncome ? '+' : '-'}{formatCents(displayCents, displayCurrency)}
                </span>

                {/* Desktop action buttons */}
                <AnimatedActionBtns show={showDeleteBtn} onEdit={() => onEdit(transaction)} onDelete={() => onDelete(transaction.id)} />
            </motion.div>
        </div>
    );
}

function AnimatedActionBtns({ show, onEdit, onDelete }: { show: boolean; onEdit: () => void; onDelete: () => void }) {
    if (!show) return null;
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="hidden md:flex items-center gap-0.5"
        >
            <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="p-1.5 rounded-lg hover:bg-[#D4AF37]/20 transition-colors"
            >
                <Pencil size={14} className="text-[#D4AF37]/60 hover:text-[#D4AF37]" />
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
            >
                <Trash2 size={14} className="text-red-400/60 hover:text-red-400" />
            </button>
        </motion.div>
    );
}
