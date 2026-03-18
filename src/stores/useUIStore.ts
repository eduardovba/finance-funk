"use client";

import { create } from 'zustand';

// ═══════════ TYPES ═══════════

export interface StatusModal {
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning';
}

export interface UIState {
    isFormOpen: boolean;
    editingTransaction: unknown | null;    // TODO: replace with Transaction type when available
    isDeleteModalOpen: boolean;
    transactionToDelete: unknown | null;   // TODO: replace with Transaction | number type
    isInspectorOpen: boolean;
    inspectorMode: 'default' | 'add-broker' | 'add-transaction';
    statusModal: StatusModal;
    isMonthlyCloseModalOpen: boolean;
}

export interface UIActions {
    setIsFormOpen: (v: boolean) => void;
    setEditingTransaction: (v: unknown | null) => void;
    setIsDeleteModalOpen: (v: boolean) => void;
    setTransactionToDelete: (v: unknown | null) => void;
    setIsInspectorOpen: (v: boolean) => void;
    setInspectorMode: (v: 'default' | 'add-broker' | 'add-transaction') => void;
    setStatusModal: (v: StatusModal) => void;
    setIsMonthlyCloseModalOpen: (v: boolean) => void;
}

// ═══════════ STORE ═══════════

const useUIStore = create<UIState & UIActions>((set) => ({
    // ═══════════ STATE ═══════════
    isFormOpen: false,
    editingTransaction: null,
    isDeleteModalOpen: false,
    transactionToDelete: null,
    isInspectorOpen: false,
    inspectorMode: 'default',   // 'default', 'add-broker', 'add-transaction'
    statusModal: { isOpen: false, title: '', message: '', type: 'success' },
    isMonthlyCloseModalOpen: false,

    // ═══════════ SETTERS ═══════════
    setIsFormOpen: (v) => set({ isFormOpen: v }),
    setEditingTransaction: (v) => set({ editingTransaction: v }),
    setIsDeleteModalOpen: (v) => set({ isDeleteModalOpen: v }),
    setTransactionToDelete: (v) => set({ transactionToDelete: v }),
    setIsInspectorOpen: (v) => set({ isInspectorOpen: v }),
    setInspectorMode: (v) => set({ inspectorMode: v }),
    setStatusModal: (v) => set({ statusModal: v }),
    setIsMonthlyCloseModalOpen: (v) => set({ isMonthlyCloseModalOpen: v }),
}));

export default useUIStore;
