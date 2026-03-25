import { useState, useCallback, useRef } from 'react';
import {
    parseSpreadsheetFile, smartMapColumns, transformRows,
} from '@/lib/spreadsheetParser';
import { parseWithProvider } from '@/lib/providers/registry';
import type { SheetConfig, ProviderInfo } from './types';

const ASSET_CLASSES = [
    { value: 'Equity', label: 'Equity / Stocks', icon: '📈', desc: 'Shares, ETFs, mutual funds' },
    { value: 'Crypto', label: 'Crypto', icon: '₿', desc: 'Bitcoin, Ethereum, altcoins' },
    { value: 'Fixed Income', label: 'Fixed Income', icon: '🏦', desc: 'Bonds, savings, CDs' },
    { value: 'Pension', label: 'Pensions', icon: '🏛️', desc: 'Retirement funds, 401k, SIPP' },
    { value: 'Real Estate', label: 'Real Estate', icon: '🏠', desc: 'Properties, REITs' },
    { value: 'Debt', label: 'Debt', icon: '💳', desc: 'Loans, mortgages, credit' },
];

const GENERIC_STEPS = [
    { id: 'upload', title: 'Upload File', subtitle: 'Drop your spreadsheet' },
    { id: 'configure', title: 'Configure', subtitle: 'Asset class & defaults' },
    { id: 'map', title: 'Map Columns', subtitle: 'Match your data' },
    { id: 'preview', title: 'Preview', subtitle: 'Review & confirm' },
    { id: 'result', title: 'Complete', subtitle: 'Import summary' },
];

const PROVIDER_STEPS = [
    { id: 'provider', title: 'Provider', subtitle: 'Select your broker' },
    { id: 'upload', title: 'Upload', subtitle: 'Drop your statement' },
    { id: 'preview', title: 'Preview', subtitle: 'Review & confirm' },
    { id: 'result', title: 'Complete', subtitle: 'Import summary' },
];

export { ASSET_CLASSES, GENERIC_STEPS, PROVIDER_STEPS };

