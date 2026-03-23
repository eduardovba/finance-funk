"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePortfolio } from '@/context/PortfolioContext';
import { useRouter } from 'next/navigation';
import { X, CheckCircle2, Circle, ChevronUp, ChevronDown, ListTodo, Building2, Upload, FileSpreadsheet, ChevronRight } from 'lucide-react';
import Image from 'next/image';

const PORTFOLIO_MAP = [
    { id: 'setCurrencies', label: 'Set base currencies' },
    { id: 'chooseAssets', label: 'Choose asset classes' },
    { id: 'setGoals', label: 'Define financial goals' },
    { id: 'addFirstHolding', label: 'Add your first holding' },
    { id: 'addCrypto', label: 'Connect your crypto wallet', asset: 'crypto' },
    { id: 'addRealEstate', label: 'Add your first property', asset: 'real-estate' },
    { id: 'addPensions', label: 'Link your pension provider', asset: 'pensions' },
];

const TRACK_GROW_MAP = [
    { id: 'recordFirstSnapshot', label: 'Record first monthly snapshot' },
    { id: 'exploreForecast', label: 'Check the growth forecast' },
    { id: 'customiseDashboard', label: 'Customise dashboard' },
];

export default function FTUEChecklist({ mode = 'sidebar' }) {
    const { ftueState, updateFtueProgress, refreshAllData } = usePortfolio();
    const router = useRouter();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    if (!ftueState || ftueState.sidebarDismissed || ftueState.checklistDismissed) return null;

    const items = ftueState.checklistItems || {};
    const selectedAssets = ftueState.selectedAssetClasses || [];

    // Filter dynamic portfolio items
    const portfolioList = PORTFOLIO_MAP
        .filter(item => !item.asset || selectedAssets.includes(item.asset))
        .map(item => ({ ...item, isDone: !!items[item.id] }));

    const trackGrowList = TRACK_GROW_MAP
        .map(item => ({ ...item, isDone: !!items[item.id] }));

    // Data connection tasks
    const dataTasks = [
        { id: 'connectBank', label: 'Connect bank account', isDone: !!items.connectBank },
        { id: 'importHistory', label: 'Import transactions', isDone: !!items.importHistory },
        { id: 'importBudget', label: 'Import budget data', isDone: !!items.importBudget }
    ];

    const allItemsList = [...dataTasks, ...portfolioList, ...trackGrowList];
    const total = allItemsList.length;
    const completedCount = allItemsList.filter(i => i.isDone).length;
    const progressPerc = total === 0 ? 0 : Math.round((completedCount / total) * 100);
    const allDone = total > 0 && completedCount === total;

    const handleDismiss = () => {
        updateFtueProgress({ sidebarDismissed: true });
    };

    // Render simple checklist rows
    const renderSimpleRow = (item) => (
        <div key={item.id} className="flex items-center gap-[10px] px-1 py-2">
            {item.isDone ? (
                <CheckCircle2 size={16} className="text-[#D4AF37] shrink-0" />
            ) : (
                <Circle size={16} className="text-[#F5F5DC]/20 shrink-0" />
            )}
            <span className={`font-space text-[0.72rem] leading-tight ${item.isDone ? 'line-through text-[#F5F5DC]/50' : 'text-[#F5F5DC]/90'}`}>
                {item.label}
            </span>
        </div>
    );

    // Sidebar Inner Content
    const sidebarContent = (
        <div className="flex flex-col h-full bg-[#0D0814]/95 backdrop-blur-[24px] border-l border-[#D4AF37]/15">
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-6">
                
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#D4AF37]/10 flex items-center justify-center overflow-hidden border border-[#D4AF37] shrink-0">
                            <Image src="/ftue/funk-master-avatar.png" alt="Funk Master" width={36} height={36} className="object-cover" />
                        </div>
                        <div>
                            <h3 className="font-bebas text-[1rem] tracking-[0.04em] text-[#D4AF37] leading-none mb-1">Getting Started</h3>
                            <p className="font-space text-[0.7rem] text-[#F5F5DC]/50 leading-none">
                                {allDone ? "You're all set up!" : `${completedCount} of ${total} complete`}
                            </p>
                        </div>
                    </div>
                    {mode === 'sidebar' && (
                        <button onClick={handleDismiss} className="text-[#F5F5DC]/30 hover:text-[#F5F5DC]/70 transition-colors p-1" title="Dismiss forever">
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Progress */}
                <div className="w-full h-1 bg-black/40 rounded-[4px] overflow-hidden mb-5 mt-3">
                    <motion.div 
                        className="h-full bg-gradient-to-r from-[#D4AF37] to-[#E5C349]"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPerc}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                </div>

                {/* Section: Connect your data */}
                <div className="mb-6">
                    <h4 className="font-bebas text-[0.75rem] tracking-[0.06em] text-[#F5F5DC]/40 uppercase mb-2">Connect your data</h4>
                    
                    {/* Connect Bank (WIP) */}
                    <div className="flex items-center gap-[10px] px-3 py-2.5 bg-[#1A0F2E]/50 border border-[#D4AF37]/10 rounded-[10px] mb-1.5 opacity-60 cursor-default">
                        <Building2 size={16} className="text-[#F5F5DC]/40 shrink-0" />
                        <span className="font-space text-[0.75rem] text-[#F5F5DC]/50 flex-1">Connect bank account</span>
                        <span className="font-space text-[0.55rem] uppercase tracking-[0.06em] bg-[#CC5500]/15 text-[#CC5500] px-2 py-0.5 rounded-[4px] font-bold">Coming Soon</span>
                    </div>

                    {/* Import CSV */}
                    <div 
                        onClick={() => router.push('/import')}
                        className={`flex items-center gap-[10px] px-3 py-2.5 bg-[#1A0F2E]/80 hover:bg-[#1A0F2E] hover:border-[#D4AF37]/30 border border-[#D4AF37]/10 rounded-[10px] mb-1.5 cursor-pointer transition-all ${items.importHistory ? 'opacity-60' : ''}`}
                    >
                        {items.importHistory ? (
                            <CheckCircle2 size={16} className="text-[#D4AF37] shrink-0" />
                        ) : (
                            <Upload size={16} className="text-[#D4AF37] shrink-0" />
                        )}
                        <span className="font-space text-[0.75rem] text-[#F5F5DC]/80 flex-1">Import transactions</span>
                        <ChevronRight size={14} className="text-[#F5F5DC]/30" />
                    </div>

                    {/* Import Budget */}
                    <div 
                        onClick={() => router.push('/budget/import')}
                        className={`flex items-center gap-[10px] px-3 py-2.5 bg-[#1A0F2E]/80 hover:bg-[#1A0F2E] hover:border-[#D4AF37]/30 border border-[#D4AF37]/10 rounded-[10px] cursor-pointer transition-all ${items.importBudget ? 'opacity-60' : ''}`}
                    >
                        {items.importBudget ? (
                            <CheckCircle2 size={16} className="text-[#D4AF37] shrink-0" />
                        ) : (
                            <FileSpreadsheet size={16} className="text-[#D4AF37] shrink-0" />
                        )}
                        <span className="font-space text-[0.75rem] text-[#F5F5DC]/80 flex-1">Import budget data</span>
                        <ChevronRight size={14} className="text-[#F5F5DC]/30" />
                    </div>
                </div>

                {/* Section: Set up your portfolio */}
                <div className="mb-6">
                    <h4 className="font-bebas text-[0.75rem] tracking-[0.06em] text-[#F5F5DC]/40 uppercase mb-1">Set up your portfolio</h4>
                    <div className="flex flex-col">
                        {portfolioList.map(renderSimpleRow)}
                    </div>
                </div>

                {/* Section: Track & grow */}
                <div className="mb-6">
                    <h4 className="font-bebas text-[0.75rem] tracking-[0.06em] text-[#F5F5DC]/40 uppercase mb-1">Track & grow</h4>
                    <div className="flex flex-col">
                        {trackGrowList.map(renderSimpleRow)}
                    </div>
                </div>

            </div>

            {/* Footer */}
            <div className="px-4 py-6 border-t border-[#D4AF37]/10 bg-[#0B061A]/50 shrink-0">
                {ftueState.usingDemoData && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
                        <p className="text-[0.65rem] text-red-200/70 font-space mb-1">Currently browsing Demo Data.</p>
                        <button 
                            onClick={async () => {
                                await updateFtueProgress({ usingDemoData: false });
                                refreshAllData?.();
                            }} 
                            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold font-space text-[0.7rem] px-3 py-1.5 rounded transition-colors w-full"
                        >
                            Switch to Real Data
                        </button>
                    </div>
                )}
                
                <button 
                    onClick={handleDismiss} 
                    className="w-full font-space text-[0.68rem] text-[#F5F5DC]/25 hover:text-[#F5F5DC]/60 transition-colors py-1"
                >
                    I'll set up later
                </button>
            </div>
        </div>
    );

    /* ─── Mode: Sidebar (Desktop) ─── */
    if (mode === 'sidebar') {
        return (
            <div className="w-[280px] h-full shrink-0">
                {sidebarContent}
            </div>
        );
    }

    /* ─── Mode: Mobile (Banner + Drawer) ─── */
    return (
        <div className="w-full shrink-0 z-40 bg-[#0D0814] border-b border-[#D4AF37]/20">
            {/* Banner Top */}
            <div 
                className="px-4 py-3 flex items-center justify-between cursor-pointer"
                onClick={() => setIsMobileOpen(!isMobileOpen)}
            >
                <div className="flex items-center gap-2 flex-1">
                    <div className="w-8 h-8 rounded-full bg-[#D4AF37]/10 flex items-center justify-center overflow-hidden border border-[#D4AF37]/50 shrink-0">
                        <Image src="/ftue/funk-master-avatar.png" alt="Funk Master" width={32} height={32} />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-1 pr-2">
                            <h3 className="font-bebas text-[0.85rem] tracking-[0.04em] text-[#D4AF37] leading-none">Setup Guide</h3>
                            <span className="font-space text-[0.65rem] text-[#F5F5DC]/50">{progressPerc}%</span>
                        </div>
                        <div className="w-full h-1 bg-black/40 rounded-[2px] overflow-hidden">
                            <motion.div 
                                className="h-full bg-gradient-to-r from-[#D4AF37] to-[#E5C349]"
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPerc}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                            />
                        </div>
                    </div>
                </div>
                <div className="pl-3 text-[#D4AF37]/60">
                    {isMobileOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
            </div>

            {/* Mobile Bottom Sheet (Overlay) */}
            <AnimatePresence>
                {isMobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
                            onClick={() => setIsMobileOpen(false)}
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 h-[85vh] bg-[#0D0814] rounded-t-[20px] border-t border-[#D4AF37]/30 z-[51] flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.8)]"
                        >
                            <div className="flex justify-center pt-3 pb-2">
                                <div className="w-12 h-1 bg-[#F5F5DC]/20 rounded-full" />
                            </div>
                            <div className="flex items-center justify-between px-5 pb-3 border-b border-[#D4AF37]/10">
                                <h2 className="font-bebas text-[1.2rem] text-[#F5F5DC]">Getting Started</h2>
                                <button onClick={() => setIsMobileOpen(false)} className="text-[#F5F5DC]/50 p-2"><X size={18} /></button>
                            </div>
                            
                            <div className="flex-1 overflow-auto">
                                {/* Reuse sidebar content but adjust layout inside */}
                                <div className="p-0">
                                    <div className="px-5 py-6">
                                        {/* Section: Connect your data */}
                                        <div className="mb-6">
                                            <h4 className="font-bebas text-[0.85rem] tracking-[0.06em] text-[#F5F5DC]/40 uppercase mb-3">Connect your data</h4>
                                            
                                            <div className="flex items-center gap-[12px] px-4 py-3 bg-[#1A0F2E]/50 border border-[#D4AF37]/10 rounded-[12px] mb-2 opacity-60">
                                                <Building2 size={18} className="text-[#F5F5DC]/40 shrink-0" />
                                                <span className="font-space text-[0.8rem] text-[#F5F5DC]/50 flex-1">Connect bank account</span>
                                                <span className="font-space text-[0.55rem] uppercase tracking-[0.07em] bg-[#CC5500]/15 text-[#CC5500] px-2 py-0.5 rounded-[4px] font-bold">Coming Soon</span>
                                            </div>

                                            <div 
                                                onClick={() => { router.push('/import'); setIsMobileOpen(false); }}
                                                className={`flex items-center gap-[12px] px-4 py-3 bg-[#1A0F2E]/80 border border-[#D4AF37]/10 rounded-[12px] mb-2 active:bg-[#1A0F2E] ${items.importHistory ? 'opacity-60' : ''}`}
                                            >
                                                {items.importHistory ? <CheckCircle2 size={18} className="text-[#D4AF37] shrink-0" /> : <Upload size={18} className="text-[#D4AF37] shrink-0" />}
                                                <span className="font-space text-[0.8rem] text-[#F5F5DC]/80 flex-1">Import transactions</span>
                                                <ChevronRight size={16} className="text-[#F5F5DC]/30" />
                                            </div>

                                            <div 
                                                onClick={() => { router.push('/budget/import'); setIsMobileOpen(false); }}
                                                className={`flex items-center gap-[12px] px-4 py-3 bg-[#1A0F2E]/80 border border-[#D4AF37]/10 rounded-[12px] active:bg-[#1A0F2E] ${items.importBudget ? 'opacity-60' : ''}`}
                                            >
                                                {items.importBudget ? <CheckCircle2 size={18} className="text-[#D4AF37] shrink-0" /> : <FileSpreadsheet size={18} className="text-[#D4AF37] shrink-0" />}
                                                <span className="font-space text-[0.8rem] text-[#F5F5DC]/80 flex-1">Import budget data</span>
                                                <ChevronRight size={16} className="text-[#F5F5DC]/30" />
                                            </div>
                                        </div>

                                        {/* Section: Set up your portfolio */}
                                        <div className="mb-6">
                                            <h4 className="font-bebas text-[0.85rem] tracking-[0.06em] text-[#F5F5DC]/40 uppercase mb-2">Set up your portfolio</h4>
                                            <div className="flex flex-col gap-1">
                                                {portfolioList.map(item => (
                                                    <div key={item.id} className="flex items-center gap-3 px-1 py-2.5">
                                                        {item.isDone ? <CheckCircle2 size={18} className="text-[#D4AF37] shrink-0" /> : <Circle size={18} className="text-[#F5F5DC]/20 shrink-0" />}
                                                        <span className={`font-space text-[0.8rem] ${item.isDone ? 'line-through text-[#F5F5DC]/50' : 'text-[#F5F5DC]/90'}`}>{item.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Section: Track & grow */}
                                        <div className="mb-8">
                                            <h4 className="font-bebas text-[0.85rem] tracking-[0.06em] text-[#F5F5DC]/40 uppercase mb-2">Track & grow</h4>
                                            <div className="flex flex-col gap-1">
                                                {trackGrowList.map(item => (
                                                    <div key={item.id} className="flex items-center gap-3 px-1 py-2.5">
                                                        {item.isDone ? <CheckCircle2 size={18} className="text-[#D4AF37] shrink-0" /> : <Circle size={18} className="text-[#F5F5DC]/20 shrink-0" />}
                                                        <span className={`font-space text-[0.8rem] ${item.isDone ? 'line-through text-[#F5F5DC]/50' : 'text-[#F5F5DC]/90'}`}>{item.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Mobile Footer */}
                                    <div className="px-5 py-6 bg-[#0B061A]/50 border-t border-[#D4AF37]/10">
                                        {ftueState.usingDemoData && (
                                            <div className="mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                                                <p className="text-[0.75rem] text-red-200/70 font-space mb-2">Currently browsing Demo Data.</p>
                                                <button 
                                                    onClick={async () => {
                                                        await updateFtueProgress({ usingDemoData: false });
                                                        refreshAllData?.();
                                                    }} 
                                                    className="bg-red-500/20 text-red-400 font-bold font-space text-[0.8rem] px-4 py-2.5 rounded-lg w-full"
                                                >
                                                    Switch to Real Data
                                                </button>
                                            </div>
                                        )}
                                        <button 
                                            onClick={() => { handleDismiss(); setIsMobileOpen(false); }} 
                                            className="w-full font-space text-[0.75rem] text-[#F5F5DC]/30 py-2 border border-[#F5F5DC]/10 rounded-lg"
                                        >
                                            Dismiss Checklist
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

