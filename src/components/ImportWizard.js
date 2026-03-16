"use client";

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, FileSpreadsheet, ArrowRight, ArrowLeft, Check, X,
    AlertCircle, CheckCircle2, Loader2, Sparkles, ChevronDown,
    Table2, Zap, RotateCcw
} from 'lucide-react';
import {
    parseSpreadsheetFile, smartMapColumns, transformRows,
    getFieldsForAssetClass, FIELD_LABELS
} from '@/lib/spreadsheetParser';

const ASSET_CLASSES = [
    { value: 'Equity', label: 'Equity / Stocks', icon: '📈', desc: 'Shares, ETFs, mutual funds' },
    { value: 'Crypto', label: 'Crypto', icon: '₿', desc: 'Bitcoin, Ethereum, altcoins' },
    { value: 'Fixed Income', label: 'Fixed Income', icon: '🏦', desc: 'Bonds, savings, CDs' },
    { value: 'Pension', label: 'Pensions', icon: '🏛️', desc: 'Retirement funds, 401k, SIPP' },
    { value: 'Real Estate', label: 'Real Estate', icon: '🏠', desc: 'Properties, REITs' },
    { value: 'Debt', label: 'Debt', icon: '💳', desc: 'Loans, mortgages, credit' },
];

const STEPS = [
    { id: 'upload', title: 'Upload File', subtitle: 'Drop your spreadsheet' },
    { id: 'configure', title: 'Configure', subtitle: 'Asset class & defaults' },
    { id: 'map', title: 'Map Columns', subtitle: 'Match your data' },
    { id: 'preview', title: 'Preview', subtitle: 'Review & confirm' },
    { id: 'result', title: 'Complete', subtitle: 'Import summary' },
];

