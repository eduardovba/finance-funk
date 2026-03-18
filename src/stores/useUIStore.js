"use client";

import { create } from 'zustand';

const useUIStore = create((set) => ({
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
