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
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import _FloatingActionButton from '@/components/FloatingActionButton';

const FloatingActionButton = _FloatingActionButton as any;
import useBudgetStore from '@/stores/useBudgetStore';
import CategoryCard from '@/components/budget/CategoryCard';
import CategoryFormSheet from '@/components/budget/CategoryFormSheet';
import BudgetToast from '@/components/budget/BudgetToast';
import type { BudgetCategory } from '@/types';

export default function CategoryManager() {
    const {
        categories,
        loading,
        fetchCategories,
        addCategory,
        updateCategory,
        deleteCategory,
        reorderCategories,
    } = useBudgetStore();

    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    // ─── Split into expense and income ──────────────────────
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

    const handleEdit = (cat: BudgetCategory) => {
        setEditingCategory(cat);
        setSheetOpen(true);
    };

    const handleAdd = () => {
        setEditingCategory(null);
        setSheetOpen(true);
    };

    const handleSubmitCreate = async (body: Omit<BudgetCategory, 'id' | 'user_id'>) => {
        await addCategory(body);
    };

    const handleSubmitUpdate = async (body: BudgetCategory) => {
        await updateCategory(body);
    };

    return (
        <div className="max-w-3xl mx-auto px-4 py-6 pb-28">
            {/* Page title */}
            <h1 className="text-2xl font-bebas tracking-wide text-[#D4AF37] drop-shadow-[0_0_10px_rgba(212,175,55,0.3)] mb-6">
                Budget Categories
            </h1>

            {loading && categories.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-6 h-6 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* ─── Expense Categories ─────────────────────── */}
                    <CategorySection
                        title="Expense"
                        categories={expenseCategories}
                        sensors={sensors}
                        onDragEnd={(e) => handleDragEnd(e, expenseCategories)}
                        onEdit={handleEdit}
                        onDelete={deleteCategory}
                    />

                    {/* ─── Income Categories ──────────────────────── */}
                    <CategorySection
                        title="Income"
                        categories={incomeCategories}
                        sensors={sensors}
                        onDragEnd={(e) => handleDragEnd(e, incomeCategories)}
                        onEdit={handleEdit}
                        onDelete={deleteCategory}
                    />

                    {categories.length === 0 && (
                        <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-8 text-center">
                            <p className="text-4xl mb-3">📂</p>
                            <p className="text-[#F5F5DC]/30 text-sm font-space">
                                No categories yet. Tap + to add one.
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* Shared FAB — matches asset pages exactly */}
            <FloatingActionButton
                onAddBroker={handleAdd}
                brokerLabel="Add Category"
                onAddTransaction={handleAdd}
                isVisible={true}
            />

            {/* Form Sheet */}
            <CategoryFormSheet
                isOpen={sheetOpen}
                onClose={() => { setSheetOpen(false); setEditingCategory(null); }}
                editCategory={editingCategory}
                onSubmitCreate={handleSubmitCreate}
                onSubmitUpdate={handleSubmitUpdate}
            />

            <BudgetToast />
        </div>
    );
}

// ═══════════ CategorySection ═══════════

interface CategorySectionProps {
    title: string;
    categories: BudgetCategory[];
    sensors: ReturnType<typeof useSensors>;
    onDragEnd: (event: DragEndEvent) => void;
    onEdit: (cat: BudgetCategory) => void;
    onDelete: (id: number) => void;
}

function CategorySection({ title, categories, sensors, onDragEnd, onEdit, onDelete }: CategorySectionProps) {
    if (categories.length === 0) return null;

    return (
        <div className="mb-6">
            <h3 className="text-[0.75rem] text-[#F5F5DC]/35 uppercase tracking-[2px] font-space mb-3 px-1">
                {title} Categories
            </h3>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-1.5">
                        {categories.map(cat => (
                            <CategoryCard
                                key={cat.id}
                                category={cat}
                                onEdit={onEdit}
                                onDelete={onDelete}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
}