export default function ImportWizard() {
    const [step, setStep] = useState(0);
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState(null);
    const [assetClass, setAssetClass] = useState('');
    const [defaultCurrency, setDefaultCurrency] = useState('GBP');
    const [defaultBroker, setDefaultBroker] = useState('');
    const [columnMapping, setColumnMapping] = useState({});
    const [transformedTxs, setTransformedTxs] = useState([]);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [error, setError] = useState('');
    const [parsing, setParsing] = useState(false);

    const fileInputRef = useRef(null);

    // ─── Step 1: Upload ───
    const handleFile = useCallback(async (f) => {
        if (!f) return;
        const ext = f.name.split('.').pop().toLowerCase();
        if (!['csv', 'xlsx', 'xls', 'tsv', 'ods'].includes(ext)) {
            setError('Unsupported file type. Please upload a CSV, XLSX, XLS, TSV, or ODS file.');
            return;
        }

        setError('');
        setParsing(true);
        setFile(f);

        try {
            const data = await parseSpreadsheetFile(f);
            setParsedData(data);
            setStep(1);
        } catch (err) {
            setError(err.message);
            setFile(null);
        } finally {
            setParsing(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        const f = e.dataTransfer?.files?.[0];
        if (f) handleFile(f);
    }, [handleFile]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    // ─── Step 2: Configure → auto-map columns ───
    const handleConfigure = useCallback(() => {
        if (!assetClass || !parsedData) return;
        const sampleRows = parsedData.rows.slice(0, 20);
        const mapping = smartMapColumns(parsedData.headers, sampleRows, assetClass);
        setColumnMapping(mapping);
        setStep(2);
    }, [assetClass, parsedData]);

    // ─── Step 3: Map → transform & preview ───
    const handleMapConfirm = useCallback(() => {
        const txs = transformRows(parsedData.rows, columnMapping, assetClass, defaultCurrency, defaultBroker);
        setTransformedTxs(txs);
        setStep(3);
    }, [parsedData, columnMapping, assetClass, defaultCurrency, defaultBroker]);

    // ─── Step 4: Import ───
    const handleImport = useCallback(async () => {
        setImporting(true);
        setError('');

        try {
            const res = await fetch('/api/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assetClass,
                    defaultCurrency,
                    defaultBroker: defaultBroker || 'Manual',
                    transactions: transformedTxs,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Import failed');

            setImportResult(data);
            setStep(4);
        } catch (err) {
            setError(err.message);
        } finally {
            setImporting(false);
        }
    }, [assetClass, defaultCurrency, defaultBroker, transformedTxs]);

    // ─── Reset ───
    const handleReset = () => {
        setStep(0);
        setFile(null);
        setParsedData(null);
        setAssetClass('');
        setDefaultBroker('');
        setColumnMapping({});
        setTransformedTxs([]);
        setImportResult(null);
        setError('');
    };

    return (
        <div className="max-w-5xl mx-auto">
            {/* ═══ Header ═══ */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 mb-2"
            >
                <FileSpreadsheet size={20} className="text-[#D4AF37]/60" />
                <h2 className="text-xs uppercase text-parchment/50 tracking-[0.2em] font-space font-medium m-0">
                    Import Spreadsheet
                </h2>
            </motion.div>

            <motion.h1
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="font-bebas text-3xl md:text-4xl tracking-widest text-gradient m-0 mb-6"
            >
                Bring Your Data Home
            </motion.h1>

            {/* ═══ Progress Bar ═══ */}
            <div className="flex items-center gap-2 mb-8">
                {STEPS.map((s, i) => (
                    <React.Fragment key={s.id}>
                        <motion.div
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-space transition-all cursor-default
                                ${i === step
                                    ? 'bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37]'
                                    : i < step
                                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                        : 'bg-white/[0.03] border border-white/5 text-parchment/30'
                                }`}
                            animate={{ scale: i === step ? 1 : 0.95 }}
                        >
                            {i < step ? <Check size={12} /> : <span className="text-[10px] opacity-60">{i + 1}</span>}
                            <span className="hidden md:inline">{s.title}</span>
                        </motion.div>
                        {i < STEPS.length - 1 && (
                            <div className={`w-4 h-px ${i < step ? 'bg-emerald-500/30' : 'bg-white/10'}`} />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* ═══ Error Banner ═══ */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="flex items-center gap-3 px-4 py-3 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-space"
                    >
                        <AlertCircle size={16} className="flex-shrink-0" />
                        <span className="flex-1">{error}</span>
                        <button onClick={() => setError('')} className="p-1 hover:bg-red-500/20 rounded-lg transition-colors">
                            <X size={14} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ Step Content ═══ */}
            <AnimatePresence mode="wait">
                {step === 0 && (
                    <StepUpload
                        key="upload"
                        onFile={handleFile}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        fileInputRef={fileInputRef}
                        parsing={parsing}
                        file={file}
                    />
                )}
                {step === 1 && (
                    <StepConfigure
                        key="configure"
                        parsedData={parsedData}
                        assetClass={assetClass}
                        setAssetClass={setAssetClass}
                        defaultCurrency={defaultCurrency}
                        setDefaultCurrency={setDefaultCurrency}
                        defaultBroker={defaultBroker}
                        setDefaultBroker={setDefaultBroker}
                        onNext={handleConfigure}
                        onBack={() => { setStep(0); setFile(null); setParsedData(null); }}
                        fileName={file?.name}
                    />
                )}
                {step === 2 && (
                    <StepMap
                        key="map"
                        parsedData={parsedData}
                        assetClass={assetClass}
                        columnMapping={columnMapping}
                        setColumnMapping={setColumnMapping}
                        onNext={handleMapConfirm}
                        onBack={() => setStep(1)}
                    />
                )}
                {step === 3 && (
                    <StepPreview
                        key="preview"
                        transformedTxs={transformedTxs}
                        assetClass={assetClass}
                        importing={importing}
                        onImport={handleImport}
                        onBack={() => setStep(2)}
                    />
                )}
                {step === 4 && (
                    <StepResult
                        key="result"
                        result={importResult}
                        assetClass={assetClass}
                        onReset={handleReset}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── STEP 1: Upload ───────────────────────────────────────────────────────────
function StepUpload({ onFile, onDrop, onDragOver, fileInputRef, parsing, file }) {
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
                            Drop Your Spreadsheet
                        </h3>
                        <p className="text-parchment/50 font-space text-sm mb-4 max-w-md mx-auto">
                            Drag & drop a file here, or click to browse.
                            We support <span className="text-[#D4AF37]/80">.csv</span>,{' '}
                            <span className="text-[#D4AF37]/80">.xlsx</span>,{' '}
                            <span className="text-[#D4AF37]/80">.xls</span>,{' '}
                            <span className="text-[#D4AF37]/80">.tsv</span>, and{' '}
                            <span className="text-[#D4AF37]/80">.ods</span> formats.
                        </p>
                        <div className="flex items-center justify-center gap-4 text-parchment/30 text-xs font-space">
                            <span>Google Sheets → File → Download</span>
                            <span>•</span>
                            <span>Excel → Save As</span>
                        </div>
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
        </motion.div>
    );
}

// ─── STEP 2: Configure ───────────────────────────────────────────────────────
function StepConfigure({ parsedData, assetClass, setAssetClass, defaultCurrency, setDefaultCurrency, defaultBroker, setDefaultBroker, onNext, onBack, fileName }) {
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
                        {parsedData?.rows.length} rows · {parsedData?.headers.length} columns
                        {parsedData?.sheetNames.length > 1 && ` · ${parsedData.sheetNames.length} sheets (using first)`}
                    </p>
                </div>
                <Check size={20} className="text-emerald-400 flex-shrink-0" />
            </div>

            {/* Asset Class Selection */}
            <div>
                <h3 className="font-bebas text-xl tracking-widest text-[#D4AF37] mb-1">What type of data is this?</h3>
                <p className="text-parchment/40 text-xs font-space mb-4">Select the asset class that best matches your spreadsheet.</p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {ASSET_CLASSES.map(ac => (
                        <button
                            key={ac.value}
                            onClick={() => setAssetClass(ac.value)}
                            className={`p-4 rounded-xl border text-left transition-all group
                                ${assetClass === ac.value
                                    ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40 ring-1 ring-[#D4AF37]/20'
                                    : 'bg-white/[0.03] border-white/10 hover:border-[#D4AF37]/20 hover:bg-white/[0.05]'
                                }`}
                        >
                            <span className="text-2xl block mb-2">{ac.icon}</span>
                            <span className={`text-sm font-space font-medium block ${assetClass === ac.value ? 'text-[#D4AF37]' : 'text-parchment'}`}>
                                {ac.label}
                            </span>
                            <span className="text-xs text-parchment/30 font-space">{ac.desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Defaults */}
            <div className="glass-card">
                <h3 className="font-bebas text-lg tracking-widest text-[#D4AF37] mb-4">Defaults</h3>
                <p className="text-parchment/40 text-xs font-space mb-4">
                    These will be used when your spreadsheet doesn&apos;t specify a value.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] uppercase tracking-widest text-parchment/30 mb-1.5 font-space block">Default Currency</label>
                        <select
                            value={defaultCurrency}
                            onChange={e => setDefaultCurrency(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-parchment font-space outline-none focus:border-[#D4AF37]/40 transition-colors appearance-none cursor-pointer"
                        >
                            {['GBP', 'BRL', 'USD', 'EUR', 'JPY', 'CHF', 'AUD', 'CAD', 'TRY', 'INR'].map(c => (
                                <option key={c} value={c} className="bg-[#1a1a2e] text-parchment">{c}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] uppercase tracking-widest text-parchment/30 mb-1.5 font-space block">Default Broker</label>
                        <input
                            value={defaultBroker}
                            onChange={e => setDefaultBroker(e.target.value)}
                            placeholder="e.g., Trading 212, XP, Interactive Brokers"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-parchment font-space outline-none focus:border-[#D4AF37]/40 transition-colors placeholder:text-parchment/20"
                        />
                    </div>
                </div>
            </div>

            {/* Nav */}
            <div className="flex justify-between gap-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-parchment/60 text-sm font-space hover:bg-white/10 transition-all"
                >
                    <ArrowLeft size={16} /> Back
                </button>
                <button
                    onClick={onNext}
                    disabled={!assetClass}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl btn-primary text-sm font-space disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    <Sparkles size={16} /> Auto-Map Columns <ArrowRight size={16} />
                </button>
            </div>
        </motion.div>
    );
}

// ─── STEP 3: Column Mapping ──────────────────────────────────────────────────
function StepMap({ parsedData, assetClass, columnMapping, setColumnMapping, onNext, onBack }) {
    const availableFields = ['ignore', ...getFieldsForAssetClass(assetClass)];
    const sampleRows = parsedData.rows.slice(0, 3);

    const updateMapping = (header, newField) => {
        setColumnMapping(prev => ({ ...prev, [header]: newField }));
    };

    // Count how many fields are mapped (excluding 'ignore')
    const mappedCount = Object.values(columnMapping).filter(f => f !== 'ignore').length;
    const hasDate = Object.values(columnMapping).includes('date');
    const hasAmount = Object.values(columnMapping).includes('amount');

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            {/* AI Detection Banner */}
            <div className="glass-card flex items-center gap-3 !py-3">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles size={16} className="text-[#D4AF37]" />
                </div>
                <div className="flex-1">
                    <p className="text-parchment text-sm font-space font-medium m-0">
                        Smart Detection found {mappedCount} matches
                    </p>
                    <p className="text-parchment/40 text-xs font-space m-0">
                        Review the AI suggestions below and adjust if needed.
                    </p>
                </div>
                {hasDate && hasAmount && <Check size={18} className="text-emerald-400" />}
            </div>

            {/* Mapping Table */}
            <div className="glass-card !p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-parchment/40 font-space font-medium">Your Column</th>
                                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-parchment/40 font-space font-medium">Maps To</th>
                                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-parchment/40 font-space font-medium">Sample Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            {parsedData.headers.filter(h => h).map(header => {
                                const currentField = columnMapping[header] || 'ignore';
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
                                                    {availableFields.map(field => (
                                                        <option key={field} value={field} className="bg-[#1a1a2e] text-parchment">
                                                            {FIELD_LABELS[field] || field}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={12} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${isIgnored ? 'text-parchment/20' : 'text-[#D4AF37]/60'}`} />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2 flex-wrap">
                                                {sampleRows.slice(0, 2).map((row, i) => (
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
            </div>

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

            {/* Nav */}
            <div className="flex justify-between gap-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-parchment/60 text-sm font-space hover:bg-white/10 transition-all"
                >
                    <ArrowLeft size={16} /> Back
                </button>
                <button
                    onClick={onNext}
                    disabled={!hasDate || !hasAmount}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl btn-primary text-sm font-space disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    Preview Import <ArrowRight size={16} />
                </button>
            </div>
        </motion.div>
    );
}

// ─── STEP 4: Preview ─────────────────────────────────────────────────────────
function StepPreview({ transformedTxs, assetClass, importing, onImport, onBack }) {
    const [expandedView, setExpandedView] = useState(false);
    const previewTxs = expandedView ? transformedTxs : transformedTxs.slice(0, 10);

    // Summary stats
    const uniqueAssets = new Set(transformedTxs.map(t => t.asset || t.ticker)).size;
    const buys = transformedTxs.filter(t => t.type === 'Buy').length;
    const sells = transformedTxs.filter(t => t.type === 'Sell').length;
    const totalAmount = transformedTxs.reduce((sum, t) => sum + (t.amount || 0), 0);

    const fmtNum = (n) => {
        if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
        return n.toFixed(2);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Transactions', value: transformedTxs.length, icon: Table2 },
                    { label: 'Unique Assets', value: uniqueAssets, icon: Zap },
                    { label: 'Buys / Sells', value: `${buys} / ${sells}`, icon: ArrowRight },
                    { label: 'Total Volume', value: fmtNum(totalAmount), icon: Sparkles },
                ].map(card => (
                    <div key={card.label} className="glass-card !p-4 text-center">
                        <card.icon size={16} className="text-[#D4AF37]/50 mx-auto mb-2" />
                        <div className="text-xl font-bebas tracking-wider text-[#D4AF37]">{card.value}</div>
                        <div className="text-[10px] text-parchment/40 font-space uppercase tracking-widest">{card.label}</div>
                    </div>
                ))}
            </div>

            {/* Transaction Table */}
            <div className="glass-card !p-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                    <h4 className="text-[#D4AF37] font-bebas tracking-widest text-lg m-0">Transaction Preview</h4>
                    {transformedTxs.length > 10 && (
                        <button
                            onClick={() => setExpandedView(!expandedView)}
                            className="text-xs text-parchment/40 font-space hover:text-[#D4AF37] transition-colors"
                        >
                            {expandedView ? `Show less` : `Show all ${transformedTxs.length}`}
                        </button>
                    )}
                </div>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full">
                        <thead className="sticky top-0 bg-[#0d0814]">
                            <tr className="border-b border-white/5">
                                <th className="text-left px-4 py-2 text-[10px] uppercase tracking-widest text-parchment/40 font-space font-medium">Date</th>
                                <th className="text-left px-4 py-2 text-[10px] uppercase tracking-widest text-parchment/40 font-space font-medium">Asset</th>
                                <th className="text-left px-4 py-2 text-[10px] uppercase tracking-widest text-parchment/40 font-space font-medium">Type</th>
                                {['Equity', 'Crypto', 'Pension'].includes(assetClass) && (
                                    <th className="text-right px-4 py-2 text-[10px] uppercase tracking-widest text-parchment/40 font-space font-medium">Qty</th>
                                )}
                                <th className="text-right px-4 py-2 text-[10px] uppercase tracking-widest text-parchment/40 font-space font-medium">Amount</th>
                                <th className="text-left px-4 py-2 text-[10px] uppercase tracking-widest text-parchment/40 font-space font-medium">CCY</th>
                            </tr>
                        </thead>
                        <tbody>
                            {previewTxs.map((tx, i) => (
                                <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                    <td className="px-4 py-2.5 text-xs text-parchment/60 font-space whitespace-nowrap">{tx.date}</td>
                                    <td className="px-4 py-2.5 text-xs text-parchment font-space font-medium truncate max-w-[180px]">{tx.asset || tx.ticker || '—'}</td>
                                    <td className="px-4 py-2.5">
                                        <span className={`text-[10px] font-space font-bold uppercase px-2 py-0.5 rounded-full
                                            ${tx.type === 'Buy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {tx.type}
                                        </span>
                                    </td>
                                    {['Equity', 'Crypto', 'Pension'].includes(assetClass) && (
                                        <td className="px-4 py-2.5 text-xs text-parchment/60 font-space text-right">{tx.quantity?.toFixed(2)}</td>
                                    )}
                                    <td className="px-4 py-2.5 text-xs text-parchment font-space text-right tabular-nums">{tx.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-2.5 text-xs text-parchment/40 font-space">{tx.currency}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Nav */}
            <div className="flex justify-between gap-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-parchment/60 text-sm font-space hover:bg-white/10 transition-all"
                >
                    <ArrowLeft size={16} /> Adjust Mapping
                </button>
                <button
                    onClick={onImport}
                    disabled={importing}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl btn-primary text-sm font-space disabled:opacity-50 transition-all"
                >
                    {importing ? (
                        <>
                            <Loader2 size={16} className="animate-spin" /> Importing...
                        </>
                    ) : (
                        <>
                            <Zap size={16} /> Import {transformedTxs.length} Transactions
                        </>
                    )}
                </button>
            </div>
        </motion.div>
    );
}

// ─── STEP 5: Result ──────────────────────────────────────────────────────────
function StepResult({ result, assetClass, onReset }) {
    if (!result) return null;

    const isSuccess = result.imported > 0;
    const assetPage = assetClass === 'Fixed Income' ? '/assets/fixed-income'
        : assetClass === 'Real Estate' ? '/assets/real-estate'
        : `/assets/${assetClass.toLowerCase()}`;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
        >
            {/* Hero Result */}
            <div className="glass-card text-center py-12 px-8">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                    className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                    style={{ background: isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }}
                >
                    {isSuccess ? (
                        <CheckCircle2 size={40} className="text-emerald-400" />
                    ) : (
                        <AlertCircle size={40} className="text-red-400" />
                    )}
                </motion.div>

                <h2 className="font-bebas text-3xl tracking-widest text-gradient mb-2">
                    {isSuccess ? 'Import Complete!' : 'Import Finished'}
                </h2>

                <div className="grid grid-cols-3 gap-6 max-w-sm mx-auto mt-8">
                    <div>
                        <div className="text-3xl font-bebas tracking-wider text-emerald-400">{result.imported}</div>
                        <div className="text-[10px] text-parchment/40 font-space uppercase tracking-widest">Imported</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bebas tracking-wider text-amber-400">{result.skipped}</div>
                        <div className="text-[10px] text-parchment/40 font-space uppercase tracking-widest">Skipped</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bebas tracking-wider text-[#D4AF37]">{result.assetsCreated}</div>
                        <div className="text-[10px] text-parchment/40 font-space uppercase tracking-widest">New Assets</div>
                    </div>
                </div>
            </div>

            {/* Errors */}
            {result.errors?.length > 0 && (
                <div className="glass-card">
                    <h3 className="font-bebas text-lg tracking-widest text-amber-400 mb-3">
                        {result.errors.length} Issue{result.errors.length > 1 ? 's' : ''} Found
                    </h3>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                        {result.errors.slice(0, 20).map((err, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-parchment/50 font-space">
                                <span className="text-amber-400/60">Row {err.row}:</span>
                                <span>{err.error}</span>
                            </div>
                        ))}
                        {result.errors.length > 20 && (
                            <p className="text-xs text-parchment/30 font-space">...and {result.errors.length - 20} more</p>
                        )}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-center gap-4">
                <button
                    onClick={onReset}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-parchment/60 text-sm font-space hover:bg-white/10 transition-all"
                >
                    <RotateCcw size={16} /> Import Another File
                </button>
                <a
                    href={assetPage}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl btn-primary text-sm font-space no-underline transition-all"
                >
                    View {assetClass} <ArrowRight size={16} />
                </a>
            </div>
        </motion.div>
    );
}
