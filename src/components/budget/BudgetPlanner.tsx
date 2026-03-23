'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    arrayMove,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Save, Wand2, Plus, Minus, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import _FloatingActionButton from '@/components/FloatingActionButton';
import { formatCents, parseToCents } from '@/lib/budgetUtils';

const FloatingActionButton = _FloatingActionButton as any;
import useBudgetStore from '@/stores/useBudgetStore';
import CategoryFormSheet from '@/components/budget/CategoryFormSheet';
import BudgetToast from '@/components/budget/BudgetToast';
import type { BudgetCategory } from '@/types';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';

export default function BudgetPlanner() {
    const {
        categories,
        loading,
        displayCurrency,
        fetchCategories,
        addCategory,
        updateCategory,
        deleteCategory,
        reorderCategories,
        bulkUpdateTargets,
        fetchSuggestions,
    } = useBudgetStore();

    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);
    const [avgMonthlyIncomeCents, setAvgMonthlyIncomeCents] = useState(0);
    const [suggesting, setSuggesting] = useState(false);
    const [saving, setSaving] = useState(false);

    // ─── Local State for Inline Editing ───────────────────────
    const [draftTargets, setDraftTargets] = useState<Record<number, string>>({});
    const [rowSuggestions, setRowSuggestions] = useState<Record<number, number>>({});

    // Quietly fetch ALL suggestions on mount for inline chips
    useEffect(() => {
        let mounted = true;
        fetchSuggestions().then(data => {
            if (!mounted) return;
            if (data.avg_monthly_income_cents > 0) {
                setAvgMonthlyIncomeCents(data.avg_monthly_income_cents);
            }
            const map: Record<number, number> = {};
            data.suggestions.forEach(s => {
                map[s.category_id] = s.suggested_cents;
            });
            setRowSuggestions(map);
        }).catch(console.error);
        return () => { mounted = false; };
    }, [fetchSuggestions]);

    // Hydrate form on categories fetch
    useEffect(() => {
        const drafts: Record<number, string> = {};
        categories.forEach(c => {
            // Store as decimal string (e.g. 15000 cents -> "150.00") if non-zero
            drafts[c.id] = c.monthly_target_cents > 0
                ? (c.monthly_target_cents / 100).toFixed(2)
                : '';
        });
        setDraftTargets(drafts);
    }, [categories]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    // Split logic
    const expenseCategories = useMemo(
        () => categories.filter(c => c.is_income === 0).sort((a, b) => a.sort_order - b.sort_order),
        [categories]
    );
    const incomeCategories = useMemo(
        () => categories.filter(c => c.is_income === 1).sort((a, b) => a.sort_order - b.sort_order),
        [categories]
    );

    // ─── DnD sensors ────────────────────────────────────────
    const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
    const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } });
    const sensors = useSensors(pointerSensor, touchSensor);

    const handleDragEnd = (event: DragEndEvent, list: BudgetCategory[]) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = list.findIndex(c => c.id === active.id);
        const newIndex = list.findIndex(c => c.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(list, oldIndex, newIndex);
        const items = reordered.map((c, i) => ({ id: c.id, sort_order: i }));
        reorderCategories(items);
    };

    // Form logic
    const handleEdit = (cat: BudgetCategory) => {
        setEditingCategory(cat);
        setSheetOpen(true);
    };

    const handleAdd = () => {
        setEditingCategory(null);
        setSheetOpen(true);
    };

    // Auto Suggest
    const handleAutoSuggest = async () => {
        setSuggesting(true);
        try {
            const data = await fetchSuggestions();
            setAvgMonthlyIncomeCents(data.avg_monthly_income_cents);
            
            // Apply suggestions to draftTargets
            if (data.suggestions.length > 0) {
                setDraftTargets(prev => {
                    const next = { ...prev };
                    data.suggestions.forEach(s => {
                        next[s.category_id] = s.suggested_cents > 0
                            ? (s.suggested_cents / 100).toFixed(2)
                            : '';
                    });
                    return next;
                });
            }
        } finally {
            setSuggesting(false);
        }
    };

    // Bulk Save
    const handleSaveBudgets = async () => {
        setSaving(true);
        try {
            const itemsToUpdate = expenseCategories.map(c => {
                const draft = draftTargets[c.id];
                const cents = draft && draft.trim() ? parseToCents(draft) : 0;
                return {
                    id: c.id,
                    monthly_target_cents: cents
                };
            });
            await bulkUpdateTargets(itemsToUpdate);
        } finally {
            setSaving(false);
        }
    };

    const handleDraftChange = (id: number, val: string) => {
        setDraftTargets(prev => ({ ...prev, [id]: val }));
    };

    // Summary Math
    const totalBudgetedCents = expenseCategories.reduce((acc, c) => {
        const draft = draftTargets[c.id];
        const cents = draft && draft.trim() ? parseToCents(draft) : 0;
        return acc + cents;
    }, 0);

    const surplusCents = avgMonthlyIncomeCents - totalBudgetedCents;
    const isDeficit = surplusCents < 0;

    // Has user dirtied the drafts?
    const isDirty = expenseCategories.some(c => {
        const draft = draftTargets[c.id];
        const currentCents = draft && draft.trim() ? parseToCents(draft) : 0;
        return currentCents !== c.monthly_target_cents;
    });

    const currencyMeta = SUPPORTED_CURRENCIES[displayCurrency] ?? SUPPORTED_CURRENCIES.BRL;

    return (
        <div className="max-w-3xl mx-auto px-4 py-6 pb-32">
            <h1 className="text-2xl font-bebas tracking-wide text-[#D4AF37] drop-shadow-[0_0_10px_rgba(212,175,55,0.3)] mb-6">
                Budget Planner
            </h1>

            {/* Top-Down Summary Card */}
            <div className="rounded-2xl bg-[#121418]/80 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.6)] p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-xs text-[#F5F5DC]/40 uppercase tracking-[2px] font-space mb-1">
                        Total Budgeted
                    </h2>
                    <p className="text-3xl font-bebas text-[#D4AF37] tracking-wide">
                        {formatCents(totalBudgetedCents, displayCurrency)}
                    </p>
                </div>

                {avgMonthlyIncomeCents > 0 && (
                    <div className="flex flex-col md:items-end border-t md:border-t-0 md:border-l border-white/[0.06] pt-4 md:pt-0 md:pl-8">
                        <div className="flex md:flex-col justify-between items-center md:items-end w-full mb-1">
                            <span className="text-2xs text-[#F5F5DC]/30 uppercase tracking-[2px] font-space">
                                90-Day Avg Income
                            </span>
                            <span className="text-sm font-space text-[#F5F5DC]/80">
                                {formatCents(avgMonthlyIncomeCents, displayCurrency)}
                            </span>
                        </div>
                        <div className="flex md:flex-col justify-between items-center md:items-end w-full">
                            <span className="text-2xs text-[#F5F5DC]/30 uppercase tracking-[2px] font-space">
                                {isDeficit ? 'Deficit' : 'Surplus'}
                            </span>
                            <span className={`text-sm font-space font-bold ${isDeficit ? 'text-red-400' : 'text-[#34D399]'}`}>
                                {formatCents(Math.abs(surplusCents), displayCurrency)}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {loading && categories.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-6 h-6 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* ─── Expense Categories ─────────────────────── */}
                    {expenseCategories.length > 0 && (
                        <div className="mb-8">
                            <h3 className="text-xs text-[#F5F5DC]/35 uppercase tracking-[2px] font-space mb-3 px-1 flex justify-between items-center">
                                <span>Expense Categories</span>
                                <span className="text-[#F5F5DC]/20 text-2xs">TARGET ({currencyMeta.symbol})</span>
                            </h3>
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, expenseCategories)}>
                                <SortableContext items={expenseCategories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                    <div className="flex flex-col gap-2">
                                        {expenseCategories.map(cat => (
                                            <PlannerRow
                                                key={cat.id}
                                                category={cat}
                                                draftValue={draftTargets[cat.id] ?? ''}
                                                suggestionCents={rowSuggestions[cat.id]}
                                                currencyMeta={currencyMeta}
                                                onChangeDraft={(val) => handleDraftChange(cat.id, val)}
                                                onEdit={handleEdit}
                                                onDelete={deleteCategory}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>
                    )}

                    {/* ─── Income Categories ──────────────────────── */}
                    {incomeCategories.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-xs text-[#F5F5DC]/35 uppercase tracking-[2px] font-space mb-3 px-1">
                                Income Categories
                            </h3>
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, incomeCategories)}>
                                <SortableContext items={incomeCategories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                    <div className="flex flex-col gap-2">
                                        {incomeCategories.map(cat => (
                                            <PlannerRow
                                                key={cat.id}
                                                category={cat}
                                                draftValue="" // Income categories don't have budget targets typically in this UI
                                                currencyMeta={currencyMeta}
                                                onChangeDraft={() => {}}
                                                onEdit={handleEdit}
                                                onDelete={deleteCategory}
                                                readOnly
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>
                    )}

                    {categories.length === 0 && (
                        <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] p-8 text-center text-[#F5F5DC]/30 text-sm font-space">
                            No categories yet. Tap + to add one.
                        </div>
                    )}
                </>
            )}

            {/* Sticky Action Bar */}
            <div className="fixed bottom-[88px] left-0 right-0 px-4 pointer-events-none z-[500]">
                <div className="max-w-3xl mx-auto flex gap-3 pointer-events-auto">
                    <button
                        onClick={handleAutoSuggest}
                        disabled={suggesting || expenseCategories.length === 0}
                        className="flex items-center justify-center gap-2 flex-1 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#F5F5DC]/80 font-space font-medium text-sm tracking-wider hover:bg-white/[0.08] active:bg-white/[0.05] disabled:opacity-40 transition-all backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
                    >
                        <Wand2 size={16} className={suggesting ? 'animate-pulse' : 'text-[#D4AF37]'} />
                        {suggesting ? 'Analyzing...' : 'Magic Budget'}
                    </button>

                    <button
                        onClick={handleSaveBudgets}
                        disabled={saving || (!isDirty && avgMonthlyIncomeCents === 0)}
                        className={`flex items-center justify-center gap-2 flex-1 py-3.5 rounded-xl font-space font-semibold text-sm tracking-wider uppercase transition-all backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.5)] ${
                            isDirty
                                ? 'bg-[#D4AF37] text-black shadow-[0_4px_20px_rgba(212,175,55,0.3)] hover:bg-[#D4AF37]/90 active:bg-[#D4AF37]/80'
                                : 'bg-white/[0.02] border border-white/[0.04] text-[#F5F5DC]/30 disabled:opacity-50'
                        }`}
                    >
                        <Save size={16} className={saving ? 'animate-pulse' : ''} />
                        {saving ? 'Saving...' : 'Save Budgets'}
                    </button>
                </div>
            </div>

            <FloatingActionButton
                onAddBroker={handleAdd}
                brokerLabel="Add Category"
                onAddTransaction={handleAdd}
                isVisible={true}
            />

            <CategoryFormSheet
                isOpen={sheetOpen}
                onClose={() => { setSheetOpen(false); setEditingCategory(null); }}
                editCategory={editingCategory}
                onSubmitCreate={addCategory}
                onSubmitUpdate={updateCategory}
            />

            <BudgetToast />
        </div>
    );
}

// ═══════════ PlannerRow ═══════════

interface PlannerRowProps {
    category: BudgetCategory;
    draftValue: string;
    suggestionCents?: number;
    currencyMeta: any;
    onChangeDraft: (val: string) => void;
    onEdit: (cat: BudgetCategory) => void;
    onDelete: (id: number) => void;
    readOnly?: boolean;
}

function PlannerRow({ category, draftValue, suggestionCents, currencyMeta, onChangeDraft, onEdit, onDelete, readOnly }: PlannerRowProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });
    const isIncome = category.is_income === 1;

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    // Calculate numeric current value safely
    const currentCents = draftValue && draftValue.trim() ? parseToCents(draftValue) : 0;
    
    // Dynamic max for the slider (at least 500 currency units, or 1.5x the current/suggested amount)
    const baseUnitMax = Math.max(
        500,
        (suggestionCents ?? 0) / 100 * 1.5,
        (currentCents / 100) * 1.5
    );
    // Round max to nearest 100 for a clean slider
    const sliderMax = Math.ceil(baseUnitMax / 100) * 100;

    const handleStep = (deltaUnits: number) => {
        const currentUnits = currentCents / 100;
        const nextUnits = Math.max(0, currentUnits + deltaUnits);
        onChangeDraft(nextUnits.toFixed(2));
    };

    const handleApplySuggestion = () => {
        if (suggestionCents && suggestionCents > 0) {
            onChangeDraft((suggestionCents / 100).toFixed(2));
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex flex-col px-4 py-3 rounded-xl border transition-all
                ${isDragging
                    ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30 shadow-[0_8px_32px_rgba(212,175,55,0.15)] z-50'
                    : 'bg-[#121418]/60 backdrop-blur-xl border-white/[0.04] hover:bg-white/[0.02]'
                }`}
        >
            <div className="flex items-center gap-3">
                <button {...attributes} {...listeners} className="p-1 cursor-grab active:cursor-grabbing touch-none hidden sm:block">
                    <GripVertical size={16} className="text-[#F5F5DC]/20" />
                </button>

                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: (category.color || '#D4AF37') + '20' }}
                >
                    {category.icon || '📦'}
                </div>

                <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-base font-space text-[#F5F5DC]/90 truncate tracking-wide">
                            {category.name}
                        </span>
                        {isIncome && (
                            <span className="text-2xs uppercase tracking-[1.5px] font-space px-1.5 py-0.5 rounded-lg border text-emerald-400 border-emerald-400/20 bg-emerald-400/10">
                                Income
                            </span>
                        )}
                    </div>

                    {/* Suggestion Chip */}
                    {!readOnly && suggestionCents && suggestionCents > 0 && (
                        <button
                            onClick={handleApplySuggestion}
                            className="w-fit flex items-center gap-1.5 mt-1 text-xs font-space tracking-wide text-[#D4AF37]/70 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 px-1.5 py-0.5 rounded transition-colors"
                        >
                            <Wand2 size={12} /> 
                            {formatCents(suggestionCents, currencyMeta.code)} avg
                        </button>
                    )}
                </div>

                {!readOnly && (
                    <div className="flex items-center gap-1.5">
                        <button 
                            onClick={() => handleStep(-10)}
                            className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[#F5F5DC]/40 hover:text-[#F5F5DC]/80 hover:bg-white/[0.06] active:scale-95 transition-all"
                        >
                            <Minus size={14} />
                        </button>
                        
                        <div className="flex items-center w-24 sm:w-[110px] px-2 py-1.5 rounded-lg bg-white/[0.02] border border-transparent hover:border-white/[0.06] focus-within:border-[#D4AF37]/40 focus-within:bg-white/[0.05] transition-colors">
                            <span className="text-[#D4AF37]/50 font-space text-sm sm:text-base mr-1 pointer-events-none select-none">
                                {currencyMeta.symbol}
                            </span>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={draftValue}
                                onChange={(e) => onChangeDraft(e.target.value)}
                                className="w-full bg-transparent text-[#D4AF37] font-space text-sm sm:text-base text-right focus:outline-none"
                            />
                        </div>

                        <button 
                            onClick={() => handleStep(10)}
                            className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[#F5F5DC]/40 hover:text-[#F5F5DC]/80 hover:bg-white/[0.06] active:scale-95 transition-all"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                )}

                <div className="flex flex-col gap-1 items-center justify-center ml-1 sm:ml-2 border-l border-white/[0.06] pl-2 sm:pl-3">
                    <button
                        onClick={() => onEdit(category)}
                        className="p-1 rounded text-[#F5F5DC]/30 hover:text-[#D4AF37] hover:bg-white/[0.06]"
                    >
                        <Pencil size={12} />
                    </button>
                </div>
            </div>

            {/* Range Slider for Expenses */}
            {!readOnly && (
                <div className="mt-4 mb-1 px-1 flex items-center">
                    <input 
                        type="range"
                        min="0"
                        max={sliderMax}
                        step="10"
                        value={currentCents / 100}
                        onChange={(e) => onChangeDraft(parseFloat(e.target.value).toFixed(2))}
                        className="w-full h-1.5 bg-white/[0.06] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#D4AF37] [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(212,175,55,0.5)] transition-all"
                        style={{
                            background: `linear-gradient(to right, #D4AF37 ${(currentCents / 100 / sliderMax) * 100}%, rgba(255,255,255,0.06) ${(currentCents / 100 / sliderMax) * 100}%)`
                        }}
                    />
                </div>
            )}
        </div>
    );
}
