"use client";

import { create } from 'zustand';

const useSettingsStore = create((set, get) => ({
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
