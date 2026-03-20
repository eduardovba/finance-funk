'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { formatCents } from '@/lib/budgetUtils';
import { convertCurrency } from '@/lib/fxConvert';
import useBudgetStore from '@/stores/useBudgetStore';
import type { BudgetCategory } from '@/types';

interface CategoryCardProps {
    category: BudgetCategory;
    onEdit: (cat: BudgetCategory) => void;
    onDelete: (id: number) => void;
}

export default function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
    const { displayCurrency, fxRates } = useBudgetStore();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: category.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const isIncome = category.is_income === 1;
    const displayTarget = convertCurrency(category.monthly_target_cents, 'BRL', displayCurrency, fxRates);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
                ${isDragging
                    ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30 shadow-[0_8px_32px_rgba(212,175,55,0.15)] z-50'
                    : 'bg-[#121418]/60 backdrop-blur-xl border-white/[0.04]'
                }`}
        >
            {/* Drag handle */}
            <button
                {...attributes}
                {...listeners}
                className="p-1 cursor-grab active:cursor-grabbing touch-none"
            >
                <GripVertical size={16} className="text-[#F5F5DC]/20" />
            </button>

            {/* Color indicator + icon */}
            <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                style={{ backgroundColor: (category.color || '#D4AF37') + '20' }}
            >
                {category.icon || '📦'}
            </div>

            {/* Info */}
            <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-space text-[#F5F5DC]/80 truncate">
                    {category.name}
                </span>
                <div className="flex items-center gap-2">
                    {category.monthly_target_cents > 0 && (
                        <span className="text-[0.6875rem] font-mono tabular-nums text-[#F5F5DC]/30">
                            {formatCents(displayTarget, displayCurrency)}/mo
                        </span>
                    )}
                    <span className={`text-[0.6rem] uppercase tracking-[1.5px] font-space px-1.5 py-0.5 rounded-md border
                        ${isIncome
                            ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10'
                            : 'text-[#F5F5DC]/30 border-white/[0.06] bg-white/[0.02]'
                        }`}
                    >
                        {isIncome ? 'Income' : 'Expense'}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
                <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => onEdit(category)}
                    className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                >
                    <Pencil size={14} className="text-[#F5F5DC]/30 hover:text-[#D4AF37]" />
                </motion.button>
                <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => onDelete(category.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                >
                    <Trash2 size={14} className="text-[#F5F5DC]/20 hover:text-red-400" />
                </motion.button>
            </div>
        </div>
    );
}
