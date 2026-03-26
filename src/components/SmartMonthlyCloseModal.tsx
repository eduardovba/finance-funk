'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import type { MonthlyCloseTask, MonthlyCloseTaskType } from '@/types';
import { Button } from '@/components/ui';
import type { TaskSuggestion } from '@/lib/monthlyCloseEngine';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─── Types ───────────────────────────────────────────────────────────────

interface EnrichedTask extends MonthlyCloseTask {
    currency?: string;
    lastKnownBalance?: number;
}

interface TasksResponse {
    month: string;
    tasks: EnrichedTask[];
    completed: number;
    total: number;
    suggestions?: TaskSuggestion[];
    assets?: { id: number; name: string; asset_class: string }[];
}

interface SmartMonthlyCloseModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatMonthLabel(month: string): string {
    const [year, mon] = month.split('-').map(Number);
    const date = new Date(year, mon - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getLastDayOfMonth(month: string): string {
    const [year, mon] = month.split('-').map(Number);
    const d = new Date(year, mon, 0);
    return d.toISOString().split('T')[0];
}

const TASK_TYPE_CONFIG: Record<MonthlyCloseTaskType, { icon: string; label: string }> = {
    REAL_ESTATE_UPDATE: { icon: '🏠', label: 'Update valuation' },
    FIXED_INCOME_UPDATE: { icon: '💰', label: 'Update balance' },
    DEBT_UPDATE: { icon: '💳', label: 'Update outstanding' },
    BUDGET_REVIEW: { icon: '📊', label: 'Review budget' },
    RECORD_SNAPSHOT: { icon: '📸', label: 'Record monthly snapshot' },
    CUSTOM: { icon: '📌', label: '' },
};

const ASSET_CLASS_ICONS: Record<string, string> = {
    'Equity': '📈',
    'Fixed Income': '💰',
    'Real Estate': '🏠',
    'Crypto': '₿',
    'Pension': '🏦',
    'Debt': '💳',
};

function getTaskIcon(task: EnrichedTask, assets?: { id: number; name: string; asset_class: string }[]): string {
    // If the task has an asset linked, use the asset class icon
    if (task.related_entity_id && assets) {
        const asset = assets.find(a => a.id === task.related_entity_id);
        if (asset) return ASSET_CLASS_ICONS[asset.asset_class] || '📌';
    }
    const config = TASK_TYPE_CONFIG[task.task_type];
    return config?.icon || '📌';
}

// ─── Asset Picker ────────────────────────────────────────────────────────

const CATEGORY_ORDER = ['Equity', 'Fixed Income', 'Real Estate', 'Crypto', 'Pension', 'Debt'] as const;

function AssetPicker({
    assets,
    selectedId,
    onSelect,
}: {
    assets: { id: number; name: string; asset_class: string }[];
    selectedId: number | null;
    onSelect: (id: number | null) => void;
}) {
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    // Group assets by class
    const grouped = CATEGORY_ORDER.reduce<Record<string, typeof assets>>((acc, cls) => {
        const items = assets.filter(a => a.asset_class === cls);
        if (items.length > 0) acc[cls] = items;
        return acc;
    }, {});

    const availableCategories = Object.keys(grouped);

    // If searching, show all matching assets across categories
    const isSearching = search.trim().length > 0;
    const searchResults = isSearching
        ? assets.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
        : [];

    const selectedAsset = assets.find(a => a.id === selectedId);

    return (
        <div
            className="rounded-xl p-3 animate-in slide-in-from-top-2 duration-200"
            style={{
                background: 'rgba(11, 6, 26, 0.6)',
                border: '1px solid rgba(212, 175, 55, 0.12)',
            }}
        >
            {/* Selected asset indicator */}
            {selectedAsset && (
                <div className="flex items-center justify-between mb-3 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="text-xs" style={{ color: '#D4AF37', fontFamily: 'var(--font-space)' }}>
                        {ASSET_CLASS_ICONS[selectedAsset.asset_class]} {selectedAsset.name}
                    </span>
                    <button
                        type="button"
                        onClick={() => { onSelect(null); setActiveCategory(null); setSearch(''); }}
                        className="text-[0.6rem] px-2 py-0.5 rounded transition-colors hover:bg-white/5"
                        style={{ color: 'rgba(245,245,220,0.4)' }}
                    >
                        Clear
                    </button>
                </div>
            )}

            {/* Search input */}
            <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); if (e.target.value) setActiveCategory(null); }}
                placeholder="Search assets..."
                className="w-full px-3 py-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#D4AF37]/30 mb-3"
                style={{
                    background: 'rgba(11, 6, 26, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    color: '#F5F5DC',
                    fontFamily: 'var(--font-space)',
                }}
            />

