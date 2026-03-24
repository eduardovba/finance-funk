"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { FileSpreadsheet, Building2, FileText } from 'lucide-react';


interface WizardLandingProps {
    onChooseProvider: () => void;
    onChooseGeneric: () => void;
}

export default function WizardLanding({ onChooseProvider, onChooseGeneric }: WizardLandingProps) {
    return (
        <div className="max-w-5xl mx-auto">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 mb-2">
                <FileSpreadsheet size={20} className="text-[#D4AF37]/60" />
                <h2 className="text-xs uppercase text-parchment/50 tracking-[0.2em] font-space font-medium m-0">
                    Import Data
                </h2>
            </motion.div>
            <motion.h1
                initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="font-bebas text-3xl md:text-4xl tracking-widest text-gradient m-0 mb-8"
            >
                Update Your Positions
            </motion.h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 25 }}
                    whileHover={{ scale: 1.015, y: -3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onChooseProvider}
                    className="group text-left cursor-pointer bg-[rgba(18,20,24,0.55)] backdrop-blur-[24px] backdrop-saturate-150 border border-[rgba(255,255,255,0.06)] border-t-[rgba(255,255,255,0.1)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 hover:border-[#D4AF37]/40 transition-all"
                >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-[#CC5500]/10 flex items-center justify-center mb-4 group-hover:from-[#D4AF37]/30 group-hover:to-[#CC5500]/20 transition-all">
                        <Building2 size={28} className="text-[#D4AF37]" />
                    </div>
                    <h3 className="font-bebas text-xl tracking-widest text-[#D4AF37] mb-1">
                        Provider Statement
                    </h3>
                    <p className="text-parchment/50 font-space text-xs mb-4 leading-relaxed">
                        Upload a statement from your broker or bank. We&apos;ll auto-detect the format and import everything — no manual mapping needed.
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {['Trading 212', 'B3/CEI', 'XP', 'IBKR', '+7 more'].map(name => (
                            <span key={name} className="px-2 py-0.5 rounded text-2xs font-space bg-white/[0.05] text-parchment/30">
                                {name}
                            </span>
                        ))}
                    </div>
                </motion.button>

                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 25 }}
                    whileHover={{ scale: 1.015, y: -3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onChooseGeneric}
                    className="group text-left cursor-pointer bg-[rgba(18,20,24,0.55)] backdrop-blur-[24px] backdrop-saturate-150 border border-[rgba(255,255,255,0.06)] border-t-[rgba(255,255,255,0.1)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 hover:border-[#D4AF37]/40 transition-all"
                >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-[#CC5500]/10 flex items-center justify-center mb-4 group-hover:from-[#D4AF37]/30 group-hover:to-[#CC5500]/20 transition-all">
                        <FileText size={28} className="text-[#D4AF37]" />
                    </div>
                    <h3 className="font-bebas text-xl tracking-widest text-[#D4AF37] mb-1">
                        Generic Spreadsheet
                    </h3>
                    <p className="text-parchment/50 font-space text-xs mb-4 leading-relaxed">
                        Import any CSV or Excel file. You&apos;ll choose the asset class and map columns manually with our smart detection.
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {['.csv', '.xlsx', '.xls', '.tsv', '.ods'].map(fmt => (
                            <span key={fmt} className="px-2 py-0.5 rounded text-2xs font-space bg-white/[0.05] text-parchment/30">
                                {fmt}
                            </span>
                        ))}
                    </div>
                </motion.button>
            </div>
        </div>
    );
}
