"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';


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
            <Card
                variant="flat"
                onDrop={(e) => { onDrop(e); setDragActive(false); }}
                onDragOver={(e) => { onDragOver(e); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`
                    !border-2 !border-dashed
                    !p-12 flex flex-col items-center justify-center gap-4 cursor-pointer group
                    ${dragActive
                        ? '!border-[#34D399]/50 !bg-[#34D399]/5 scale-[1.01]'
                        : '!border-white/[0.08] hover:!border-[#D4AF37]/30'
                    }`}
            >
                {parsing ? (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 size={48} className="text-[#D4AF37] animate-spin" />
                        <p className="text-parchment/60 font-space text-sm">Parsing {file?.name}...</p>
                    </div>
                ) : (
                    <>
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
                            dragActive ? 'bg-[#34D399]/10' : 'bg-[#D4AF37]/10'
                        }`}>
                            <Upload size={28} className={dragActive ? 'text-[#34D399]' : 'text-[#D4AF37]'} />
                        </div>
                        <div className="text-center">
                            <p className="text-parchment/60 text-sm font-space">
                                {providerName
                                    ? `Drop your ${providerName} export file here or `
                                    : 'Drop your file here or '}
                                <span className="text-[#D4AF37] underline">browse</span>
                            </p>
                            <p className="text-parchment/25 text-xs font-space mt-1">
                                {providerName
                                    ? `We'll auto-detect columns and import instantly.`
                                    : <>Supports <span className="text-[#D4AF37]/80">.csv</span>, <span className="text-[#D4AF37]/80">.xlsx</span>, <span className="text-[#D4AF37]/80">.xls</span>, <span className="text-[#D4AF37]/80">.tsv</span>, and <span className="text-[#D4AF37]/80">.ods</span> formats.</>}
                            </p>
                        </div>
                        {!providerName && (
                            <div className="flex items-center justify-center gap-4 text-parchment/30 text-xs font-space">
                                <span>Google Sheets → File → Download</span>
                                <span>•</span>
                                <span>Excel → Save As</span>
                            </div>
                        )}
                    </>
                )}
            </Card>

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
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-parchment/50 text-xs font-space hover:border-[#D4AF37]/30 hover:text-[#D4AF37] hover:bg-[#D4AF37]/5 transition-all no-underline"
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
