import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const checks: Record<string, string> = {};

    checks.AUTH_SECRET = process.env.AUTH_SECRET ? 'Set' : 'MISSING';
    checks.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ? 'Set' : 'MISSING';
    checks.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'MISSING';
    checks.TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL ? 'Set' : 'MISSING';
    checks.TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN ? 'Set' : 'MISSING';
    checks.AUTH_URL = process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'not-set';
    checks.VERCEL_URL = process.env.VERCEL_URL || 'not-set';
    checks.NODE_ENV = process.env.NODE_ENV || 'not-set';

    // Test DB connectivity without import chain
    try {
        const { createClient } = await import('@libsql/client');
        const client = createClient({
            url: process.env.TURSO_DATABASE_URL!,
            authToken: process.env.TURSO_AUTH_TOKEN,
        });
        const result = await client.execute('SELECT COUNT(*) as cnt FROM users');
        checks.DB_CONNECTION = `OK (${result.rows[0]?.cnt} users)`;
    } catch (e) {
        checks.DB_CONNECTION = `FAILED: ${e instanceof Error ? e.message : String(e)}`;
    }

    return NextResponse.json(checks);
}
