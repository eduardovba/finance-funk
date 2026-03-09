import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/kv';
import { requireAuth } from '@/lib/authGuard';

const KEY = 'allocation_targets';

// New schema: separating asset targets and currency targets
const DEFAULTS = {
    assetClasses: {
        Equity: 50,
        FixedIncome: 30,
        RealEstate: 15,
        Crypto: 5,
        Cash: 0
    },
    currencies: {
        GBP: 50,
        BRL: 40,
        USD: 10
    }
};

export async function GET() {
    try {
        const user = await requireAuth();
        let data = await kvGet(KEY, DEFAULTS, user.id);

        // Migration from old flat schema to new nested schema
        if (data && typeof data === 'object' && !data.assetClasses && !data.currencies) {
            data = {
                assetClasses: { ...DEFAULTS.assetClasses, ...data }, // Keep their old custom asset targets
                currencies: { ...DEFAULTS.currencies } // Use default currencies
            };
            // Silently upgrade in background
            await kvSet(KEY, data, user.id).catch(() => { });
        }

        return NextResponse.json(data);
    } catch (error) {
        if (error instanceof Response) return error;
        return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const user = await requireAuth();
        const data = await request.json();
        await kvSet(KEY, data, user.id);
        return NextResponse.json({ success: true, data });
    } catch (error) {
        if (error instanceof Response) return error;
        return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
    }
}
