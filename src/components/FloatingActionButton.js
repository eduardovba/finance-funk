import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Building2, Receipt, Home } from 'lucide-react';

/**
 * Expandable Material You style Floating Action Button
 * 
 * @param {Function} onAddBroker
 * @param {Function} onAddTransaction
 * @param {Function} onAddProperty
 * @param {boolean} isVisible
 */
export default function FloatingActionButton({
    onAddBroker,
    onAddTransaction,
    onAddProperty,
    isVisible = true,
    brokerLabel = 'Add Broker',
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isVisible) return null;

    const handleTap = (e, action) => {
        e.stopPropagation();
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(10);
        }

        if (action === 'toggle') {
            setIsOpen(!isOpen);
        } else {
            setIsOpen(false);
            if (action === 'broker' && onAddBroker) onAddBroker();
            if (action === 'transaction' && onAddTransaction) onAddTransaction();
            if (action === 'property' && onAddProperty) onAddProperty();
        }
    };

    // Close menu when clicking outside
    React.useEffect(() => {
        if (!isOpen) return;
        const closeMenu = () => setIsOpen(false);
        document.addEventListener('click', closeMenu);
        return () => document.removeEventListener('click', closeMenu);
    }, [isOpen]);

    const content = (
        <div className="fixed bottom-[5.5rem] md:bottom-10 right-4 md:right-6 z-[999] flex flex-col items-end gap-3">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 15, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="flex flex-col items-end gap-3 mb-2"
                    >
                        <motion.button
                            onClick={(e) => handleTap(e, 'broker')}
                            className="flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 px-4 py-3 rounded-2xl shadow-xl transition-colors group"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <span className="text-white text-sm font-semibold tracking-wide font-space uppercase">{brokerLabel}</span>
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform">
                                <Building2 size={16} />
                            </div>
                        </motion.button>

                        {onAddProperty && (
                            <motion.button
                                onClick={(e) => handleTap(e, 'property')}
                                className="flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 px-4 py-3 rounded-2xl shadow-xl transition-colors group"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <span className="text-white text-sm font-semibold tracking-wide font-space uppercase">Add Property</span>
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform">
                                    <Home size={16} />
                                </div>
                            </motion.button>
                        )}

                        <motion.button
                            onClick={(e) => handleTap(e, 'transaction')}
                            className="flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 px-4 py-3 rounded-2xl shadow-xl transition-colors group"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <span className="text-white text-sm font-semibold tracking-wide font-space uppercase">Add Transaction</span>
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform">
                                <Receipt size={16} />
                            </div>
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                id="global-fab"
                onClick={(e) => handleTap(e, 'toggle')}
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-shadow hover:shadow-[0_8px_32px_rgba(212,175,55,0.4)] relative overflow-hidden ring-1 ring-white/10"
                style={{
                    background: 'linear-gradient(135deg, #CC5500 0%, #D4AF37 100%)',
                }}
                aria-label={isOpen ? "Close menu" : "Add new item"}
            >
                {/* Glossy overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-white/40 opacity-50" />
                <Plus size={36} className="text-[#1A0F2E] relative z-10" />
            </motion.button>
        </div>
    );

    if (!mounted) return null;
    return createPortal(content, document.body);
}
