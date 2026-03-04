"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Database } from 'lucide-react';
import { usePortfolio } from '@/context/PortfolioContext';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import BankConnectButton from './BankConnectButton';
import ConnectedInstitutionsList from './ConnectedInstitutionsList';

/**
 * Inspector Drawer Component
 * Separated from AppShell for better maintainability.
 */
export default function Inspector() {
    const {
        isInspectorOpen, setIsInspectorOpen,
        setIsFormOpen, setEditingTransaction,
    } = usePortfolio();
    const { data: session } = useSession();

    const userName = session?.user?.name || 'User';
    const userImage = session?.user?.image;
    const userEmail = session?.user?.email;
    const initials = userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    return (
        <AnimatePresence>
            {isInspectorOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 top-16 bg-black/30 backdrop-blur-sm z-40"
                        onClick={() => setIsInspectorOpen(false)}
                    />

                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-16 right-0 w-96 h-[calc(100vh-4rem)] bg-[#1A0F2E] border-l border-[#D4AF37]/30 shadow-2xl z-50 p-6 overflow-y-auto flex flex-col"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="font-bebas text-2xl tracking-widest text-[#D4AF37] m-0">INSPECTOR</h3>
                            <button
                                onClick={() => setIsInspectorOpen(false)}
                                className="p-2 rounded-lg bg-transparent border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* 1. DATA SOURCES SECTION (Pluggy Integration) */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-bebas text-lg tracking-widest text-parchment/50 m-0">DATA SOURCES</h4>
                                <Database size={16} className="text-[#D4AF37]/40" />
                            </div>

                            <div className="mb-6">
                                <BankConnectButton />
                            </div>

                            <ConnectedInstitutionsList />
                        </div>

                        {/* 2. QUICK ACTIONS SECTION */}
                        <div className="mb-8">
                            <h4 className="font-bebas text-lg tracking-widest text-parchment/50 mb-4">QUICK ACTIONS</h4>
                            <button
                                onClick={() => { setEditingTransaction(null); setIsFormOpen(true); setIsInspectorOpen(false); }}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#CC5500] to-[#D4AF37] text-[#1A0F2E] font-bold text-sm tracking-wide uppercase transition-all hover:brightness-110 hover:shadow-lg hover:shadow-[#D4AF37]/20"
                            >
                                <Plus size={16} strokeWidth={2.5} />
                                Add Transaction
                            </button>
                        </div>

                        {/* 3. UI SETTINGS SECTION */}
                        <div className="mb-8">
                            <h4 className="font-bebas text-lg tracking-widest text-parchment/50 mb-4">UI SETTINGS</h4>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                                    <span className="text-xs font-space text-parchment/70 uppercase tracking-wide">Theme</span>
                                    <span className="text-xs font-space text-[#D4AF37]">Night Shift</span>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                                    <span className="text-xs font-space text-parchment/70 uppercase tracking-wide">Currency</span>
                                    <span className="text-xs font-space text-[#D4AF37]">BRL / GBP</span>
                                </div>
                            </div>
                        </div>

                        {/* User profile section */}
                        <Link
                            href="/profile"
                            onClick={() => setIsInspectorOpen(false)}
                            className="mt-auto pt-6 border-t border-white/5 flex items-center gap-3 no-underline group hover:bg-white/[0.03] -mx-6 px-6 pb-1 transition-all"
                        >
                            {userImage ? (
                                <img
                                    src={userImage}
                                    alt={userName}
                                    className="w-10 h-10 rounded-full object-cover border-2 border-[#D4AF37]/30 flex-shrink-0"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 border-2 border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] text-sm font-bold flex-shrink-0">
                                    {initials}
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="text-[#D4AF37] text-sm font-bold tracking-wide m-0 font-space truncate">{userName}</p>
                                <p className="text-parchment/40 text-xs m-0 font-space truncate">{userEmail || 'Portfolio Manager'}</p>
                            </div>
                        </Link>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

