"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePortfolio } from '@/context/PortfolioContext';
import { X, CheckCircle2, Circle, ChevronUp, ChevronDown, ListTodo } from 'lucide-react';
import Image from 'next/image';

const CHECKLIST_MAP = [
    { id: 'setCurrencies', label: 'Set base currencies', icon: '💱' },
    { id: 'chooseAssets', label: 'Choose asset classes', icon: '📊' },
    { id: 'setGoals', label: 'Define financial goals', icon: '🎯' },
    { id: 'addFirstHolding', label: 'Add your first holding', icon: '➕' },
    { id: 'recordFirstSnapshot', label: 'Log first monthly snapshot', icon: '📸' },
    { id: 'exploreForecast', label: 'Check the growth forecast', icon: '📈' },
    { id: 'addCrypto', label: 'Connect your crypto wallet', icon: '₿', asset: 'crypto' },
    { id: 'addRealEstate', label: 'Add your first property', icon: '🏠', asset: 'real-estate' },
    { id: 'addPensions', label: 'Link your pension provider', icon: '🛡️', asset: 'pensions' },
];

export default function FTUEChecklist() {
    const { ftueState, updateFtueProgress, refreshAllData } = usePortfolio();
    const [isOpen, setIsOpen] = useState(false);

    if (!ftueState || ftueState.checklistDismissed) return null;

    const items = ftueState.checklistItems || {};
    
    // Merge backend state with our map and filter by preference
    const selectedAssets = ftueState.selectedAssetClasses || [];
    const displayList = CHECKLIST_MAP
        .filter(item => !item.asset || selectedAssets.includes(item.asset))
        .map(item => ({
            ...item,
            isDone: !!items[item.id]
        }));

    const total = displayList.length;
    const completedCount = displayList.filter(i => i.isDone).length;
    const progressPerc = Math.round((completedCount / total) * 100);
    const allDone = completedCount === total;

    const handleDismiss = () => {
        updateFtueProgress({ checklistDismissed: true });
    };

    return (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
            
            {/* Expanded Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="w-80 bg-[#1A0F2E]/95 backdrop-blur-xl border border-[#D4AF37]/30 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden pointer-events-auto"
                    >
                        {/* Header */}
                        <div className="bg-[#0B0611]/60 p-4 border-b border-[#D4AF37]/20 flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center overflow-hidden border border-[#D4AF37]/40 shrink-0">
                                    <Image src="/ftue/funk-master-avatar.png" alt="Funk Master" width={40} height={40} className="object-cover" />
                                </div>
                                <div>
                                    <h3 className="text-[#D4AF37] font-space font-bold text-sm">Getting Funky</h3>
                                    <p className="text-[0.75rem] text-[#F5F5DC]/60 mt-0.5">
                                        {allDone ? "You're all set up!" : "Complete these to master your money"}
                                    </p>
                                </div>
                            </div>
                            <button onClick={handleDismiss} className="text-[#F5F5DC]/40 hover:text-[#F5F5DC] transition-colors p-1" title="Dismiss forever">
                                <X size={14} />
                            </button>
                        </div>

                        {/* Progress */}
                        <div className="px-4 pt-4 pb-2">
                            <div className="flex justify-between text-[0.75rem] font-space text-[#F5F5DC]/50 mb-1.5">
                                <span>{completedCount} of {total} complete</span>
                                <span className={allDone ? 'text-[#D4AF37]' : ''}>{progressPerc}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                                <motion.div 
                                    className="h-full bg-gradient-to-r from-[#D4AF37] to-[#E5C349]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPerc}%` }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="p-2 max-h-[40vh] overflow-y-auto custom-scrollbar">
                            {displayList.map((item, idx) => (
                                <div key={item.id} className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${item.isDone ? 'opacity-50' : 'hover:bg-white/5'}`}>
                                    {item.isDone ? (
                                        <CheckCircle2 size={16} className="text-[#D4AF37]" />
                                    ) : (
                                        <Circle size={16} className="text-[#F5F5DC]/20" />
                                    )}
                                    <span className={`text-xs font-space ${item.isDone ? 'line-through text-[#F5F5DC]/40' : 'text-[#F5F5DC]/90'}`}>
                                        {item.label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Footer details */}
                        {ftueState.usingDemoData && (
                            <div className="p-3 bg-red-500/10 border-t border-red-500/20 text-[0.75rem] text-red-200/70 text-center font-space">
                                Currently browsing Demo Data.<br/>
                                <button 
                                    onClick={async () => {
                                        await updateFtueProgress({ usingDemoData: false });
                                        refreshAllData?.();
                                    }} 
                                    className="text-red-400 font-bold hover:underline mt-1"
                                >
                                    Switch to Real Data
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating FAB */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="pointer-events-auto h-12 px-4 rounded-full bg-[#1A0F2E] border border-[#D4AF37]/40 shadow-lg shadow-black/80 flex items-center gap-2 text-[#D4AF37]"
            >
                {allDone && !isOpen ? (
                    <Image src="/ftue/funk-master-avatar.png" alt="Done!" width={24} height={24} className="rounded-full border border-[#D4AF37]" />
                ) : (
                    <ListTodo size={18} />
                )}
                
                <span className="font-space text-xs font-bold shrink-0">
                    {allDone ? 'Setup Complete!' : `${progressPerc}% Set Up`}
                </span>
                
                {isOpen ? <ChevronDown size={14} className="opacity-50" /> : <ChevronUp size={14} className="opacity-50" />}
            </motion.button>
        </div>
    );
}