export default function useImportWizard() {
    // Import Mode
    const [importMode, setImportMode] = useState<string | null>(null);
    const [selectedProvider, setSelectedProvider] = useState<ProviderInfo | null>(null);
    const [providerConfidence, setProviderConfidence] = useState(0);

    // Shared State
    const [step, setStep] = useState(0);
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any>(null);
    const [sheetsConfig, setSheetsConfig] = useState<SheetConfig[]>([]);
    const [assetClass, setAssetClass] = useState('');
    const [defaultCurrency, setDefaultCurrency] = useState('GBP');
    const [defaultBroker, setDefaultBroker] = useState('');
    const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
    const [transformedTxs, setTransformedTxs] = useState<any[]>([]);
    const [duplicateIndices, setDuplicateIndices] = useState<Set<number>>(new Set());
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<any>(null);
    const [error, setError] = useState('');
    const [parsing, setParsing] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const STEPS = importMode === 'provider' ? PROVIDER_STEPS : GENERIC_STEPS;

    // ── Duplicate detection helper ──────────────────────────────────
    const checkDuplicates = useCallback(async (txs: any[]) => {
        if (txs.length === 0) { setDuplicateIndices(new Set()); return; }
        try {
            const res = await fetch('/api/import/duplicate-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactions: txs.map(t => ({
                        date: t.date,
                        asset: t.asset,
                        ticker: t.ticker,
                        broker: t.broker,
                        amount: t.amount,
                        type: t.type,
                        currency: t.currency,
                        assetClass: t.assetClass,
                    })),
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setDuplicateIndices(new Set<number>(data.duplicateIndices ?? []));
            }
        } catch (err) {
            console.error('Duplicate check failed:', err);
        }
    }, []);

    const removeDuplicates = useCallback(() => {
        setTransformedTxs(prev => prev.filter((_, i) => !duplicateIndices.has(i)));
        setDuplicateIndices(new Set());
    }, [duplicateIndices]);

    // Choose Import Mode
    const handleChooseProvider = () => {
        setImportMode('provider');
        setStep(0);
    };
    const handleChooseGeneric = () => {
        setImportMode('generic');
        setStep(0);
    };

    // Provider Selected
    const handleProviderSelected = (provider: ProviderInfo) => {
        setSelectedProvider(provider);
        setDefaultBroker(provider.name);
        setDefaultCurrency(provider.country === 'BR' ? 'BRL' : 'GBP');
        setStep(1);
    };

    // Upload handler
    const handleFile = useCallback(async (f: File | undefined) => {
        if (!f) return;
        const ext = f.name.split('.').pop()?.toLowerCase() || '';
        if (!['csv', 'xlsx', 'xls', 'tsv', 'ods'].includes(ext)) {
            setError('Unsupported file type. Please upload a CSV, XLSX, XLS, TSV, or ODS file.');
            return;
        }

        setError('');
        setParsing(true);
        setFile(f);

        try {
            const data = await (parseSpreadsheetFile as any)(f);
            setParsedData(data);

            if (importMode === 'provider' && selectedProvider) {
                try {
                    const result = (parseWithProvider as any)(selectedProvider.id, data.headers, data.rows, {
                        defaultCurrency,
                        defaultBroker: selectedProvider.name,
                    });

                    if (result.transactions.length === 0) {
                        setError(`No transactions could be parsed from this file using the ${selectedProvider.name} template. The file format might be different than expected. Try the Generic Spreadsheet import instead.`);
                        setParsing(false);
                        return;
                    }

                    setTransformedTxs(result.transactions);
                    setProviderConfidence(selectedProvider.detect(data.headers, data.rows.slice(0, 10)));
                    if (result.summary?.assetClasses?.length > 0) {
                        setAssetClass(result.summary.assetClasses[0]);
                    }
                    // Check for duplicates before advancing to preview
                    checkDuplicates(result.transactions);
                    setStep(2);
                } catch (parseErr: any) {
                    setError(`Auto-parse failed: ${parseErr.message}. Try the Generic Spreadsheet import instead.`);
                }
            } else {
                const configs: SheetConfig[] = data.sheets.map((sheet: any) => ({
                    sheetName: sheet.sheetName,
                    headers: sheet.headers,
                    rows: sheet.rows,
                    enabled: true,
                    assetClass: '',
                    defaultCurrency: 'GBP',
                    defaultBroker: '',
                    columnMapping: {},
                }));
                setSheetsConfig(configs);
                setStep(1);
            }
        } catch (err: any) {
            setError(err.message);
            setFile(null);
        } finally {
            setParsing(false);
        }
    }, [importMode, selectedProvider, defaultCurrency]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const f = e.dataTransfer?.files?.[0];
        if (f) handleFile(f);
    }, [handleFile]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    // Configure → auto-map columns
    const handleConfigure = useCallback(() => {
        const enabledSheets = sheetsConfig.filter((s: SheetConfig) => s.enabled && s.assetClass);
        if (enabledSheets.length === 0) return;

        const updated = sheetsConfig.map((sc: SheetConfig) => {
            if (!sc.enabled || !sc.assetClass) return sc;
            const sampleRows = sc.rows.slice(0, 20);
            const mapping = (smartMapColumns as any)(sc.headers, sampleRows, sc.assetClass);
            return { ...sc, columnMapping: mapping };
        });
        setSheetsConfig(updated);
        setStep(2);
    }, [sheetsConfig]);

    // Map → transform & preview
    const handleMapConfirm = useCallback(() => {
        let allTxs: any[] = [];
        for (const sc of sheetsConfig) {
            if (!sc.enabled || !sc.assetClass) continue;
            const txs = (transformRows as any)(sc.rows, sc.columnMapping, sc.assetClass, sc.defaultCurrency, sc.defaultBroker);
            allTxs = allTxs.concat(txs);
        }
        setTransformedTxs(allTxs);
        const uniqueClasses = new Set(allTxs.map((t: any) => t.assetClass).filter(Boolean));
        setAssetClass(uniqueClasses.size === 1 ? [...uniqueClasses][0] : '');
        // Check for duplicates before advancing to preview
        checkDuplicates(allTxs);
        setStep(3);
    }, [sheetsConfig, checkDuplicates]);

    // Import
    const handleImport = useCallback(async () => {
        setImporting(true);
        setError('');

        try {
            const res = await fetch('/api/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assetClass: assetClass || undefined,
                    defaultCurrency,
                    defaultBroker: defaultBroker || selectedProvider?.name || 'Manual',
                    transactions: transformedTxs,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Import failed');

            setImportResult(data);
            setStep(importMode === 'provider' ? 3 : 4);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setImporting(false);
        }
    }, [assetClass, defaultCurrency, defaultBroker, transformedTxs, importMode, selectedProvider]);

    // Reset
    const handleReset = () => {
        setImportMode(null);
        setSelectedProvider(null);
        setProviderConfidence(0);
        setStep(0);
        setFile(null);
        setParsedData(null);
        setSheetsConfig([]);
        setDuplicateIndices(new Set());
        setAssetClass('');
        setDefaultBroker('');
        setColumnMapping({});
        setTransformedTxs([]);
        setImportResult(null);
        setError('');
    };

    // Switch to generic
    const handleSwitchToGeneric = () => {
        setImportMode('generic');
        setSelectedProvider(null);
        setStep(0);
        setTransformedTxs([]);
        setSheetsConfig([]);
    };

    return {
        // State
        importMode, setImportMode,
        selectedProvider, setSelectedProvider,
        providerConfidence,
        step, setStep,
        file, setFile,
        parsedData, setParsedData,
        sheetsConfig, setSheetsConfig,
        assetClass, setAssetClass,
        defaultCurrency, setDefaultCurrency,
        defaultBroker, setDefaultBroker,
        columnMapping, setColumnMapping,
        transformedTxs, setTransformedTxs,
        duplicateIndices, removeDuplicates,
        importing,
        importResult,
        error, setError,
        parsing,
        fileInputRef,
        STEPS,

        // Handlers
        handleChooseProvider, handleChooseGeneric,
        handleProviderSelected,
        handleFile, handleDrop, handleDragOver,
        handleConfigure,
        handleMapConfirm,
        handleImport,
        handleReset,
        handleSwitchToGeneric,
    };
}
