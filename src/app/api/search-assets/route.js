import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ results: [] });
    }

    try {
        // Use Yahoo Finance Autocomplete API
        const response = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch from Yahoo Finance');
        }

        const data = await response.json();
        const quotes = data.quotes || [];

        // Transform data for our frontend
        const results = quotes.map(q => ({
            symbol: q.symbol,
            name: q.shortname || q.longname,
            type: q.quoteType,
            exchange: q.exchDisp,
            // Helper to identify likely Google Finance format
            googleTicker: mapToGoogleTicker(q)
        }));

        return NextResponse.json({ results });
    } catch (error) {
        console.error('Search API Error:', error);
        return NextResponse.json({ error: 'Failed to search assets' }, { status: 500 });
    }
}

function mapToGoogleTicker(quote) {
    // Basic mapping heuristic
    if (quote.quoteType === 'CRYPTOCURRENCY') {
        return quote.symbol.endsWith('-USD') ? quote.symbol : `${quote.symbol}-USD`;
    }
    if (quote.symbol.endsWith('.SA')) return quote.symbol; // Our scraper handles .SA -> :BVMF
    if (quote.exchDisp === 'London') return `${quote.symbol}:LON`; // Google often uses :LON or similar
    return quote.symbol; // Default to symbol for US stocks
}
