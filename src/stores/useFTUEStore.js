"use client";

import { create } from 'zustand';

const useFTUEStore = create((set, get) => ({
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
                const merged = await res.json();
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
                const state = await res.json();
                set({ ftueState: state });
                if (refreshAllData) refreshAllData();
            }
        } catch (e) { console.error('Failed to reset FTUE:', e); }
    },
}));

export default useFTUEStore;
