"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function DemoBanner({ onCreateAccount }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="relative z-50 bg-gradient-to-r from-[#D4AF37]/15 via-[#CC5500]/10 to-[#D4AF37]/15 border-b border-[#D4AF37]/20 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0"
        >
            <div className="flex items-center gap-2 min-w-0">
                <Sparkles size={14} className="text-[#D4AF37] shrink-0" />
                <p className="text-xs text-[#F5F5DC]/70 font-space truncate">
                    <span className="hidden sm:inline">You&apos;re exploring Finance Funk with demo data. </span>
                    <span className="sm:hidden">Demo mode — </span>
                    <span className="text-[#D4AF37]/80">Create an account to track your own finances!</span>
                </p>
            </div>
            <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onCreateAccount}
                className="shrink-0 px-4 py-1.5 rounded-lg font-space text-xs tracking-wide font-bold bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#0B0611] hover:shadow-md hover:shadow-[#D4AF37]/20 border-none cursor-pointer transition-all"
            >
                Create Account →
            </motion.button>
        </motion.div>
    );
}
