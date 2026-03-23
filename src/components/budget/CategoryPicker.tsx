'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { BudgetCategory } from '@/types';

interface CategoryPickerProps {
    categories: BudgetCategory[];
    selectedId: number | null;
    onSelect: (id: number) => void;
}

export default function CategoryPicker({ categories, selectedId, onSelect }: CategoryPickerProps) {
    if (categories.length === 0) {
        return (
            <p className="text-sm text-[#F5F5DC]/30 font-space text-center py-4">
                No categories yet. Create categories first.
            </p>
        );
    }

    return (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {categories.map(cat => {
                const isSelected = cat.id === selectedId;
                return (
                    <motion.button
                        key={cat.id}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => onSelect(cat.id)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all
                            ${isSelected
                                ? 'bg-[#D4AF37]/15 border-[#D4AF37]/40 shadow-[0_0_12px_rgba(212,175,55,0.15)]'
                                : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'
                            }`}
                    >
                        <span className="text-xl">{cat.icon || '📦'}</span>
                        <span className={`text-2xs font-space truncate w-full text-center
                            ${isSelected ? 'text-[#D4AF37]' : 'text-[#F5F5DC]/50'}`}>
                            {cat.name}
                        </span>
                    </motion.button>
                );
            })}
        </div>
    );
}
