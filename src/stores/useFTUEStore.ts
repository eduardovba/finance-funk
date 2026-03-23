"use client";

import { create } from 'zustand';

// ═══════════ TYPES ═══════════

export interface FTUEData {
    wizardCompleted: boolean;
    usingDemoData: boolean;
    isTutorialActive: boolean;
    tutorialStep?: number;
    showCurrencyPicker: boolean;
    checklistItems: Record<string, boolean>;
    onboardingGoal?: string | null;
    onboardingExperience?: string | null;
    showFirstVisitGreeting?: boolean;
    sidebarDismissed?: boolean;
    checklistDismissed?: boolean;
    pageTutorials?: Record<string, boolean>;
    selectedAssetClasses?: string[];
    wizardStep?: number;
    timeHorizon?: string | null;
    netWorthTarget?: number | null;
    targetReturn?: number | null;
}

export interface FTUEState {
    ftueState: FTUEData | null;
}

export interface FTUEActions {
    setFtueState: (v: FTUEData | null) => void;
    updateFtueProgress: (updates: Partial<FTUEData>) => Promise<FTUEData | undefined>;
    resetFtue: (refreshAllData?: () => Promise<void>) => Promise<void>;
}

// ═══════════ STORE ═══════════

const useFTUEStore = create<FTUEState & FTUEActions>((set) => ({
    // ═══════════ STATE ═══════════
    ftueState: null,   // null = loading, object = loaded

    // ═══════════ SETTERS ═══════════
    setFtueState: (v) => set({ ftueState: v }),

    // ═══════════ ACTIONS ═══════════
    updateFtueProgress: async (updates) => {
        try {
            const res = await fetch('/api/ftue', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                const merged: FTUEData = await res.json();
                set({ ftueState: merged });
                return merged;
            } else {
                console.error('FTUE update returned non-OK status:', res.status, await res.text().catch(() => ''));
            }
        } catch (e) { console.error('Failed to update FTUE:', e); }
    },

    resetFtue: async (refreshAllData) => {
        try {
            const res = await fetch('/api/ftue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reset' })
            });
            if (res.ok) {
                const state: FTUEData = await res.json();
                set({ ftueState: state });
                if (refreshAllData) refreshAllData();
            }
        } catch (e) { console.error('Failed to reset FTUE:', e); }
    },
}));

export default useFTUEStore;
