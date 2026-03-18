"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, FileSpreadsheet, ArrowRight, ArrowLeft, Check, X,
    AlertCircle, CheckCircle2, Loader2, Sparkles, ChevronDown,
    Table2, Zap, RotateCcw, Building2, FileText
} from 'lucide-react';
import { getFieldsForAssetClass, FIELD_LABELS } from '@/lib/spreadsheetParser';
import { getAllProviders } from '@/lib/providers/registry';
import ProviderPicker from '../ProviderPicker';
import useImportWizard, { ASSET_CLASSES, GENERIC_STEPS, PROVIDER_STEPS } from './useImportWizard';

export default function ImportWizard() {
    const h = useImportWizard();
    const {
        importMode, setImportMode,
        selectedProvider, setSelectedProvider,
        providerConfidence,
        step, setStep,
        file, setFile,
        parsedData,
        sheetsConfig, setSheetsConfig,
        assetClass, setAssetClass,
        defaultCurrency, setDefaultCurrency,
        defaultBroker, setDefaultBroker,
        columnMapping, setColumnMapping,
        transformedTxs, setTransformedTxs,
        importing,
        importResult,
        error, setError,
        parsing,
        fileInputRef,
        STEPS,
        handleChooseProvider, handleChooseGeneric,
        handleProviderSelected,
        handleFile, handleDrop, handleDragOver,
        handleConfigure,
        handleMapConfirm,
        handleImport,
        handleReset,
        handleSwitchToGeneric,
    } = h;

    // ─── RENDER ───


    // Step 0: Choose Import Method (landing page)
    if (importMode === null) {
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
                    Bring Your Data Home
                </motion.h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleChooseProvider}
                        className="group glass-card text-left cursor-pointer border-white/10 hover:border-[#D4AF37]/40 transition-all"
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
                                <span key={name} className="px-2 py-0.5 rounded text-[9px] font-space bg-white/[0.05] text-parchment/30">
                                    {name}
                                </span>
                            ))}
                        </div>
                    </motion.button>

                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleChooseGeneric}
                        className="group glass-card text-left cursor-pointer border-white/10 hover:border-[#D4AF37]/40 transition-all"
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
                                <span key={fmt} className="px-2 py-0.5 rounded text-[9px] font-space bg-white/[0.05] text-parchment/30">
                                    {fmt}
                                </span>
                            ))}
                        </div>
                    </motion.button>
                </div>
            </div>
        );
    }

    // Determine which step components to show based on mode
    const isProviderMode = importMode === 'provider';
    const previewStep = isProviderMode ? 2 : 3;
    const resultStep = isProviderMode ? 3 : 4;

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
                    {isProviderMode ? `Import from ${selectedProvider?.name || 'Provider'}` : 'Import Spreadsheet'}
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
                {/* Provider Mode: Step 0 = ProviderPicker */}
                {isProviderMode && step === 0 && (
                    <ProviderPicker
                        key="provider-picker"
                        providers={getAllProviders()}
                        onSelect={handleProviderSelected}
                        onBack={handleSwitchToGeneric}
                    />
                )}

                {/* Provider Mode: Step 1 = Upload */}
                {isProviderMode && step === 1 && (
                    <StepUpload
                        key="provider-upload"
                        onFile={handleFile}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        fileInputRef={fileInputRef}
                        parsing={parsing}
                        file={file}
                        providerName={selectedProvider?.name}
                    />
                )}

                {/* Provider Mode: Step 2 = Preview (with provider confidence badge) */}
                {isProviderMode && step === 2 && (
                    <div key="provider-preview">
                        {/* Provider Detection Badge */}
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-3 px-4 py-3 mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-space"
                        >
                            <CheckCircle2 size={16} className="flex-shrink-0" />
                            <span className="flex-1">
                                ✅ Detected <strong>{transformedTxs.length}</strong> transactions from <strong>{selectedProvider?.name}</strong>
                                {providerConfidence >= 0.8 && ` (${Math.round(providerConfidence * 100)}% confidence)`}
                            </span>
                            <button
                                onClick={handleSwitchToGeneric}
                                className="text-[10px] text-emerald-400/50 hover:text-emerald-400 transition-colors bg-transparent border-none cursor-pointer underline"
                            >
                                Switch to manual mapping
                            </button>
                        </motion.div>
                        <StepPreview
                            transformedTxs={transformedTxs}
                            assetClass={assetClass}
                            importing={importing}
                            onImport={handleImport}
                            onBack={() => { setStep(1); setFile(null); setParsedData(null); setTransformedTxs([]); }}
                            showAssetClassColumn={true}
                        />
                    </div>
                )}

                {/* Provider Mode: Step 3 = Result */}
                {isProviderMode && step === 3 && (
                    <StepResult
                        key="provider-result"
                        result={importResult}
                        assetClass={assetClass}
                        onReset={handleReset}
                    />
                )}

                {/* Generic Mode: Step 0 = Upload */}
                {!isProviderMode && step === 0 && (
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
                {!isProviderMode && step === 1 && (
                    <StepConfigure
                        key="configure"
                        sheetsConfig={sheetsConfig}
                        setSheetsConfig={setSheetsConfig}
                        onNext={handleConfigure}
                        onBack={() => { setStep(0); setFile(null); setParsedData(null); setSheetsConfig([]); }}
                        fileName={file?.name}
                    />
                )}
                {!isProviderMode && step === 2 && (
                    <StepMap
                        key="map"
                        sheetsConfig={sheetsConfig}
                        setSheetsConfig={setSheetsConfig}
                        onNext={handleMapConfirm}
                        onBack={() => setStep(1)}
                    />
                )}
                {!isProviderMode && step === 3 && (
                    <StepPreview
                        key="preview"
                        transformedTxs={transformedTxs}
                        assetClass={assetClass}
                        importing={importing}
                        onImport={handleImport}
                        onBack={() => setStep(2)}
                        showAssetClassColumn={sheetsConfig.filter(s => s.enabled).length > 1 || sheetsConfig.some(s => s.assetClass === 'Mixed')}
                    />
                )}
                {!isProviderMode && step === 4 && (
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
function StepUpload({ onFile, onDrop, onDragOver, fileInputRef, parsing, file, providerName }) {
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
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-parchment/50 text-[11px] font-space hover:border-[#D4AF37]/30 hover:text-[#D4AF37] hover:bg-[#D4AF37]/5 transition-all no-underline"
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

// ─── STEP 2: Configure (Multi-Sheet Aware) ──────────────────────────────────
function StepConfigure({ sheetsConfig, setSheetsConfig, onNext, onBack, fileName }) {
    const isMultiSheet = sheetsConfig.length > 1;
    const totalRows = sheetsConfig.reduce((sum, s) => sum + s.rows.length, 0);
    const enabledSheets = sheetsConfig.filter(s => s.enabled);
    const canProceed = enabledSheets.length > 0 && enabledSheets.every(s => s.assetClass);

    const ALL_ASSET_CLASSES = [
        ...ASSET_CLASSES,
        { value: 'Mixed', label: 'Mixed (Map per Row)', icon: '🔀', desc: 'File has an asset-class column' },
    ];

    const updateSheet = (idx, updates) => {
        setSheetsConfig(prev => prev.map((s, i) => i === idx ? { ...s, ...updates } : s));
    };

    // For single-sheet files, render a simplified version close to the original
    const renderSheetConfig = (sc, idx) => (
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
                                <label className="text-[10px] uppercase tracking-widest text-parchment/30 mb-1 font-space block">Currency</label>
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
                                <label className="text-[10px] uppercase tracking-widest text-parchment/30 mb-1 font-space block">Broker</label>
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
            {sheetsConfig.map((sc, idx) => renderSheetConfig(sc, idx))}

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

// ─── STEP 3: Column Mapping (Multi-Sheet with Tabs) ──────────────────────────
function StepMap({ sheetsConfig, setSheetsConfig, onNext, onBack }) {
    const enabledSheets = sheetsConfig.filter(s => s.enabled && s.assetClass);
    const [activeTab, setActiveTab] = useState(0);
    const isMultiSheet = enabledSheets.length > 1;

    // Resolve the actual index in sheetsConfig for the active enabled sheet
    const enabledIndices = sheetsConfig.map((s, i) => (s.enabled && s.assetClass) ? i : -1).filter(i => i >= 0);
    const activeSheetIdx = enabledIndices[activeTab] ?? enabledIndices[0];
    const sc = sheetsConfig[activeSheetIdx];

    if (!sc) return null;

    const availableFields = ['ignore', ...getFieldsForAssetClass(sc.assetClass)];
    const sampleRows = sc.rows.slice(0, 3);
    const mapping = sc.columnMapping || {};

    const updateMapping = (header, newField) => {
        setSheetsConfig(prev => prev.map((s, i) =>
            i === activeSheetIdx
                ? { ...s, columnMapping: { ...s.columnMapping, [header]: newField } }
                : s
        ));
    };

    const mappedCount = Object.values(mapping).filter(f => f !== 'ignore').length;
    const hasDate = Object.values(mapping).includes('date');
    const hasAmount = Object.values(mapping).includes('amount');

    // Check all enabled sheets have minimum mapping
    const allSheetsReady = enabledSheets.every(s => {
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
                    {enabledSheets.map((s, i) => {
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
            <div className="glass-card flex items-center gap-3 !py-3">
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
                            {sc.headers.filter(h => h).map(header => {
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

// ─── STEP 4: Preview ─────────────────────────────────────────────────────────
function StepPreview({ transformedTxs, assetClass, importing, onImport, onBack, showAssetClassColumn = false }) {
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
                                {showAssetClassColumn && (
                                    <th className="text-left px-4 py-2 text-[10px] uppercase tracking-widest text-parchment/40 font-space font-medium">Class</th>
                                )}
                                {['Equity', 'Crypto', 'Pension'].includes(assetClass) && !showAssetClassColumn && (
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
                                    {showAssetClassColumn && (
                                        <td className="px-4 py-2.5 text-[10px] text-parchment/50 font-space">{tx.assetClass || assetClass}</td>
                                    )}
                                    {['Equity', 'Crypto', 'Pension'].includes(assetClass) && !showAssetClassColumn && (
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
