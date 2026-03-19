"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Loader2 } from 'lucide-react';

interface StepUploadProps {
    onFile: (f: File | undefined) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    parsing: boolean;
    file: File | null;
    providerName?: string;
}

export default function StepUpload({ onFile, onDrop, onDragOver, fileInputRef, parsing, file, providerName }: StepUploadProps) {
    const [dragActive, setDragActive] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
        >
            <div
                onDrop={(e) => { onDrop(e); setDragActive(false); }}
                onDragOver={(e) => { onDragOver(e); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`glass-card cursor-pointer text-center py-20 px-8 transition-all duration-300 group
                    ${dragActive ? 'border-[#D4AF37]/60 bg-[#D4AF37]/5 scale-[1.01]' : 'hover:border-[#D4AF37]/30'}`}
            >
                {parsing ? (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 size={48} className="text-[#D4AF37] animate-spin" />
                        <p className="text-parchment/60 font-space text-sm">Parsing {file?.name}...</p>
                    </div>
                ) : (
                    <>
                        <div className="relative w-20 h-20 mx-auto mb-6">
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-[#CC5500]/10 group-hover:from-[#D4AF37]/30 group-hover:to-[#CC5500]/20 transition-all" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Upload size={32} className="text-[#D4AF37] group-hover:scale-110 transition-transform" />
                            </div>
                        </div>
                        <h3 className="font-bebas text-2xl tracking-widest text-[#D4AF37] mb-2">
                            {providerName ? `Upload ${providerName} Statement` : 'Drop Your Spreadsheet'}
                        </h3>
                        <p className="text-parchment/50 font-space text-sm mb-4 max-w-md mx-auto">
                            {providerName
                                ? `Drop your ${providerName} export file here. We'll auto-detect columns and import instantly.`
                                : <>Drag & drop a file here, or click to browse.
                                    We support <span className="text-[#D4AF37]/80">.csv</span>,{' '}
                                    <span className="text-[#D4AF37]/80">.xlsx</span>,{' '}
                                    <span className="text-[#D4AF37]/80">.xls</span>,{' '}
                                    <span className="text-[#D4AF37]/80">.tsv</span>, and{' '}
                                    <span className="text-[#D4AF37]/80">.ods</span> formats.</>}
                        </p>
                        {!providerName && (
                            <div className="flex items-center justify-center gap-4 text-parchment/30 text-xs font-space">
                                <span>Google Sheets → File → Download</span>
                                <span>•</span>
                                <span>Excel → Save As</span>
                            </div>
                        )}
                    </>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.tsv,.ods"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
            />

            {/* Template Downloads (generic mode only) */}
            {!providerName && (
                <div className="mt-4 text-center" onClick={e => e.stopPropagation()}>
                    <p className="text-parchment/30 text-xs font-space mb-2.5">
                        Need a template? Download one to see the expected format:
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {[
                            { label: 'Equity', file: 'equity_template.csv', icon: '📈' },
                            { label: 'Crypto', file: 'crypto_template.csv', icon: '₿' },
                            { label: 'Fixed Income', file: 'fixed_income_template.csv', icon: '🏦' },
                            { label: 'Pension', file: 'pension_template.csv', icon: '🏛️' },
                            { label: 'Real Estate', file: 'real_estate_template.csv', icon: '🏠' },
                            { label: 'Debt', file: 'debt_template.csv', icon: '💳' },
                        ].map(t => (
                            <a
                                key={t.file}
                                href={`/templates/${t.file}`}
                                download={t.file}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-parchment/50 text-[0.75rem] font-space hover:border-[#D4AF37]/30 hover:text-[#D4AF37] hover:bg-[#D4AF37]/5 transition-all no-underline"
                            >
                                <span>{t.icon}</span> {t.label}
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
}
