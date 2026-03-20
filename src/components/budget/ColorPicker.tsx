'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const PRESET_COLORS = [
    '#D4AF37',  // Gold
    '#34D399',  // Emerald
    '#60A5FA',  // Blue
    '#F472B6',  // Pink
    '#A78BFA',  // Purple
    '#FB923C',  // Orange
    '#FBBF24',  // Amber
    '#F87171',  // Red
    '#2DD4BF',  // Teal
    '#818CF8',  // Indigo
    '#C084FC',  // Violet
    '#94A3B8',  // Slate
];

interface ColorPickerProps {
    selected: string | null;
    onSelect: (color: string) => void;
}

export default function ColorPicker({ selected, onSelect }: ColorPickerProps) {
    return (
        <div className="grid grid-cols-6 gap-2">
            {PRESET_COLORS.map(hex => (
                <motion.button
                    key={hex}
                    type="button"
                    whileTap={{ scale: 0.85 }}
                    onClick={() => onSelect(hex)}
                    className="w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-all"
                    style={{
                        backgroundColor: hex + '25',
                        borderColor: selected === hex ? hex : 'transparent',
                        boxShadow: selected === hex ? `0 0 12px ${hex}40` : 'none',
                    }}
                >
                    {selected === hex && <Check size={14} style={{ color: hex }} />}
                </motion.button>
            ))}
        </div>
    );
}
