'use client';

import React from 'react';
import { motion } from 'framer-motion';

const EMOJI_OPTIONS = [
    '🍔', '🛒', '🏠', '🚗', '💡', '📱',
    '🎮', '✈️', '🏥', '📚', '🎵', '💪',
    '☕', '🍕', '🎬', '👕', '💼', '🐾',
    '🎁', '💰', '📊', '🏦', '💳', '🔧',
];

interface EmojiPickerProps {
    selected: string | null;
    onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ selected, onSelect }: EmojiPickerProps) {
    return (
        <div className="grid grid-cols-6 gap-2">
            {EMOJI_OPTIONS.map(emoji => (
                <motion.button
                    key={emoji}
                    type="button"
                    whileTap={{ scale: 0.85 }}
                    onClick={() => onSelect(emoji)}
                    className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center text-lg transition-all
                        ${selected === emoji
                            ? 'bg-[#D4AF37]/15 border-[#D4AF37]/40 shadow-[0_0_12px_rgba(212,175,55,0.15)]'
                            : 'bg-white/[0.03] border-transparent hover:bg-white/[0.06]'
                        }`}
                >
                    {emoji}
                </motion.button>
            ))}
        </div>
    );
}
