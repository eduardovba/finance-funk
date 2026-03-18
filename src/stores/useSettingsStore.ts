"use client";

import { create } from 'zustand';

// ═══════════ TYPES ═══════════

export interface AppSettings {
    autoMonthlyCloseEnabled: boolean;
    backgroundSelection: string;
}

export interface SettingsState {
    appSettings: AppSettings;
    forecastSettings: Record<string, unknown>;       // TODO: define ForecastSettings shape
    dashboardConfig: unknown | null;                 // TODO: define DashboardConfig shape
    allocationTargets: Record<string, unknown>;      // TODO: define AllocationTargets shape
    assetClasses: Record<string, string>;
}

export interface SettingsActions {
    setAppSettings: (v: AppSettings | ((prev: AppSettings) => AppSettings)) => void;
    setForecastSettings: (v: Record<string, unknown>) => void;
    setDashboardConfig: (v: unknown | null) => void;
    setAllocationTargets: (v: Record<string, unknown>) => void;
    setAssetClasses: (v: Record<string, string>) => void;
    handleUpdateAppSettings: (newSettings: AppSettings) => Promise<void>;
}

// ═══════════ STORE ═══════════

const useSettingsStore = create<SettingsState & SettingsActions>((set) => ({
    // ═══════════ STATE ═══════════
    appSettings: { autoMonthlyCloseEnabled: true, backgroundSelection: 'frosted-glass' },
    forecastSettings: {},
    dashboardConfig: null,
    allocationTargets: {},
    assetClasses: {},

    // ═══════════ SETTERS ═══════════
    setAppSettings: (v) => {
        if (typeof v === 'function') {
            set((s) => ({ appSettings: v(s.appSettings) }));
        } else {
            set({ appSettings: v });
        }
    },
    setForecastSettings: (v) => set({ forecastSettings: v }),
    setDashboardConfig: (v) => set({ dashboardConfig: v }),
    setAllocationTargets: (v) => set({ allocationTargets: v }),
    setAssetClasses: (v) => set({ assetClasses: v }),

    // ═══════════ ACTIONS ═══════════
    handleUpdateAppSettings: async (newSettings) => {
        set({ appSettings: newSettings });
        try {
            await fetch('/api/app-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSettings)
            });
        } catch (error) {
            console.error('Failed to update app settings:', error);
        }
    },
}));

export default useSettingsStore;
