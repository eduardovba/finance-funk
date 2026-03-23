import { NextRequest, NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/kv';
import { requireAuth } from '@/lib/authGuard';
import { query } from '@/lib/db';
import { z } from 'zod';
import { validateBody } from '@/lib/validation';

const KEY = 'ftue_state';

const DEFAULT_STATE = {
    wizardCompleted: false,
    wizardStep: 0,
    selectedAssetClasses: [],
    timeHorizon: null,
    netWorthTarget: null,
    targetReturn: null,
    usingDemoData: false,
    isTutorialActive: false,
    tutorialStep: 0,
    showCurrencyPicker: false,
    checklistItems: {
        setCurrencies: false,
        chooseAssets: false,
        setGoals: false,
        addFirstHolding: false,
        recordFirstSnapshot: false,
        setTargets: false,
        exploreForecast: false,
        connectBank: false,
        importHistory: false,
        importBudget: false,
        customiseDashboard: false
    },
    checklistDismissed: false,
    sidebarDismissed: false,
    pageTutorials: {},
    // New fields from onboarding revamp
    onboardingGoal: null,
    onboardingExperience: null,
    showFirstVisitGreeting: false,
};

const PostFtueSchema = z.object({
    action: z.enum(['reset'])
});

const PatchFtueSchema = z.object({
    wizardCompleted: z.boolean().optional(),
    wizardStep: z.coerce.number().optional(),
    selectedAssetClasses: z.array(z.string()).optional(),
    timeHorizon: z.string().optional().nullable(),
    netWorthTarget: z.coerce.number().optional().nullable(),
    targetReturn: z.coerce.number().optional().nullable(),
    usingDemoData: z.boolean().optional(),
    isTutorialActive: z.boolean().optional(),
    tutorialStep: z.coerce.number().optional(),
    showCurrencyPicker: z.boolean().optional(),
    checklistItems: z.record(z.string(), z.boolean()).optional(),
    checklistDismissed: z.boolean().optional(),
    sidebarDismissed: z.boolean().optional(),
    pageTutorials: z.record(z.string(), z.boolean()).optional(),
    // New onboarding fields
    onboardingGoal: z.string().optional().nullable(),
    onboardingExperience: z.string().optional().nullable(),
    showFirstVisitGreeting: z.boolean().optional(),
}).passthrough();

// Auto-detect which checklist items are already completed based on real data
async function detectCompletedItems(userId: any) {
    const detected: Record<string, boolean> = {};

    try {
        // 1. setCurrencies — check if user has non-default currency preferences
        const currPrefs = await kvGet<Record<string, string>>('currency_preferences', null, userId);
        if (currPrefs && (currPrefs.primary || currPrefs.secondary)) {
            detected.setCurrencies = true;
        }

        // 2. chooseAssets — check if asset_classes KV has custom data
        const assetClasses = await kvGet('asset_classes', null, userId);
        if (assetClasses && Object.keys(assetClasses).length > 0) {
            detected.chooseAssets = true;
        }

        // 3. setGoals — check if forecast settings has yearlyGoals
        const forecastSettings = await kvGet<Record<string, unknown>>('forecast_settings', null, userId);
        if (forecastSettings && forecastSettings.yearlyGoals && Object.keys(forecastSettings.yearlyGoals).length > 0) {
            detected.setGoals = true;
        }

        // 4. addFirstHolding — check if user has any assets in the DB
        const assetCount = await query<{cnt: number}>('SELECT COUNT(*) as cnt FROM assets WHERE user_id = ?', [userId]);
        if (assetCount?.[0]?.cnt > 0) {
            detected.addFirstHolding = true;
        }

        // 5. recordFirstSnapshot — check snapshots table
        const snapshotCount = await query<{cnt: number}>('SELECT COUNT(*) as cnt FROM snapshots WHERE user_id = ?', [userId]);
        if (snapshotCount?.[0]?.cnt > 0) {
            detected.recordFirstSnapshot = true;
        }

        // 6. setTargets — check allocation targets
        const allocTargets = await kvGet<Record<string, unknown>>('allocation_targets', null, userId);
        if (allocTargets && (allocTargets.assetClasses || Object.keys(allocTargets).length > 0)) {
            detected.setTargets = true;
        }
    } catch (e) {
        console.error('Error detecting FTUE items:', e);
    }

    return detected;
}

export async function GET(): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const state = await kvGet(KEY, DEFAULT_STATE, user.id);

        // Auto-detect completed items from real data and merge
        const detected = await detectCompletedItems(user.id);
        const mergedItems: Record<string, boolean> = { ...(state?.checklistItems || {}) };
        for (const [key, val] of Object.entries(detected)) {
            if (val) (mergedItems as Record<string, boolean>)[key] = true;
        }

        return NextResponse.json({ ...state, checklistItems: mergedItems });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Error reading FTUE state:', error);
        return NextResponse.json(DEFAULT_STATE);
    }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const body: unknown = await request.json();
        const { data: updates, error } = validateBody<Record<string, any>>(PatchFtueSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        // Merge updates into current state
        const current = await kvGet(KEY, DEFAULT_STATE, user.id);
        const merged = {
            ...current,
            ...updates,
            checklistItems: {
                ...(current?.checklistItems || {}),
                ...((updates as Record<string, unknown>)?.checklistItems || {})
            }
        };

        await kvSet(KEY, merged, user.id);
        return NextResponse.json(merged);
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Error updating FTUE state:', error);
        return NextResponse.json({ error: 'Failed to update FTUE state' }, { status: 500 });
    }
}

// POST to reset FTUE (for settings page)
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireAuth();
        const body: unknown = await request.json();
        const { data, error } = validateBody(PostFtueSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        if (data!.action === 'reset') {
            await kvSet(KEY, DEFAULT_STATE, user.id);
            return NextResponse.json(DEFAULT_STATE);
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Error resetting FTUE:', error);
        return NextResponse.json({ error: 'Failed to reset FTUE' }, { status: 500 });
    }
}
