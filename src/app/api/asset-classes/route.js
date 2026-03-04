import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/kv';
import { requireAuth } from '@/lib/authGuard';

const KEY = 'asset_classes';

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
        await kvSet(KEY, body, user.id);
        return NextResponse.json({ success: true, data: body });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('Error saving asset classes data:', error);
        return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
    }
}
