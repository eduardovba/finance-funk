import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/kv';
import { requireAuth } from '@/lib/authGuard';

const KEY = 'forecast_settings';
const DEFAULTS = {
    monthlyContribution: 12000,
    annualInterestRate: 10,
    portfolioGoalDec26: 3000000,
    portfolioGoalDec31: 10000000
};

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
        const incoming = await request.json();
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
