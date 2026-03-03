import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/kv';

const KEY = 'app_settings';
const DEFAULTS = { autoMonthlyCloseEnabled: true };

export async function GET() {
    try {
        const settings = await kvGet(KEY, DEFAULTS);
        return NextResponse.json(settings);
    } catch (error) {
        console.error('Error reading app settings:', error);
        return NextResponse.json(DEFAULTS);
    }
}

export async function POST(request) {
    try {
        const settings = await request.json();
        await kvSet(KEY, settings);
        return NextResponse.json({ success: true, settings });
    } catch (error) {
        console.error('Error saving app settings:', error);
        return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
    }
}
