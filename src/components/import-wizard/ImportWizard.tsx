"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSpreadsheet, Check, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getAllProviders } from '@/lib/providers/registry';
import _ProviderPicker from '../ProviderPicker';
const ProviderPicker = _ProviderPicker as any;
import useImportWizard from './useImportWizard';
import WizardLanding from './WizardLanding';
import StepUpload from './StepUpload';
import StepConfigure from './StepConfigure';
import StepMap from './StepMap';
import StepPreview from './StepPreview';
import StepResult from './StepResult';

export default function ImportWizard() {
    const h = useImportWizard();
    const {
        importMode,
        selectedProvider,
        providerConfidence,
        step, setStep,
        file, setFile,
        sheetsConfig,
        assetClass,
        transformedTxs, setTransformedTxs,
        duplicateIndices, removeDuplicates,
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
        setSheetsConfig,
        setParsedData,
    } = h;

    // Step 0: Choose Import Method (landing page)
    if (importMode === null) {
        return <WizardLanding onChooseProvider={handleChooseProvider} onChooseGeneric={handleChooseGeneric} />;
    }

    const isProviderMode = importMode === 'provider';

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
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
                Update Your Positions
            </motion.h1>

            {/* Progress Bar */}
            <div className="flex items-center gap-2 mb-8">
                {STEPS.map((s: any, i: number) => (
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
                            {i < step ? <Check size={12} /> : <span className="text-xs opacity-60">{i + 1}</span>}
                            <span className="hidden md:inline">{s.title}</span>
                        </motion.div>
                        {i < STEPS.length - 1 && (
                            <div className={`w-4 h-px ${i < step ? 'bg-emerald-500/30' : 'bg-white/10'}`} />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Error Banner */}
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

            {/* Step Content */}
            <AnimatePresence mode="wait">
                {/* Provider Mode */}
                {isProviderMode && step === 0 && (
                    <ProviderPicker
                        key="provider-picker"
                        providers={getAllProviders()}
                        onSelect={handleProviderSelected}
                        onBack={handleSwitchToGeneric}
                    />
                )}
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
                {isProviderMode && step === 2 && (
                    <div key="provider-preview">
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
                                className="text-xs text-emerald-400/50 hover:text-emerald-400 transition-colors bg-transparent border-none cursor-pointer underline"
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
                            duplicateIndices={duplicateIndices}
                            onRemoveDuplicates={removeDuplicates}
                        />
                    </div>
                )}
                {isProviderMode && step === 3 && (
                    <StepResult key="provider-result" result={importResult} assetClass={assetClass} onReset={handleReset} />
                )}

                {/* Generic Mode */}
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
                        showAssetClassColumn={sheetsConfig.filter((s: any) => s.enabled).length > 1 || sheetsConfig.some((s: any) => s.assetClass === 'Mixed')}
                        duplicateIndices={duplicateIndices}
                        onRemoveDuplicates={removeDuplicates}
                    />
                )}
                {!isProviderMode && step === 4 && (
                    <StepResult key="result" result={importResult} assetClass={assetClass} onReset={handleReset} />
                )}
            </AnimatePresence>
        </div>
    );
}
