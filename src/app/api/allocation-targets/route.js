import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/kv';

const KEY = 'allocation_targets';
const DEFAULTS = {
    Equity: 50,
    FixedIncome: 30,
    RealEstate: 15,
    Crypto: 5
};

export async function GET() {
    try {
        const data = await kvGet(KEY, DEFAULTS);
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const data = await request.json();
        await kvSet(KEY, data);
        return NextResponse.json({ success: true, data });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
    }
}
