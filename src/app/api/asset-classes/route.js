import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/kv';
import { requireAuth } from '@/lib/authGuard';
import { z } from 'zod';
import { validateBody } from '@/lib/validation';

const KEY = 'asset_classes';

const PostAssetClassesSchema = z.record(z.string(), z.any());

export async function GET() {
    try {
        const user = await requireAuth();
        const data = await kvGet(KEY, {}, user.id);
        return NextResponse.json(data);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('Error reading asset classes data:', error);
        return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const user = await requireAuth();
        const body = await request.json();
        const { data, error } = validateBody(PostAssetClassesSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        await kvSet(KEY, data, user.id);
        return NextResponse.json({ success: true, data });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('Error saving asset classes data:', error);
        return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
    }
}
