import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({
        message: 'Health check OK',
        timestamp: new Date().toISOString(),
        AUTH_SECRET: process.env.AUTH_SECRET ? 'SET' : 'MISSING',
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'MISSING',
        TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ? 'SET' : 'MISSING',
        TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ? 'SET' : 'MISSING',
        AUTH_URL: process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'not-set',
        NODE_ENV: process.env.NODE_ENV || 'not-set',
    });
}
