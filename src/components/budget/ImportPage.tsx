'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Trash2, CheckCircle2, AlertTriangle, Loader2, Bookmark, EyeOff, Copy } from 'lucide-react';
import useBudgetStore from '@/stores/useBudgetStore';
import { detectAndParse, getAdapter, BANK_ADAPTERS, type StagedTransaction, type DetectedFormat, type BankAdapter } from '@/lib/csvAdapters';
import { findCategoryMatch, suggestRuleKey } from '@/lib/autoCategorize';
import { formatCents } from '@/lib/budgetUtils';
import BudgetToast from '@/components/budget/BudgetToast';

export default function ImportPage() {
    const { categories, fetchCategories, categoryRules, hydrateRules, saveRule, ignoreRules, saveIgnoreRule } = useBudgetStore();

    const [detectedAdapter, setDetectedAdapter] = useState<BankAdapter | null>(null);
    const [stagedRows, setStagedRows] = useState<StagedTransaction[]>([]);
    const [fileLoaded, setFileLoaded] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveResult, setSaveResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [learnPrompt, setLearnPrompt] = useState<{ rowId: string; ruleKey: string; categoryId: number; categoryName: string } | null>(null);
    const [ignorePrompt, setIgnorePrompt] = useState<{ rowId: string; ruleKey: string } | null>(null);
    const [duplicateIds, setDuplicateIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchCategories();
        hydrateRules();
    }, [fetchCategories, hydrateRules]);

    // ─── Computed ────────────────────────────────────────────
    const allCategorized = useMemo(
        () => stagedRows.length > 0 && stagedRows.every(r => r.category_id !== null),
        [stagedRows]
    );

    const incomeTotal = useMemo(
        () => stagedRows.filter(r => r.is_income).reduce((s, r) => s + r.amount_cents, 0),
        [stagedRows]
    );
    const expenseTotal = useMemo(
        () => stagedRows.filter(r => !r.is_income).reduce((s, r) => s + r.amount_cents, 0),
        [stagedRows]
    );

    const expenseCategories = useMemo(() => categories.filter(c => c.is_income === 0), [categories]);
    const incomeCategories = useMemo(() => categories.filter(c => c.is_income === 1), [categories]);

    const handleFile = useCallback(async (file: File) => {
        const text = await file.text();

        // Auto-detect bank format from first line via adapter registry
        const { format, adapter, transactions: parsed } = detectAndParse(text);
        setDetectedAdapter(adapter ?? null);

        if (format === 'unknown' || !adapter) {
            const bankList = BANK_ADAPTERS.map(a => a.label).join(', ');
            setSaveResult({ success: false, error: `Unrecognized bank format. Supported: ${bankList}.` });
            return;
        }

        // Auto-categorize each row using the two-tier engine
        const autoCategorized = parsed.map(row => {
            const matchId = findCategoryMatch(row.description, categoryRules, categories);
            return matchId !== null ? { ...row, category_id: matchId } : row;
        });

        // Auto-filter ignored rows
        const filtered = autoCategorized.filter(row => {
            const upper = row.description.toUpperCase();
            return !ignoreRules.some(rule => upper.includes(rule.toUpperCase()));
        });

        // ─── Duplicate detection ────────────────────────────
        // Gather unique months from staged rows
        const months = [...new Set(filtered.map(r => r.date.slice(0, 7)))];

        // Fetch existing transactions for those months
        let existingFingerprints = new Set<string>();
        try {
            const fetches = months.map(m =>
                fetch(`/api/budget/transactions?month=${m}`).then(r => r.ok ? r.json() : [])
            );
            const results = await Promise.all(fetches);
            const existing = results.flat() as { date: string; amount_cents: number; description: string | null }[];
            existingFingerprints = new Set(
                existing.map(t => `${t.date}|${t.amount_cents}|${(t.description ?? '').toUpperCase().trim()}`)
            );
        } catch (err) {
            console.error('Duplicate check fetch error:', err);
        }

        // Mark duplicates
        const dupes = new Set<string>();
        for (const row of filtered) {
            const fp = `${row.date}|${row.amount_cents}|${row.description.toUpperCase().trim()}`;
            if (existingFingerprints.has(fp)) {
                dupes.add(row.id);
            }
        }
        setDuplicateIds(dupes);

        setStagedRows(filtered);
        setFileLoaded(true);
        setSaveResult(null);
        setLearnPrompt(null);
        setIgnorePrompt(null);
    }, [categoryRules, categories, ignoreRules]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.name.endsWith('.csv')) handleFile(file);
    }, [handleFile]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const handleCategoryChange = (id: string, categoryId: number) => {
        const row = stagedRows.find(r => r.id === id);
        const ruleKey = row ? suggestRuleKey(row.description) : null;

        // Apply to this row + all other uncategorized rows with the same description prefix
        setStagedRows(prev => prev.map(r => {
            if (r.id === id) return { ...r, category_id: categoryId };
            // Batch-apply to matching uncategorized rows
            if (ruleKey && r.category_id === null && suggestRuleKey(r.description) === ruleKey) {
                return { ...r, category_id: categoryId };
            }
            return r;
        }));

        // Show "Always categorize?" prompt for any manual category change
        if (row) {
            const cat = categories.find(c => c.id === categoryId);
            if (ruleKey && cat) {
                setLearnPrompt({ rowId: id, ruleKey, categoryId, categoryName: cat.name });
            }
        }
    };

    const handleAcceptRule = () => {
        if (!learnPrompt) return;
        saveRule(learnPrompt.ruleKey, learnPrompt.categoryId);
        // Auto-apply the new rule to other uncategorized rows with matching description
        setStagedRows(prev => prev.map(r => {
            if (r.category_id === null && r.description.toUpperCase().includes(learnPrompt.ruleKey)) {
                return { ...r, category_id: learnPrompt.categoryId };
            }
            return r;
        }));
        setLearnPrompt(null);
    };

    const handleRemoveAndIgnore = (id: string) => {
        const row = stagedRows.find(r => r.id === id);
        if (!row) return;
        const ruleKey = suggestRuleKey(row.description);
        if (ruleKey) {
            setIgnorePrompt({ rowId: id, ruleKey });
        } else {
            handleRemoveRow(id);
        }
    };

    const handleAcceptIgnore = () => {
        if (!ignorePrompt) return;
        saveIgnoreRule(ignorePrompt.ruleKey);
        // Remove the original row + all other rows matching the rule
        setStagedRows(prev => prev.filter(r =>
            !r.description.toUpperCase().includes(ignorePrompt.ruleKey.toUpperCase())
        ));
        setIgnorePrompt(null);
    };

    const handleSkipIgnore = () => {
        if (!ignorePrompt) return;
        // Just remove the single row that triggered the prompt
        handleRemoveRow(ignorePrompt.rowId);
        setIgnorePrompt(null);
    };

    const handleRemoveRow = (id: string) => {
        setStagedRows(prev => prev.filter(r => r.id !== id));
    };

    const handleSave = async () => {
        if (!allCategorized || saving) return;
        setSaving(true);
        setSaveResult(null);

        try {
            const payload = stagedRows.map(r => ({
                category_id: r.category_id!,
                amount_cents: r.amount_cents,
                currency: r.currency,
                description: r.description || null,
                date: r.date,
                is_recurring: false,
                source: r.source || null,
            }));

            const res = await fetch('/api/budget/transactions/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactions: payload }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to save');
            }

            const data = await res.json();
            setSaveResult({ success: true, count: data.count });
            setStagedRows([]);
            setFileLoaded(false);
        } catch (err) {
            setSaveResult({ success: false, error: (err as Error).message });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setStagedRows([]);
        setFileLoaded(false);
        setSaveResult(null);
    };

    // ─── Render ─────────────────────────────────────────────
    return (
        <div className="max-w-4xl mx-auto px-4 py-6 pb-28">
            <h1 className="text-2xl font-bebas tracking-wide text-[#D4AF37] drop-shadow-[0_0_10px_rgba(212,175,55,0.3)] mb-6">
                Import Statement
            </h1>

            {/* ─── Format selector + Dropzone ──────────────────── */}
            {!fileLoaded && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-4"
                >
                    {/* Dropzone */}
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={handleDrop}
                        className={`
                            rounded-2xl bg-[#121418]/60 backdrop-blur-xl border-2 border-dashed
                            p-12 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer
                            ${dragActive
                                ? 'border-[#34D399]/50 bg-[#34D399]/5'
                                : 'border-white/[0.08] hover:border-[#D4AF37]/30'
                            }
                        `}
                        onClick={() => document.getElementById('csv-file-input')?.click()}
                    >
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
                            dragActive ? 'bg-[#34D399]/10' : 'bg-[#D4AF37]/10'
                        }`}>
                            <Upload size={28} className={dragActive ? 'text-[#34D399]' : 'text-[#D4AF37]'} />
                        </div>
                        <div className="text-center">
                            <p className="text-[#F5F5DC]/60 text-sm font-space">
                                Drop your CSV file here or <span className="text-[#D4AF37] underline">browse</span>
                            </p>
                            <p className="text-[#F5F5DC]/25 text-xs font-space mt-1">
                                Supports HSBC, Amex, Barclays, Lloyds, Monzo, Santander &amp; Nubank (auto-detected)
                            </p>
                        </div>
                        <input
                            id="csv-file-input"
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={handleInputChange}
                        />
                    </div>
                </motion.div>
            )}

            {/* ─── Success result ──────────────────────────────── */}
            <AnimatePresence>
                {saveResult?.success && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="mt-6 rounded-2xl bg-[#0a1a14]/80 backdrop-blur-2xl border border-[#34D399]/20 border-t-[#34D399]/30 shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-8 text-center"
                    >
                        <CheckCircle2 size={40} className="text-[#34D399] mx-auto mb-3" />
                        <p className="text-[#34D399] text-lg font-space font-semibold">
                            {saveResult.count} transactions imported!
                        </p>
                        <p className="text-[#F5F5DC]/30 text-sm font-space mt-1">
                            Monthly rollups have been updated automatically.
                        </p>
                        <button
                            onClick={handleReset}
                            className="mt-4 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[#F5F5DC]/50 text-sm font-space hover:bg-white/[0.08] transition-colors"
                        >
                            Import another file
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Error result ────────────────────────────────── */}
            <AnimatePresence>
                {saveResult && !saveResult.success && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 mb-4 flex items-center gap-3"
                    >
                        <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
                        <p className="text-red-400 text-sm font-space">{saveResult.error}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Staging Table ───────────────────────────────── */}
            {fileLoaded && stagedRows.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-4"
                >
                    {/* Import Summary */}
                    <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] p-4 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <FileText size={16} className="text-[#D4AF37]" />
                            <span className="text-sm font-space text-[#F5F5DC]/60">
                                <strong className="text-[#F5F5DC]/80">{stagedRows.length}</strong> transactions staged
                            </span>
                        </div>

                        {/* Detected format badge */}
                        {detectedAdapter && (
                            <span className="px-2.5 py-1 rounded-lg bg-[#34D399]/10 border border-[#34D399]/20 text-[#34D399] text-[0.65rem] font-space font-medium uppercase tracking-wider">
                                Detected: {detectedAdapter.label}
                            </span>
                        )}
                        <div className="flex items-center gap-3 ml-auto text-[0.8rem] font-mono tabular-nums">
                            <span className="text-[#34D399]">
                                ↑ {formatCents(incomeTotal, detectedAdapter?.currency ?? 'GBP')}
                            </span>
                            <span className="text-[#F5F5DC]/40">
                                ↓ {formatCents(expenseTotal, detectedAdapter?.currency ?? 'GBP')}
                            </span>
                        </div>
                        <button
                            onClick={handleReset}
                            className="text-xs text-[#F5F5DC]/25 hover:text-red-400 font-space uppercase tracking-wider transition-colors"
                        >
                            Clear all
                        </button>
                    </div>

                    {/* Duplicate warning */}
                    {duplicateIds.size > 0 && (
                        <div className="rounded-xl bg-[#1a1520]/80 backdrop-blur-2xl border border-red-400/20 border-t-red-400/30 shadow-[0_4px_16px_rgba(0,0,0,0.25)] px-4 py-3 flex items-center gap-3">
                            <Copy size={16} className="text-red-400 flex-shrink-0" />
                            <span className="text-sm font-space text-[#F5F5DC]/60 flex-1">
                                <strong className="text-red-400">{duplicateIds.size}</strong> potential duplicate{duplicateIds.size !== 1 ? 's' : ''} found — {duplicateIds.size === 1 ? 'this transaction appears' : 'these transactions appear'} to already exist in your ledger.
                            </span>
                            <button
                                onClick={() => {
                                    setStagedRows(prev => prev.filter(r => !duplicateIds.has(r.id)));
                                    setDuplicateIds(new Set());
                                }}
                                className="px-3 py-1.5 rounded-lg bg-red-400/15 border border-red-400/30 text-red-400 text-xs font-space font-medium hover:bg-red-400/25 transition-colors whitespace-nowrap"
                            >
                                Remove Duplicates
                            </button>
                        </div>
                    )}

                    {/* Category assignment warning */}
                    {!allCategorized && (
                        <div className="rounded-xl bg-[#1a1520]/80 backdrop-blur-2xl border border-[#D4AF37]/20 border-t-[#D4AF37]/30 shadow-[0_4px_16px_rgba(0,0,0,0.25)] px-4 py-3 flex items-center gap-3">
                            <AlertTriangle size={16} className="text-[#D4AF37] flex-shrink-0" />
                            <p className="text-[#D4AF37] text-xs font-space">
                                Assign a category to every transaction before saving.
                            </p>
                        </div>
                    )}

                    {/* Transaction rows */}
                    <div className="flex flex-col gap-1.5">
                        {stagedRows.map((row, i) => (
                            <React.Fragment key={row.id}>
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: Math.min(i * 0.02, 0.5) }}
                                className={`
                                    rounded-xl border px-4 py-3 flex items-center gap-3 transition-all
                                    backdrop-blur-2xl shadow-[0_4px_16px_rgba(0,0,0,0.25)]
                                    ${duplicateIds.has(row.id)
                                        ? 'bg-red-900/20 border-red-400/20 border-t-red-400/30'
                                        : row.category_id === null
                                            ? 'bg-[#1a1520]/80 border-[#D4AF37]/15 border-t-[#D4AF37]/25'
                                            : 'bg-[#121418]/80 border-white/[0.08] border-t-white/[0.12]'
                                    }
                                `}
                            >
                                {/* Duplicate badge */}
                                {duplicateIds.has(row.id) && (
                                    <span className="text-[0.55rem] uppercase tracking-[1.5px] font-space font-bold px-1.5 py-0.5 rounded-md bg-red-400/15 border border-red-400/30 text-red-400 flex-shrink-0">
                                        Dupe
                                    </span>
                                )}
                                {/* Date */}
                                <span className="text-[0.7rem] font-mono tabular-nums text-[#F5F5DC]/30 w-20 flex-shrink-0">
                                    {row.date}
                                </span>

                                {/* Description */}
                                <span className="text-sm font-space text-[#F5F5DC]/70 truncate min-w-0 flex-1">
                                    {row.description}
                                </span>

                                {/* Amount */}
                                <span className={`text-sm font-mono tabular-nums flex-shrink-0 ${
                                    row.is_income ? 'text-[#34D399]' : 'text-[#F5F5DC]/60'
                                }`}>
                                    {row.is_income ? '+' : '-'}{formatCents(row.amount_cents, row.currency)}
                                </span>

                                {/* Type badge */}
                                <span className={`text-[0.6rem] uppercase tracking-[1.5px] font-space px-1.5 py-0.5 rounded-md border flex-shrink-0
                                    ${row.is_income
                                        ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10'
                                        : 'text-[#F5F5DC]/30 border-white/[0.06] bg-white/[0.02]'
                                    }`}
                                >
                                    {row.is_income ? 'Income' : 'Expense'}
                                </span>

                                {/* Category selector */}
                                <select
                                    value={row.category_id ?? ''}
                                    onChange={(e) => handleCategoryChange(row.id, Number(e.target.value))}
                                    className={`
                                        text-xs font-space px-2 py-1.5 rounded-lg border appearance-none
                                        bg-[#121418] transition-colors w-32 flex-shrink-0 cursor-pointer
                                        ${row.category_id === null
                                            ? 'border-[#D4AF37]/30 text-[#D4AF37]'
                                            : 'border-white/[0.08] text-[#F5F5DC]/60'
                                        }
                                    `}
                                >
                                    <option value="" disabled>Category…</option>
                                    {row.is_income ? (
                                        incomeCategories.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.icon} {c.name}
                                            </option>
                                        ))
                                    ) : (
                                        expenseCategories.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.icon} {c.name}
                                            </option>
                                        ))
                                    )}
                                </select>

                                {/* Delete / Always Ignore */}
                                <div className="flex items-center gap-0.5 flex-shrink-0">
                                    <button
                                        onClick={() => handleRemoveRow(row.id)}
                                        title="Remove this row"
                                        className="p-1 rounded-lg hover:bg-red-500/10 transition-colors"
                                    >
                                        <Trash2 size={14} className="text-[#F5F5DC]/20 hover:text-red-400" />
                                    </button>
                                    <button
                                        onClick={() => handleRemoveAndIgnore(row.id)}
                                        title="Always ignore this type"
                                        className="p-1 rounded-lg hover:bg-orange-500/10 transition-colors"
                                    >
                                        <EyeOff size={14} className="text-[#F5F5DC]/20 hover:text-orange-400" />
                                    </button>
                                </div>
                            </motion.div>

                            {/* Learning prompt — shown inline below the row that triggered it */}
                            {learnPrompt?.rowId === row.id && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="rounded-xl bg-[#1a1520]/80 backdrop-blur-2xl border border-[#34D399]/20 border-t-[#34D399]/30 shadow-[0_4px_16px_rgba(0,0,0,0.25)] px-4 py-3 flex items-center gap-3"
                                >
                                    <Bookmark size={14} className="text-[#34D399] flex-shrink-0" />
                                    <span className="text-xs font-space text-[#F5F5DC]/60 flex-1">
                                        Always categorize <span className="text-[#34D399] font-semibold">&quot;{learnPrompt.ruleKey}&quot;</span> as <span className="text-[#F5F5DC]/80">{learnPrompt.categoryName}</span>?
                                    </span>
                                    <button
                                        onClick={handleAcceptRule}
                                        className="px-3 py-1 rounded-lg bg-[#34D399]/15 border border-[#34D399]/30 text-[#34D399] text-xs font-space font-medium hover:bg-[#34D399]/25 transition-colors"
                                    >
                                        Save Rule
                                    </button>
                                    <button
                                        onClick={() => setLearnPrompt(null)}
                                        className="px-2 py-1 text-xs text-[#F5F5DC]/25 hover:text-[#F5F5DC]/50 font-space transition-colors"
                                    >
                                        Skip
                                    </button>
                                </motion.div>
                            )}

                            {/* Ignore prompt — shown inline after the row is deleted */}
                            {ignorePrompt?.rowId === row.id && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="rounded-xl bg-[#1a1520]/80 backdrop-blur-2xl border border-orange-400/20 border-t-orange-400/30 shadow-[0_4px_16px_rgba(0,0,0,0.25)] px-4 py-3 flex items-center gap-3"
                                >
                                    <EyeOff size={14} className="text-orange-400 flex-shrink-0" />
                                    <span className="text-xs font-space text-[#F5F5DC]/60 flex-1">
                                        Always ignore <span className="text-orange-400 font-semibold">&quot;{ignorePrompt.ruleKey}&quot;</span> on future imports?
                                    </span>
                                    <button
                                        onClick={handleAcceptIgnore}
                                        className="px-3 py-1 rounded-lg bg-orange-400/15 border border-orange-400/30 text-orange-400 text-xs font-space font-medium hover:bg-orange-400/25 transition-colors"
                                    >
                                        Always Ignore
                                    </button>
                                    <button
                                        onClick={handleSkipIgnore}
                                        className="px-2 py-1 text-xs text-[#F5F5DC]/25 hover:text-[#F5F5DC]/50 font-space transition-colors"
                                    >
                                        Skip
                                    </button>
                                </motion.div>
                            )}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Save button */}
                    <motion.button
                        whileTap={allCategorized ? { scale: 0.97 } : {}}
                        onClick={handleSave}
                        disabled={!allCategorized || saving}
                        className={`
                            w-full py-4 rounded-2xl text-sm font-space font-semibold uppercase tracking-widest
                            transition-all border flex items-center justify-center gap-2
                            ${allCategorized
                                ? 'bg-[#34D399]/15 border-[#34D399]/30 text-[#34D399] hover:bg-[#34D399]/25 cursor-pointer'
                                : 'bg-white/[0.02] border-white/[0.06] text-[#F5F5DC]/20 cursor-not-allowed'
                            }
                        `}
                    >
                        {saving ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Saving…
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={16} />
                                Save {stagedRows.length} Transactions to Ledger
                            </>
                        )}
                    </motion.button>
                </motion.div>
            )}

            {/* Empty staging state */}
            {fileLoaded && stagedRows.length === 0 && !saveResult?.success && (
                <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] p-8 text-center">
                    <p className="text-4xl mb-3">🤷</p>
                    <p className="text-[#F5F5DC]/30 text-sm font-space">
                        No valid transactions found in the CSV.
                    </p>
                    <button
                        onClick={handleReset}
                        className="mt-3 text-xs text-[#D4AF37] underline font-space"
                    >
                        Try a different file
                    </button>
                </div>
            )}

            <BudgetToast />
        </div>
    );
}
