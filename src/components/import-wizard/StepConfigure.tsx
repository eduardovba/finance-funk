"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { FileSpreadsheet, ArrowRight, ArrowLeft, Check, Sparkles } from 'lucide-react';
import { ASSET_CLASSES } from './useImportWizard';
import type { SheetConfig } from './types';

const ALL_ASSET_CLASSES = [
    ...ASSET_CLASSES,
    { value: 'Mixed', label: 'Mixed (Map per Row)', icon: '🔀', desc: 'File has an asset-class column' },
];

interface StepConfigureProps {
    sheetsConfig: SheetConfig[];
    setSheetsConfig: (fn: any) => void;
    onNext: () => void;
    onBack: () => void;
    fileName?: string;
}

export default function StepConfigure({ sheetsConfig, setSheetsConfig, onNext, onBack, fileName }: StepConfigureProps) {
    const isMultiSheet = sheetsConfig.length > 1;
    const totalRows = sheetsConfig.reduce((sum: number, s: SheetConfig) => sum + s.rows.length, 0);
    const enabledSheets = sheetsConfig.filter((s: SheetConfig) => s.enabled);
    const canProceed = enabledSheets.length > 0 && enabledSheets.every((s: SheetConfig) => s.assetClass);

    const updateSheet = (idx: number, updates: Partial<SheetConfig>) => {
        setSheetsConfig((prev: SheetConfig[]) => prev.map((s: SheetConfig, i: number) => i === idx ? { ...s, ...updates } : s));
    };

    const renderSheetConfig = (sc: SheetConfig, idx: number) => (
        <div key={idx} className={`glass-card space-y-5 ${isMultiSheet ? '' : ''}`}>
            {isMultiSheet && (
                <div className="flex items-center gap-3 pb-3 border-b border-white/5">
                    <button
                        onClick={() => updateSheet(idx, { enabled: !sc.enabled })}
                        className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer border-none ${sc.enabled ? 'bg-[#D4AF37]/40' : 'bg-white/10'}`}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${sc.enabled ? 'right-1' : 'left-1'}`} />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-parchment font-space text-sm font-bold m-0 truncate">
                            📄 {sc.sheetName}
                        </h4>
                        <p className="text-parchment/40 text-xs font-space m-0">
                            {sc.rows.length} rows · {sc.headers.length} columns
                        </p>
                    </div>
                </div>
            )}

            {(sc.enabled || !isMultiSheet) && (
                <>
                    {/* Asset Class */}
                    <div>
                        <h4 className="font-bebas text-lg tracking-widest text-[#D4AF37] mb-2">
                            {isMultiSheet ? 'Asset Class' : 'What type of data is this?'}
                        </h4>
                        {!isMultiSheet && (
                            <p className="text-parchment/40 text-xs font-space mb-3">Select the asset class that best matches your spreadsheet.</p>
                        )}
                        <div className={`grid gap-2 ${isMultiSheet ? 'grid-cols-3 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3 gap-3'}`}>
                            {ALL_ASSET_CLASSES.map(ac => (
                                <button
                                    key={ac.value}
                                    onClick={() => updateSheet(idx, { assetClass: ac.value })}
                                    className={`${isMultiSheet ? 'p-2.5' : 'p-4'} rounded-xl border text-left transition-all group cursor-pointer
                                        ${sc.assetClass === ac.value
                                            ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40 ring-1 ring-[#D4AF37]/20'
                                            : 'bg-white/[0.03] border-white/10 hover:border-[#D4AF37]/20 hover:bg-white/[0.05]'
                                        }`}
                                >
                                    <span className={`${isMultiSheet ? 'text-lg' : 'text-2xl'} block mb-1`}>{ac.icon}</span>
                                    <span className={`${isMultiSheet ? 'text-xs' : 'text-sm'} font-space font-medium block ${sc.assetClass === ac.value ? 'text-[#D4AF37]' : 'text-parchment'}`}>
                                        {ac.label}
                                    </span>
                                    {!isMultiSheet && <span className="text-xs text-parchment/30 font-space">{ac.desc}</span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Defaults */}
                    <div className={isMultiSheet ? '' : 'glass-card'}>
                        <h4 className={`font-bebas tracking-widest text-[#D4AF37] mb-3 ${isMultiSheet ? 'text-base' : 'text-lg'}`}>Defaults</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="text-[0.75rem] uppercase tracking-widest text-parchment/30 mb-1 font-space block">Currency</label>
                                <select
                                    value={sc.defaultCurrency}
                                    onChange={e => updateSheet(idx, { defaultCurrency: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-parchment font-space outline-none focus:border-[#D4AF37]/40 transition-colors appearance-none cursor-pointer"
                                >
                                    {['GBP', 'BRL', 'USD', 'EUR', 'JPY', 'CHF', 'AUD', 'CAD', 'TRY', 'INR'].map(c => (
                                        <option key={c} value={c} className="bg-[#1a1a2e] text-parchment">{c}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[0.75rem] uppercase tracking-widest text-parchment/30 mb-1 font-space block">Broker</label>
                                <input
                                    value={sc.defaultBroker}
                                    onChange={e => updateSheet(idx, { defaultBroker: e.target.value })}
                                    placeholder="e.g., Trading 212, XP"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-parchment font-space outline-none focus:border-[#D4AF37]/40 transition-colors placeholder:text-parchment/20"
                                />
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            {/* File Summary */}
            <div className="glass-card flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <FileSpreadsheet size={24} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-parchment font-space text-sm font-medium m-0 truncate">{fileName}</h4>
                    <p className="text-parchment/40 text-xs font-space m-0">
                        {totalRows} rows · {sheetsConfig.length} {sheetsConfig.length === 1 ? 'sheet' : 'sheets'}
                        {isMultiSheet && ` · ${enabledSheets.length} enabled`}
                    </p>
                </div>
                <Check size={20} className="text-emerald-400 flex-shrink-0" />
            </div>

            {/* Sheet Configs */}
            {sheetsConfig.map((sc: SheetConfig, idx: number) => renderSheetConfig(sc, idx))}

            {/* Nav */}
            <div className="flex justify-between gap-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-parchment/60 text-sm font-space hover:bg-white/10 transition-all cursor-pointer"
                >
                    <ArrowLeft size={16} /> Back
                </button>
                <button
                    onClick={onNext}
                    disabled={!canProceed}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl btn-primary text-sm font-space disabled:opacity-30 disabled:cursor-not-allowed transition-all border-none cursor-pointer"
                >
                    <Sparkles size={16} /> Auto-Map Columns <ArrowRight size={16} />
                </button>
            </div>
        </motion.div>
    );
}
