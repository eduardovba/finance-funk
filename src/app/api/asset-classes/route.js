import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/kv';

const KEY = 'asset_classes';

export async function GET() {
    try {
        const data = await kvGet(KEY, {});
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error reading asset classes data:', error);
        return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        await kvSet(KEY, body);
        return NextResponse.json({ success: true, data: body });
    } catch (error) {
        console.error('Error saving asset classes data:', error);
        return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
    }
}
