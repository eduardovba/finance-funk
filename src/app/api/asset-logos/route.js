import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

// Detect market from ticker suffix
function detectMarket(ticker) {
    if (!ticker) return 'us';
    if (ticker.endsWith('.SA')) return 'br';
    if (ticker.endsWith('.L')) return 'uk';
    return 'us';
}

// Generate a deterministic color from a ticker string
function tickerColor(ticker) {
    let hash = 0;
    for (let i = 0; i < ticker.length; i++) hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 55%, 45%)`;
}

// --- Logo fetch sources ---

// Parqet: free, no API key, works for US/UK/EU tickers
async function fetchParqetLogo(ticker) {
    try {
        const cleanTicker = ticker.replace('.SA', '').replace('.L', '');
        const url = `https://assets.parqet.com/logos/symbol/${cleanTicker}`;
        const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(4000) });
        if (res.ok) {
            const ct = res.headers.get('content-type') || '';
            // Verify we actually got an image, not an error page
            if (ct.startsWith('image/')) return url;
        }
        return null;
    } catch { return null; }
}

// brapi.dev: free, for Brazilian stocks (.SA tickers)
async function fetchBrapiLogo(ticker) {
    try {
        const cleanTicker = ticker.replace('.SA', '');
        const brapiToken = process.env.BRAPI_TOKEN || 'demo';
        const res = await fetch(`https://brapi.dev/api/quote/${cleanTicker}?token=${brapiToken}`, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return null;
        const data = await res.json();
        const url = data?.results?.[0]?.logourl;
        return url || null;
    } catch { return null; }
}

// FMP: needs API key, used as optional premium source
async function fetchFmpLogo(ticker) {
    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) return null;
    try {
        const url = `https://financialmodelingprep.com/stable/profile?symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return null;
        const data = await res.json();
        return data?.[0]?.image || null;
    } catch { return null; }
}

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const ticker = searchParams.get('ticker');
    const name = searchParams.get('name') || ticker || '?';

    if (!ticker) {
        return NextResponse.json({ logo_url: null, fallback: true, color: '#666', initial: '?' });
    }

    let db;
    try {
        db = await getDB();
    } catch (err) {
        console.error("DB init failed:", err);
    }

    // 1. Check cache first
    try {
        if (db) {
            const cached = await db.execute({ sql: 'SELECT logo_url, source FROM asset_logos WHERE ticker = ?', args: [ticker] });
            if (cached.rows.length > 0 && cached.rows[0].logo_url) {
                return NextResponse.json({ logo_url: cached.rows[0].logo_url, source: cached.rows[0].source, cached: true });
            }
        }
    } catch { /* table might not exist yet */ }

    // 2. Fetch from tiered sources: FMP → Parqet → brapi
    let logoUrl = null;
    let source = null;

    // 1st: FMP (highest quality, paid)
    logoUrl = await fetchFmpLogo(ticker);
    if (logoUrl) source = 'fmp';

    // 2nd: Parqet (free, broad coverage)
    if (!logoUrl) {
        logoUrl = await fetchParqetLogo(ticker);
        if (logoUrl) source = 'parqet';
    }

    // 3rd: brapi (Brazilian stocks fallback)
    if (!logoUrl) {
        logoUrl = await fetchBrapiLogo(ticker);
        if (logoUrl) source = 'brapi';
    }

    // 3. Cache the result if found
    if (logoUrl) {
        if (db) {
            try {
                await db.execute({
                    sql: 'INSERT OR REPLACE INTO asset_logos (ticker, logo_url, source) VALUES (?, ?, ?)',
                    args: [ticker, logoUrl, source]
                });
            } catch { /* ignore cache errors */ }
        }

        return NextResponse.json({ logo_url: logoUrl, source });
    }

    // 4. No logo found — return fallback data
    const initial = (name || ticker || '?').charAt(0).toUpperCase();
    const color = tickerColor(ticker);

    return NextResponse.json({ logo_url: null, fallback: true, initial, color });
}
