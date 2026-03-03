import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/kv';

const KEY = 'live_assets';

export async function GET() {
    const assets = await kvGet(KEY, []);
    return NextResponse.json(assets);
}

export async function POST(request) {
    try {
        const newAsset = await request.json();
        if (!newAsset.ticker) {
            return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
        }

        const assets = await kvGet(KEY, []);

        // Avoid duplicates
        if (assets.some(a => a.ticker === newAsset.ticker)) {
            return NextResponse.json({ error: 'Asset already exists' }, { status: 409 });
        }

        assets.push(newAsset);
        await kvSet(KEY, assets);

        return NextResponse.json(newAsset);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to add asset' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const ticker = searchParams.get('ticker');

        if (!ticker) {
            return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
        }

        let assets = await kvGet(KEY, []);
        assets = assets.filter(a => a.ticker !== ticker);
        await kvSet(KEY, assets);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
    }
}