            {/* Search results */}
            {isSearching && (
                <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
                    {searchResults.length === 0 && (
                        <p className="text-xs py-2 text-center" style={{ color: 'rgba(245,245,220,0.3)', fontFamily: 'var(--font-space)' }}>
                            No matching assets
                        </p>
                    )}
                    {searchResults.map(a => (
                        <button
                            key={a.id}
                            type="button"
                            onClick={() => { onSelect(a.id); setSearch(''); setActiveCategory(null); }}
                            className="w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all hover:bg-white/5"
                            style={{
                                background: selectedId === a.id ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                            }}
                        >
                            <span className="text-xs">{ASSET_CLASS_ICONS[a.asset_class] || '📌'}</span>
                            <span className="text-xs truncate" style={{ color: '#F5F5DC', fontFamily: 'var(--font-space)' }}>{a.name}</span>
                            <span className="text-[0.55rem] ml-auto shrink-0" style={{ color: 'rgba(245,245,220,0.3)' }}>{a.asset_class}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Category pills */}
            {!isSearching && (
                <>
                    <div className="flex flex-wrap gap-1.5">
                        {availableCategories.map(cls => (
                            <button
                                key={cls}
                                type="button"
                                onClick={() => setActiveCategory(activeCategory === cls ? null : cls)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all text-xs"
                                style={{
                                    background: activeCategory === cls ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${activeCategory === cls ? 'rgba(212, 175, 55, 0.25)' : 'rgba(255,255,255,0.06)'}`,
                                    color: activeCategory === cls ? '#D4AF37' : 'rgba(245,245,220,0.6)',
                                    fontFamily: 'var(--font-space)',
                                }}
                            >
                                <span>{ASSET_CLASS_ICONS[cls]}</span>
                                <span>{cls}</span>
                                <span className="text-[0.55rem] opacity-50">{grouped[cls].length}</span>
                            </button>
                        ))}
                    </div>

                    {/* Asset list for selected category */}
                    {activeCategory && grouped[activeCategory] && (
                        <div className="flex flex-col gap-0.5 mt-2.5 max-h-40 overflow-y-auto">
                            {grouped[activeCategory].map(a => (
                                <button
                                    key={a.id}
                                    type="button"
                                    onClick={() => { onSelect(a.id); setActiveCategory(null); }}
                                    className="w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all hover:bg-white/5"
                                    style={{
                                        background: selectedId === a.id ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                                    }}
                                >
                                    <span className="text-xs">{ASSET_CLASS_ICONS[a.asset_class] || '📌'}</span>
                                    <span className="text-xs truncate" style={{ color: '#F5F5DC', fontFamily: 'var(--font-space)' }}>{a.name}</span>
                                    {selectedId === a.id && <span className="text-[0.6rem] ml-auto" style={{ color: '#D4AF37' }}>✓</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ─── Inline Update Form ──────────────────────────────────────────────────

function InlineUpdateForm({
    task,
    month,
    onSave,
    onCancel,
}: {
    task: EnrichedTask;
    month: string;
    onSave: () => void;
    onCancel: () => void;
}) {
    const [value, setValue] = useState('');
    const [interestValue, setInterestValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const currency = task.currency || 'BRL';
    const lastDay = getLastDayOfMonth(month);

    const handleSave = async () => {
        setIsSaving(true);
        setError('');

        try {
            const numValue = parseFloat(value);
            if (isNaN(numValue) || numValue < 0) {
                setError('Please enter a valid number');
                setIsSaving(false);
                return;
            }

            let apiOk = false;

            if (task.task_type === 'REAL_ESTATE_UPDATE') {
                const res = await fetch('/api/real-estate', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'updatePropertyValues',
                        id: String(task.related_entity_id),
                        name: task.related_entity_name,
                        currentValue: numValue,
                    }),
                });
                apiOk = res.ok;
            } else if (task.task_type === 'FIXED_INCOME_UPDATE') {
                let interest = 0;
                if (interestValue && parseFloat(interestValue) > 0) {
                    interest = parseFloat(interestValue);
                } else if (task.lastKnownBalance !== undefined) {
                    interest = numValue - task.lastKnownBalance;
                } else {
                    interest = numValue;
                }
                if (interest <= 0) interest = 0;

                const assetRes = await fetch('/api/fixed-income');
                const fiData = await assetRes.json();
                const matchingTx = Array.isArray(fiData)
                    ? fiData.find((t: any) => t.asset === task.related_entity_name)
                    : null;
                const broker = matchingTx?.broker || 'Manual';

                const res = await fetch('/api/fixed-income', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        asset: task.related_entity_name,
                        broker,
                        date: lastDay,
                        type: 'Interest',
                        interest,
                        currency,
                    }),
                });
                apiOk = res.ok;
            } else if (task.task_type === 'DEBT_UPDATE') {
                const res = await fetch('/api/debt-transactions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        lender: task.related_entity_name,
                        value_brl: numValue,
                        date: lastDay,
                        obs: 'Monthly close update',
                    }),
                });
                apiOk = res.ok;
            }

            if (!apiOk) {
                setError('Failed to save. Please try again.');
                setIsSaving(false);
                return;
            }

            await fetch('/api/monthly-close', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId: task.id, is_completed: true }),
            });

            onSave();
        } catch (e) {
            console.error('Inline update failed:', e);
            setError('An error occurred');
        } finally {
            setIsSaving(false);
        }
    };

    const getPlaceholder = () => {
        switch (task.task_type) {
            case 'REAL_ESTATE_UPDATE': return 'Current value (e.g. 450,000)';
            case 'FIXED_INCOME_UPDATE': return 'Current balance';
            case 'DEBT_UPDATE': return 'Outstanding balance';
            default: return 'Value';
        }
    };

    const getLabel = () => {
        switch (task.task_type) {
            case 'REAL_ESTATE_UPDATE': return 'Current Value';
            case 'FIXED_INCOME_UPDATE': return 'Current Balance';
            case 'DEBT_UPDATE': return 'Outstanding Balance';
            default: return 'Value';
        }
    };

    return (
        <div
            className="mt-2 p-4 rounded-xl animate-in slide-in-from-top-2 duration-200"
            style={{
                background: 'rgba(11, 6, 26, 0.6)',
                border: '1px solid rgba(212, 175, 55, 0.12)',
            }}
        >
            <div className="flex flex-col gap-3">
                <div>
                    <label
                        className="block text-[0.65rem] uppercase tracking-wider mb-1.5"
                        style={{ color: 'rgba(245, 245, 220, 0.5)', fontFamily: 'var(--font-space)' }}
                    >
                        {getLabel()} ({currency})
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={getPlaceholder()}
                        autoFocus
                        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-1 focus:ring-[#D4AF37]/30"
                        style={{
                            background: 'rgba(11, 6, 26, 0.6)',
                            border: '1px solid rgba(212, 175, 55, 0.12)',
                            color: '#F5F5DC',
                            fontFamily: 'var(--font-space)',
                        }}
                    />
                </div>

                {task.task_type === 'FIXED_INCOME_UPDATE' && (
                    <div>
                        <label
                            className="block text-[0.65rem] uppercase tracking-wider mb-1.5"
                            style={{ color: 'rgba(245, 245, 220, 0.5)', fontFamily: 'var(--font-space)' }}
                        >
                            Interest Earned ({currency}) — optional
                        </label>
                        <input
                            type="number"
                            step="any"
                            value={interestValue}
                            onChange={(e) => setInterestValue(e.target.value)}
                            placeholder="Leave blank to auto-compute from balance"
                            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-1 focus:ring-[#D4AF37]/30"
                            style={{
                                background: 'rgba(11, 6, 26, 0.6)',
                                border: '1px solid rgba(212, 175, 55, 0.12)',
                                color: '#F5F5DC',
                                fontFamily: 'var(--font-space)',
                            }}
                        />
                        {task.lastKnownBalance !== undefined && (
                            <p className="text-[0.65rem] mt-1" style={{ color: 'rgba(245, 245, 220, 0.4)', fontFamily: 'var(--font-space)' }}>
                                Last known balance: {task.lastKnownBalance.toLocaleString()}
                            </p>
                        )}
                    </div>
                )}

                {error && (
                    <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
                )}

                <div className="flex gap-2 mt-1">
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving || !value}
                        className="flex-1 md:flex-none text-xs"
                    >
                        {isSaving ? 'Saving…' : 'Save'}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onCancel}
                        className="flex-1 md:flex-none text-xs"
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Task Row ────────────────────────────────────────────────────────────

function TaskRow({
    task,
    month,
    onTaskUpdated,
    onDelete,
    assets,
    dragHandleProps,
}: {
    task: EnrichedTask;
    month: string;
    onTaskUpdated: () => void;
    onDelete?: () => void;
    assets?: { id: number; name: string; asset_class: string }[];
    dragHandleProps?: Record<string, any>;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [isEditingMeta, setIsEditingMeta] = useState(false);
    const [editLabel, setEditLabel] = useState(task.custom_label || task.related_entity_name || '');
    const [editAssetId, setEditAssetId] = useState<number | null>(task.related_entity_id ?? null);
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const config = TASK_TYPE_CONFIG[task.task_type] || TASK_TYPE_CONFIG.CUSTOM;
    const isCompleted = task.is_completed === 1;
    const displayLabel = task.custom_label || (task.related_entity_name
        ? `${config.label} for ${task.related_entity_name}`
        : config.label);
    const icon = getTaskIcon(task, assets);

    const handleToggleComplete = async () => {
        await fetch('/api/monthly-close', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId: task.id, is_completed: !isCompleted }),
        });
        onTaskUpdated();
    };

    const handleSaveEdit = async () => {
        if (!editLabel.trim()) return;
        setIsSavingEdit(true);
        try {
            await fetch('/api/monthly-close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_task',
                    taskId: task.id,
                    label: editLabel.trim(),
                    related_entity_id: editAssetId,
                }),
            });
            setIsEditingMeta(false);
            onTaskUpdated();
        } catch (e) {
            console.error('Update task failed:', e);
        } finally {
            setIsSavingEdit(false);
        }
    };

    const isInlineUpdatable = ['REAL_ESTATE_UPDATE', 'FIXED_INCOME_UPDATE', 'DEBT_UPDATE'].includes(task.task_type);
    const isEditable = task.task_type === 'CUSTOM';

    return (
        <div className="group">
            <div
                className="flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-200"
                style={{
                    opacity: isCompleted ? 0.5 : 1,
                    background: isEditing || isEditingMeta ? 'rgba(212, 175, 55, 0.03)' : 'transparent',
                }}
            >
                {/* Drag Handle or Spacer */}
                {dragHandleProps ? (
                    !isCompleted ? (
                        <div
                            {...dragHandleProps}
                            className="shrink-0 flex items-center justify-center w-5 h-5 cursor-grab active:cursor-grabbing hover:bg-white/5 rounded-md transition-colors"
                            style={{ color: 'rgba(212, 175, 55, 0.4)' }}
                            title="Drag to reorder"
                        >
                            ☰
                        </div>
                    ) : (
                        <div className="shrink-0 w-5 h-5" />
                    )
                ) : null}
                
                {/* Completion checkbox */}
                <button
                    type="button"
                    onClick={handleToggleComplete}
                    className="shrink-0 w-5 h-5 p-0 m-0 rounded-full flex items-center justify-center transition-all duration-200"
                    style={{
                        border: isCompleted ? 'none' : '1.5px solid rgba(212, 175, 55, 0.3)',
                        background: isCompleted ? '#D4AF37' : 'transparent',
                        color: isCompleted ? '#0B061A' : 'transparent',
                        fontSize: '0.6rem',
                    }}
                >
                    {isCompleted ? '✓' : ''}
                </button>

                {/* Icon + Label */}
                <span className="text-sm shrink-0">{icon}</span>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                    <p
                        className="text-sm truncate"
                        style={{
                            fontFamily: 'var(--font-space)',
                            color: '#F5F5DC',
                            textDecoration: isCompleted ? 'line-through' : 'none',
                        }}
                    >
                        {displayLabel}
                    </p>
                    {task.is_recurring === 1 && (
                        <span className="text-[0.6rem] shrink-0" style={{ color: 'rgba(212, 175, 55, 0.5)' }} title="Recurring">↻</span>
                    )}
                </div>

                {/* Actions */}
                {!isCompleted && (
                    <div className="flex items-center gap-1.5">
                        {isInlineUpdatable && (
                            <button
                                type="button"
                                onClick={() => setIsEditing(!isEditing)}
                                className="shrink-0 text-xs px-3 py-1.5 rounded-lg transition-all duration-200 hover:opacity-80"
                                style={{
                                    background: isEditing ? 'rgba(212, 175, 55, 0.15)' : 'rgba(212, 175, 55, 0.1)',
                                    color: '#D4AF37',
                                    fontFamily: 'var(--font-space)',
                                    border: '1px solid rgba(212, 175, 55, 0.15)',
                                }}
                            >
                                {isEditing ? 'Close' : 'Update'}
                            </button>
                        )}
                        {task.task_type === 'BUDGET_REVIEW' && (
                            <a
                                href="/budget"
                                className="shrink-0 text-xs px-3 py-1.5 rounded-lg transition-all duration-200 hover:opacity-80 no-underline"
                                style={{
                                    background: 'rgba(212, 175, 55, 0.1)',
                                    color: '#D4AF37',
                                    fontFamily: 'var(--font-space)',
                                    border: '1px solid rgba(212, 175, 55, 0.15)',
                                }}
                            >
                                Review →
                            </a>
                        )}
                        {isEditable && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setIsEditingMeta(!isEditingMeta); }}
                                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:bg-white/5"
                                style={{ color: 'rgba(245, 245, 220, 0.35)', fontSize: '0.7rem' }}
                                title="Edit task"
                            >
                                ✏️
                            </button>
                        )}
                        {onDelete && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:bg-rose-500/10"
                                style={{ color: 'rgba(245, 245, 220, 0.35)', fontSize: '0.7rem' }}
                                title="Remove task"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Inline edit form (for asset value updates) */}
            {isEditing && !isCompleted && (
                <InlineUpdateForm
                    task={task}
                    month={month}
                    onSave={() => {
                        setIsEditing(false);
                        onTaskUpdated();
                    }}
                    onCancel={() => setIsEditing(false)}
                />
            )}

            {/* Inline meta editor (for label + asset changes on CUSTOM tasks) */}
            {isEditingMeta && !isCompleted && (
                <div
                    className="mt-2 p-4 rounded-xl animate-in slide-in-from-top-2 duration-200"
                    style={{
                        background: 'rgba(11, 6, 26, 0.6)',
                        border: '1px solid rgba(212, 175, 55, 0.12)',
                    }}
                >
                    <div className="flex flex-col gap-3">
                        <div>
                            <label
                                className="block text-[0.65rem] uppercase tracking-wider mb-1.5"
                                style={{ color: 'rgba(245, 245, 220, 0.5)', fontFamily: 'var(--font-space)' }}
                            >
                                Task Label
                            </label>
                            <input
                                type="text"
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-1 focus:ring-[#D4AF37]/30"
                                style={{
                                    background: 'rgba(11, 6, 26, 0.6)',
                                    border: '1px solid rgba(212, 175, 55, 0.12)',
                                    color: '#F5F5DC',
                                    fontFamily: 'var(--font-space)',
                                }}
                            />
                        </div>
                        {assets && assets.length > 0 && (
                            <div>
                                <label
                                    className="block text-[0.65rem] uppercase tracking-wider mb-1.5"
                                    style={{ color: 'rgba(245, 245, 220, 0.5)', fontFamily: 'var(--font-space)' }}
                                >
                                    Linked Asset (optional)
                                </label>
                                <AssetPicker
                                    assets={assets}
                                    selectedId={editAssetId}
                                    onSelect={setEditAssetId}
                                />
                            </div>
                        )}
                        <div className="flex gap-2 mt-1">
                            <Button variant="primary" size="sm" onClick={handleSaveEdit} disabled={isSavingEdit || !editLabel.trim()} className="flex-1 md:flex-none text-xs">
                                {isSavingEdit ? 'Saving…' : 'Save'}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setIsEditingMeta(false)} className="flex-1 md:flex-none text-xs">Cancel</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Sortable Task Row ───────────────────────────────────────────────────

function SortableTaskRow(props: any) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.task.id.toString() });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 1,
        position: 'relative' as const,
    };
    return (
        <div ref={setNodeRef} style={style}>
            <TaskRow {...props} dragHandleProps={{ ...attributes, ...listeners }} />
        </div>
    );
}

// ─── Add Task Form ───────────────────────────────────────────────────────

function AddTaskForm({ month, onAdded, assets }: { month: string; onAdded: () => void; assets?: { id: number; name: string; asset_class: string }[] }) {
    const [label, setLabel] = useState('');
    const [isRecurring, setIsRecurring] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
    const [showAssetPicker, setShowAssetPicker] = useState(false);

    const selectedAsset = assets?.find(a => a.id === selectedAssetId);

    const handleAdd = async () => {
        if (!label.trim()) return;
        setIsAdding(true);
        try {
            await fetch('/api/monthly-close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'add_task',
                    month,
                    label: label.trim(),
                    is_recurring: isRecurring,
                    ...(selectedAssetId ? { related_entity_id: selectedAssetId } : {}),
                }),
            });
            setLabel('');
            setSelectedAssetId(null);
            setShowAssetPicker(false);
            onAdded();
        } catch (e) {
            console.error('Add task failed:', e);
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Add a reminder..."
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                    className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-1 focus:ring-[#D4AF37]/30"
                    style={{
                        background: 'rgba(11, 6, 26, 0.6)',
                        border: '1px solid rgba(212, 175, 55, 0.12)',
                        color: '#F5F5DC',
                        fontFamily: 'var(--font-space)',
                    }}
                />
                <button
                    type="button"
                    onClick={() => setShowAssetPicker(!showAssetPicker)}
                    className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                    style={{
                        background: showAssetPicker || selectedAsset ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                        border: `1px solid ${showAssetPicker || selectedAsset ? 'rgba(212, 175, 55, 0.25)' : 'rgba(255,255,255,0.08)'}`,
                        fontSize: '0.8rem',
                    }}
                    title="Link to asset"
                >
                    {selectedAsset ? (ASSET_CLASS_ICONS[selectedAsset.asset_class] || '📌') : '🔗'}
                </button>
                <button
                    type="button"
                    onClick={() => setIsRecurring(!isRecurring)}
                    className="shrink-0 text-[0.6rem] px-2 py-1.5 rounded-md transition-all"
                    style={{
                        background: isRecurring ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                        color: isRecurring ? '#D4AF37' : 'rgba(245, 245, 220, 0.3)',
                        border: `1px solid ${isRecurring ? 'rgba(212, 175, 55, 0.25)' : 'rgba(255,255,255,0.08)'}`,
                        fontFamily: 'var(--font-space)',
                    }}
                    title={isRecurring ? 'Will repeat monthly' : 'One-time task'}
                >
                    ↻ {isRecurring ? 'Monthly' : 'Once'}
                </button>
                <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAdd}
                    disabled={isAdding || !label.trim()}
                    className="shrink-0 text-xs"
                >
                    {isAdding ? '…' : 'Add'}
                </Button>
            </div>
            {showAssetPicker && assets && assets.length > 0 && (
                <AssetPicker
                    assets={assets}
                    selectedId={selectedAssetId}
                    onSelect={setSelectedAssetId}
                />
            )}
            {selectedAsset && !showAssetPicker && (
                <p className="text-[0.65rem]" style={{ color: 'rgba(212, 175, 55, 0.6)', fontFamily: 'var(--font-space)' }}>
                    {ASSET_CLASS_ICONS[selectedAsset.asset_class]} Linked to {selectedAsset.name}
                </p>
            )}
        </div>
    );
}

// ─── Suggestion Row ──────────────────────────────────────────────────────

function SuggestionRow({
    suggestion,
    onAccept,
    onDismiss,
}: {
    suggestion: TaskSuggestion;
    onAccept: () => void;
    onDismiss: () => void;
}) {
    const [isAccepting, setIsAccepting] = useState(false);

    const handleAccept = async () => {
        setIsAccepting(true);
        try {
            await fetch('/api/monthly-close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'accept_suggestion',
                    label: suggestion.label,
                    task_type: suggestion.task_type,
                    related_entity_id: suggestion.related_entity_id,
                }),
            });
            onAccept();
        } catch (e) {
            console.error('Accept suggestion failed:', e);
        } finally {
            setIsAccepting(false);
        }
    };

    return (
        <div
            className="flex items-start gap-3 py-2.5 px-3 rounded-xl"
            style={{ background: 'rgba(212, 175, 55, 0.02)' }}
        >
            <span className="text-sm shrink-0 mt-0.5">💡</span>
            <div className="flex-1 min-w-0">
                <p
                    className="text-sm"
                    style={{ fontFamily: 'var(--font-space)', color: '#F5F5DC' }}
                >
                    {suggestion.label}
                </p>
                <p
                    className="text-[0.65rem] mt-0.5"
                    style={{ fontFamily: 'var(--font-space)', color: 'rgba(245, 245, 220, 0.35)' }}
                >
                    {suggestion.reason}
                </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
                <button
                    type="button"
                    onClick={handleAccept}
                    disabled={isAccepting}
                    className="text-xs px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
                    style={{
                        background: 'transparent',
                        color: '#D4AF37',
                        border: '1px solid rgba(212, 175, 55, 0.25)',
                        fontFamily: 'var(--font-space)',
                        opacity: isAccepting ? 0.5 : 1,
                    }}
                >
                    {isAccepting ? '…' : 'Add'}
                </button>
                <button
                    type="button"
                    onClick={onDismiss}
                    className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors"
                    style={{ color: 'rgba(245, 245, 220, 0.2)', fontSize: '0.55rem' }}
                    title="Dismiss"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}

// ─── Main Modal ──────────────────────────────────────────────────────────

export default function SmartMonthlyCloseModal({ isOpen, onClose }: SmartMonthlyCloseModalProps) {
    const { handleRecordSnapshot, refreshAllData } = usePortfolio();
    const [data, setData] = useState<TasksResponse | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        setData((prev) => {
            if (!prev) return prev;
            
            // Reorder only active tasks; RECORD_SNAPSHOT stays at the bottom natively
            const sortableTasks = prev.tasks.filter(t => t.task_type !== 'RECORD_SNAPSHOT');
            const oldIndex = sortableTasks.findIndex(t => t.id.toString() === active.id);
            const newIndex = sortableTasks.findIndex(t => t.id.toString() === over.id);
            
            const newSortable = arrayMove(sortableTasks, oldIndex, newIndex);
            const snapshotTask = prev.tasks.find(t => t.task_type === 'RECORD_SNAPSHOT');
            const newTasks = snapshotTask ? [...newSortable, snapshotTask] : newSortable;
            
            // Fire API call asynchronously
            const payload = newSortable.map((t, idx) => ({ id: t.id, sort_order: idx }));
            fetch('/api/monthly-close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reorder_tasks', tasks: payload })
            });
            
            return { ...prev, tasks: newTasks }; 
        });
    };

    const handleDismissSuggestion = async (suggestion: TaskSuggestion) => {
        setDismissedSuggestions((prev) => new Set(prev).add(suggestion.label));
        try {
            await fetch('/api/monthly-close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'dismiss_suggestion', label: suggestion.label })
            });
        } catch (e) {
            console.error('Dismiss failed:', e);
        }
    };

    const fetchTasks = useCallback(async () => {
        try {
            const res = await fetch('/api/monthly-close?suggestions=true');
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (e) {
            console.error('Failed to fetch tasks:', e);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchTasks();
            setDismissedSuggestions(new Set());
        }
    }, [isOpen, fetchTasks]);

    const handleRecordSnapshotClick = async () => {
        setIsRecording(true);
        try {
            await handleRecordSnapshot();

            const snapshotTask = data?.tasks.find((t) => t.task_type === 'RECORD_SNAPSHOT');
            if (snapshotTask) {
                await fetch('/api/monthly-close', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ taskId: snapshotTask.id, is_completed: true }),
                });
            }

            await refreshAllData();
            await fetchTasks();
        } catch (e) {
            console.error('Snapshot failed:', e);
        } finally {
            setIsRecording(false);
        }
    };

    const handleDeleteTask = async (task: EnrichedTask) => {
        await fetch('/api/monthly-close', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete_task', taskId: task.id }),
        });
        await fetchTasks();
    };

    if (!isOpen || !data) return null;

    const progressPct = data.total > 0 ? (data.completed / data.total) * 100 : 0;
    const allDone = data.completed >= data.total;

    // Extract sortable tasks
    const sortableTasks = data.tasks.filter(t => t.task_type !== 'RECORD_SNAPSHOT');
    const snapshotTask = data.tasks.find((t) => t.task_type === 'RECORD_SNAPSHOT');

    const visibleSuggestions = (data.suggestions || []).filter(
        (s) => !dismissedSuggestions.has(s.label)
    );

    return (
        <div
            className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center"
            role="dialog"
            aria-modal="true"
        >
            {/* Backdrop — translucent with blur so UI shows through */}
            <div
                className="absolute inset-0"
                style={{ background: 'rgba(10, 6, 20, 0.4)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
                onClick={onClose}
            />

            {/* Modal body — frosted glass */}
            <div
                data-smart-close-modal=""
                className="relative w-full md:max-w-[640px] flex flex-col overflow-hidden"
                style={{
                    maxHeight: '90vh',
                    borderRadius: '20px 20px 0 0',
                    background: 'rgba(26, 15, 46, 0.55)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(40px)',
                    WebkitBackdropFilter: 'blur(40px)',
                    boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.3), 0 0 80px rgba(212, 175, 55, 0.03)',
                }}
            >
                <style>{`
                    @media (min-width: 768px) {
                        [data-smart-close-modal] {
                            border-radius: 20px !important;
                            max-height: 85vh !important;
                        }
                    }
                `}</style>

                {/* Drag handle (mobile) */}
                <div className="md:hidden flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(245, 245, 220, 0.2)' }} />
                </div>

                {/* Header */}
                <header className="flex justify-between items-center px-6 pt-4 pb-3 md:pt-6">
                    <div>
                        <h2
                            className="text-xl md:text-2xl tracking-[2px]"
                            style={{ fontFamily: 'var(--font-bebas)', color: '#D4AF37' }}
                        >
                            MONTHLY CLOSE
                        </h2>
                        <p
                            className="text-xs mt-0.5"
                            style={{ fontFamily: 'var(--font-space)', color: 'rgba(245, 245, 220, 0.5)' }}
                        >
                            {formatMonthLabel(data.month)} — {data.completed} of {data.total} complete
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/5"
                        style={{ color: 'rgba(245, 245, 220, 0.4)' }}
                    >
                        ✕
                    </button>
                </header>

                {/* Progress bar */}
                <div className="px-6 pb-4">
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(212, 175, 55, 0.1)' }}>
                        <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                                width: `${progressPct}%`,
                                background: allDone
                                    ? 'linear-gradient(135deg, #34D399, #10b981)'
                                    : 'linear-gradient(135deg, #CC5500, #D4AF37)',
                            }}
                        />
                    </div>
                </div>

                {/* Task list */}
                <div className="flex-1 overflow-y-auto px-6 pb-4" style={{ borderTop: '1px solid rgba(212, 175, 55, 0.08)' }}>

                    {/* Checklist */}
                    {sortableTasks.length > 0 && (
                        <div className="mt-4">
                            <SectionHeader icon="📋" label="MONTHLY TASKS" />
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={sortableTasks.map(t => t.id.toString())} strategy={verticalListSortingStrategy}>
                                    <div className="flex flex-col gap-0.5 mt-2">
                                        {sortableTasks.map((task) => (
                                            <SortableTaskRow
                                                key={task.id}
                                                task={task}
                                                month={data.month}
                                                onTaskUpdated={fetchTasks}
                                                onDelete={() => handleDeleteTask(task)}
                                                assets={data.assets}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>
                    )}

                    {/* Add a Reminder */}
                    <div className="mt-5">
                        <SectionHeader icon="➕" label="ADD A REMINDER" />
                        <div className="mt-2">
                            <AddTaskForm month={data.month} onAdded={fetchTasks} assets={data.assets} />
                        </div>
                    </div>

                    {/* Smart Suggestions */}
                    {visibleSuggestions.length > 0 && (
                        <div className="mt-5">
                            <SectionHeader icon="💡" label="SUGGESTED TASKS" muted />
                            <div className="flex flex-col gap-1 mt-1">
                                {visibleSuggestions.map((s, idx) => (
                                    <SuggestionRow
                                        key={`sug-${idx}-${s.label}`}
                                        suggestion={s}
                                        onAccept={fetchTasks}
                                        onDismiss={() => handleDismissSuggestion(s)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 6. Record Snapshot */}
                    {snapshotTask && (
                        <div className="mt-5">
                            <SectionHeader icon="📸" label="SNAPSHOT" />
                            <div
                                className="flex items-center gap-3 py-3 px-3 rounded-xl"
                                style={{ opacity: snapshotTask.is_completed ? 0.5 : 1 }}
                            >
                                <div
                                    className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                                    style={{
                                        border: snapshotTask.is_completed ? 'none' : '1.5px solid rgba(212, 175, 55, 0.3)',
                                        background: snapshotTask.is_completed ? '#D4AF37' : 'transparent',
                                        color: snapshotTask.is_completed ? '#0B061A' : 'transparent',
                                        fontSize: '0.6rem',
                                    }}
                                >
                                    {snapshotTask.is_completed ? '✓' : ''}
                                </div>
                                <span className="text-sm shrink-0">📸</span>
                                <p
                                    className="flex-1 text-sm"
                                    style={{
                                        fontFamily: 'var(--font-space)',
                                        color: '#F5F5DC',
                                        textDecoration: snapshotTask.is_completed ? 'line-through' : 'none',
                                    }}
                                >
                                    Record monthly snapshot
                                </p>
                                {!snapshotTask.is_completed && (
                                    <button
                                        type="button"
                                        onClick={handleRecordSnapshotClick}
                                        disabled={isRecording}
                                        className="shrink-0 text-xs px-3 py-1.5 rounded-lg transition-all duration-200 hover:opacity-80"
                                        style={{
                                            background: 'linear-gradient(135deg, #CC5500, #D4AF37)',
                                            color: '#0B061A',
                                            fontFamily: 'var(--font-space)',
                                            fontWeight: 600,
                                            opacity: isRecording ? 0.5 : 1,
                                        }}
                                    >
                                        {isRecording ? 'Recording…' : 'Record'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer — Non-blocking */}
                <footer
                    className="px-6 py-4 flex flex-col gap-2"
                    style={{
                        borderTop: '1px solid rgba(212, 175, 55, 0.08)',
                        background: 'rgba(0, 0, 0, 0.2)',
                    }}
                >
                    <div className="flex gap-3">
                        <Button
                            variant="primary"
                            onClick={handleRecordSnapshotClick}
                            disabled={isRecording}
                            className="flex-1 text-sm"
                            style={{
                                background: allDone
                                    ? 'linear-gradient(135deg, #34D399, #10b981)'
                                    : 'linear-gradient(135deg, #CC5500, #D4AF37)',
                                fontWeight: 700,
                                padding: '12px 24px',
                                opacity: isRecording ? 0.5 : 1,
                            }}
                        >
                            {isRecording ? 'Recording…' : allDone ? 'Record Snapshot ✓' : 'Record Snapshot Anyway'}
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={onClose}
                            className="text-sm"
                            style={{ padding: '12px 20px' }}
                        >
                            Close
                        </Button>
                    </div>
                    {!allDone && (
                        <p className="text-center text-[0.65rem]" style={{ color: 'rgba(245, 245, 220, 0.3)', fontFamily: 'var(--font-space)' }}>
                            You can record a snapshot even with incomplete tasks
                        </p>
                    )}
                </footer>
            </div>
        </div>
    );
}

// ─── Section Header ──────────────────────────────────────────────────────

function SectionHeader({ icon, label, muted }: { icon: string; label: string; muted?: boolean }) {
    return (
        <h3
            className="text-[0.65rem] uppercase tracking-[1.5px] mb-2"
            style={{
                fontFamily: 'var(--font-space)',
                color: muted ? 'rgba(212, 175, 55, 0.35)' : 'rgba(245, 245, 220, 0.35)',
            }}
        >
            {icon} {label}
        </h3>
    );
}
