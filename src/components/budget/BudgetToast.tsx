'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import useBudgetStore from '@/stores/useBudgetStore';

export default function BudgetToast() {
    const toastError = useBudgetStore(s => s.toastError);
    const clearToast = useBudgetStore(s => s.clearToast);

    useEffect(() => {
        if (toastError) {
            const timer = setTimeout(clearToast, 4000);
            return () => clearTimeout(timer);
        }
    }, [toastError, clearToast]);

    return (
        <AnimatePresence>
            {toastError && (
                <motion.div
                    initial={{ opacity: 0, y: 60, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 60, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] max-w-sm w-[90%]"
                >
                    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-500/90 backdrop-blur-xl border border-red-400/30 shadow-[0_8px_32px_rgba(239,68,68,0.3)]">
                        <span className="text-sm font-space text-white flex-1">{toastError}</span>
                        <button
                            onClick={clearToast}
                            className="p-1 rounded-full hover:bg-white/20 transition-colors"
                        >
                            <X size={14} className="text-white/80" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
