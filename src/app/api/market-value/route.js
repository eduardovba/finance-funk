import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const url = 'https://themovemarket.com/tools/propertyprices/flat-307-ink-court-419-wick-lane-london-e3-2pw';
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-GB,en;q=0.9,en-US;q=0.8',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Referer': 'https://themovemarket.com/',
                'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand)";v="24", "Google Chrome";v="122"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"macOS"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
        }

        const html = await response.text();

        // Regex to find the price inside the element with id="offer-widg-val"
        // Format expected: <span id="offer-widg-val">618,000</span>
        const match = html.match(/id="offer-widg-val"[^>]*>([\d,]+)</);

        if (match && match[1]) {
            const price = parseInt(match[1].replace(/,/g, ''), 10);
            return NextResponse.json({ price });
        }

        return NextResponse.json({
            error: 'Price not found in page source',
            debug: html.substring(0, 500) // For debugging if it fails
        }, { status: 404 });
    } catch (error) {
        console.error('Market value API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
