import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/kv';
import { requireAuth } from '@/lib/authGuard';
import { z } from 'zod';
import { validateBody } from '@/lib/validation';

const KEY = 'forecast_settings';
const DEFAULTS = {
    monthlyContribution: 12000,
    annualInterestRate: 10,
    portfolioGoalDec26: 3000000,
    portfolioGoalDec31: 10000000
};

const PostForecastSettingsSchema = z.object({
    monthlyContribution: z.coerce.number().optional(),
    annualInterestRate: z.coerce.number().optional(),
    portfolioGoalDec26: z.coerce.number().optional(),
    portfolioGoalDec31: z.coerce.number().optional()
}).passthrough();

export async function GET() {
    try {
        const user = await requireAuth();
        const settings = await kvGet(KEY, DEFAULTS, user.id);
        return NextResponse.json(settings);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('Error reading forecast settings:', error);
        return NextResponse.json(DEFAULTS);
    }
}

export async function POST(request) {
    try {
        const user = await requireAuth();
        const body = await request.json();
        const { data: incoming, error } = validateBody(PostForecastSettingsSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        // Merge with existing settings so partial updates don't wipe other fields
        const existing = await kvGet(KEY, DEFAULTS, user.id);
        const merged = { ...existing, ...incoming };
        await kvSet(KEY, merged, user.id);
        return NextResponse.json({ success: true, settings: merged });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('Error saving forecast settings:', error);
        return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
    }
}
