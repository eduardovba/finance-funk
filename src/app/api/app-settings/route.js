import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/kv';
import { requireAuth } from '@/lib/authGuard';
import { z } from 'zod';
import { validateBody } from '@/lib/validation';

const KEY = 'app_settings';
const DEFAULTS = { autoMonthlyCloseEnabled: true, backgroundSelection: 'frosted-glass' };

const PostAppSettingsSchema = z.object({
    autoMonthlyCloseEnabled: z.boolean().optional(),
    backgroundSelection: z.string().optional()
}).passthrough();

export async function GET() {
    try {
        const user = await requireAuth();
        const settings = await kvGet(KEY, DEFAULTS, user.id);
        return NextResponse.json(settings);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('Error reading app settings:', error);
        return NextResponse.json(DEFAULTS);
    }
}

export async function POST(request) {
    try {
        const user = await requireAuth();
        const body = await request.json();
        const { data: settings, error } = validateBody(PostAppSettingsSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        await kvSet(KEY, settings, user.id);
        return NextResponse.json({ success: true, settings });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('Error saving app settings:', error);
        return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
    }
}
