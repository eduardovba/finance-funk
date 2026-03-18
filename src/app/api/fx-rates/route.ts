
import { NextResponse } from 'next/server';
import { kvGet } from '@/lib/kv';

export async function GET(): Promise<NextResponse> {
    try {
        const data = await kvGet('fx_rates', {});
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to load FX rates' }, { status: 500 });
    }
}
