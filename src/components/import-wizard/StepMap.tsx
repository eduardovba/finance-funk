"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check, AlertCircle, Sparkles, ChevronDown } from 'lucide-react';
import { getFieldsForAssetClass, FIELD_LABELS } from '@/lib/spreadsheetParser';
import type { SheetConfig } from './types';
import { Card } from '@/components/ui/card';

interface StepMapProps {
    sheetsConfig: SheetConfig[];
    setSheetsConfig: (fn: any) => void;
    onNext: () => void;
    onBack: () => void;
}

export default function StepMap({ sheetsConfig, setSheetsConfig, onNext, onBack }: StepMapProps) {
    const enabledSheets = sheetsConfig.filter((s: SheetConfig) => s.enabled && s.assetClass);
    const [activeTab, setActiveTab] = useState(0);
    const isMultiSheet = enabledSheets.length > 1;

    const enabledIndices = sheetsConfig.map((s: SheetConfig, i: number) => (s.enabled && s.assetClass) ? i : -1).filter((i: number) => i >= 0);
    const activeSheetIdx = enabledIndices[activeTab] ?? enabledIndices[0];
    const sc = sheetsConfig[activeSheetIdx];

    if (!sc) return null;

    const availableFields = ['ignore', ...getFieldsForAssetClass(sc.assetClass)];
    const sampleRows = sc.rows.slice(0, 3);
    const mapping = sc.columnMapping || {};

    const updateMapping = (header: string, newField: string) => {
        setSheetsConfig((prev: SheetConfig[]) => prev.map((s: SheetConfig, i: number) =>
            i === activeSheetIdx
                ? { ...s, columnMapping: { ...s.columnMapping, [header]: newField } }
                : s
        ));
    };

    const mappedCount = Object.values(mapping).filter((f: string) => f !== 'ignore').length;
    const hasDate = Object.values(mapping).includes('date');
    const hasAmount = Object.values(mapping).includes('amount');

    const allSheetsReady = enabledSheets.every((s: SheetConfig) => {
        const m = s.columnMapping || {};
        return Object.values(m).includes('date') && Object.values(m).includes('amount');
    });

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            {/* Sheet Tabs (only for multi-sheet) */}
            {isMultiSheet && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {enabledSheets.map((s: SheetConfig, i: number) => {
                        const sheetMapping = s.columnMapping || {};
                        const sheetReady = Object.values(sheetMapping).includes('date') && Object.values(sheetMapping).includes('amount');
                        return (
                            <button
                                key={i}
                                onClick={() => setActiveTab(i)}
                                className={`px-4 py-2 rounded-lg text-xs font-space whitespace-nowrap transition-all border cursor-pointer flex items-center gap-2
                                    ${i === activeTab
                                        ? 'bg-[#D4AF37]/15 border-[#D4AF37]/30 text-[#D4AF37]'
                                        : 'bg-white/[0.03] border-white/10 text-parchment/50 hover:bg-white/[0.06]'}`}
                            >
                                📄 {s.sheetName}
                                {sheetReady && <Check size={12} className="text-emerald-400" />}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* AI Detection Banner */}
            <Card variant="flat" className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles size={16} className="text-[#D4AF37]" />
                </div>
                <div className="flex-1">
                    <p className="text-parchment text-sm font-space font-medium m-0">
                        {isMultiSheet ? `${sc.sheetName}: ` : ''}Smart Detection found {mappedCount} matches
                    </p>
                    <p className="text-parchment/40 text-xs font-space m-0">
                        Review the AI suggestions below and adjust if needed.
                    </p>
                </div>
                {hasDate && hasAmount && <Check size={18} className="text-emerald-400" />}
            </Card>

            {/* Mapping Table */}
            <Card variant="flat" className="!p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-parchment/40 font-space font-medium">Your Column</th>
                                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-parchment/40 font-space font-medium">Maps To</th>
                                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-parchment/40 font-space font-medium">Sample Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sc.headers.filter((h: string) => h).map((header: string) => {
                                const currentField = mapping[header] || 'ignore';
                                const isIgnored = currentField === 'ignore';

                                return (
                                    <tr key={header} className={`border-b border-white/[0.03] transition-colors ${isIgnored ? 'opacity-40' : 'hover:bg-white/[0.02]'}`}>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-parchment font-space font-medium">{header}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="relative inline-block">
                                                <select
                                                    value={currentField}
                                                    onChange={e => updateMapping(header, e.target.value)}
                                                    className={`appearance-none cursor-pointer pr-8 pl-3 py-1.5 rounded-lg text-xs font-space border transition-all outline-none
                                                        ${isIgnored
                                                            ? 'bg-white/[0.02] border-white/5 text-parchment/30'
                                                            : 'bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]'
                                                        }`}
                                                >
                                                    {availableFields.map((field: string) => (
                                                        <option key={field} value={field} className="bg-[#1a1a2e] text-parchment">
                                                            {(FIELD_LABELS as any)[field] || field}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={12} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${isIgnored ? 'text-parchment/20' : 'text-[#D4AF37]/60'}`} />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2 flex-wrap">
                                                {sampleRows.slice(0, 2).map((row: any, i: number) => (
                                                    <span key={i} className="px-2 py-0.5 rounded bg-white/[0.03] text-xs text-parchment/50 font-space truncate max-w-[140px]">
                                                        {String(row[header] ?? '').slice(0, 30)}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Validation warnings */}
            {!hasDate && (
                <div className="flex items-center gap-2 text-amber-400 text-xs font-space">
                    <AlertCircle size={14} />
                    <span>No column mapped to <strong>Date</strong> — this is required for all imports.</span>
                </div>
            )}
            {!hasAmount && (
                <div className="flex items-center gap-2 text-amber-400 text-xs font-space">
                    <AlertCircle size={14} />
                    <span>No column mapped to <strong>Total Amount</strong> — this is required for all imports.</span>
                </div>
            )}
            {sc.assetClass === 'Mixed' && !Object.values(mapping).includes('assetClass') && (
                <div className="flex items-center gap-2 text-amber-400 text-xs font-space">
                    <AlertCircle size={14} />
                    <span>This sheet is set to <strong>Mixed</strong> but no column is mapped to <strong>Asset Class</strong>. Map it or switch to a specific type.</span>
                </div>
            )}

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
                    disabled={!allSheetsReady}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl btn-primary text-sm font-space disabled:opacity-30 disabled:cursor-not-allowed transition-all border-none cursor-pointer"
                >
                    Preview Import <ArrowRight size={16} />
                </button>
            </div>
        </motion.div>
    );
}
