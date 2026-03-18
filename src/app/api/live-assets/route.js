import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/kv';
import { requireAuth } from '@/lib/authGuard';
import { z } from 'zod';
import { validateBody } from '@/lib/validation';

const KEY = 'live_assets';

const PostLiveAssetSchema = z.object({
    ticker: z.string().min(1, 'Ticker is required'),
    name: z.string().optional(),
    assetClass: z.string().optional(),
    broker: z.string().optional(),
    currency: z.string().optional()
}).passthrough();

export async function GET() {
    try {
        const user = await requireAuth();
        const assets = await kvGet(KEY, [], user.id);
        return NextResponse.json(assets);
    } catch (error) {
        if (error instanceof Response) return error;
        return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const user = await requireAuth();
        const body = await request.json();
        const { data: newAsset, error } = validateBody(PostLiveAssetSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        const assets = await kvGet(KEY, [], user.id);

        // Avoid duplicates
        if (assets.some(a => a.ticker === newAsset.ticker)) {
            return NextResponse.json({ error: 'Asset already exists' }, { status: 409 });
        }

        assets.push(newAsset);
        await kvSet(KEY, assets, user.id);

        return NextResponse.json(newAsset);
    } catch (error) {
        if (error instanceof Response) return error;
        return NextResponse.json({ error: 'Failed to add asset' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const user = await requireAuth();
        const { searchParams } = new URL(request.url);
        const ticker = searchParams.get('ticker');

        if (!ticker) {
            return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
        }

        let assets = await kvGet(KEY, [], user.id);
        assets = assets.filter(a => a.ticker !== ticker);
        await kvSet(KEY, assets, user.id);

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Response) return error;
        return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
    }
}
