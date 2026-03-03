import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/kv';

const KEY = 'forecast_settings';
const DEFAULTS = {
    monthlyContribution: 12000,
    annualInterestRate: 10,
    portfolioGoalDec26: 3000000,
    portfolioGoalDec31: 10000000
};

export async function GET() {
    try {
        const settings = await kvGet(KEY, DEFAULTS);
        return NextResponse.json(settings);
    } catch (error) {
        console.error('Error reading forecast settings:', error);
        return NextResponse.json(DEFAULTS);
    }
}

export async function POST(request) {
    try {
        const settings = await request.json();
        await kvSet(KEY, settings);
        return NextResponse.json({ success: true, settings });
    } catch (error) {
        console.error('Error saving forecast settings:', error);
        return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
    }
}
