import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    const checks: Record<string, string> = {};

    // Check AUTH_SECRET
    checks.AUTH_SECRET = process.env.AUTH_SECRET ? '✅ Set' : '❌ Missing';
    checks.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing';
    checks.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing';
    checks.TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL ? '✅ Set' : '❌ Missing';
    checks.TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN ? '✅ Set' : '❌ Missing';
    checks.NEXTAUTH_URL = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'Not set (auto-detect)';

    // Test DB connectivity
    try {
        const result = await query<{ cnt: number }>('SELECT COUNT(*) as cnt FROM users');
        checks.DB_CONNECTION = `✅ Connected (${result[0]?.cnt ?? '?'} users)`;
    } catch (e) {
        checks.DB_CONNECTION = `❌ Failed: ${e instanceof Error ? e.message : String(e)}`;
    }

    // Test migrations table
    try {
        const result = await query<{ v: number }>('SELECT MAX(version) as v FROM _migrations');
        checks.MIGRATIONS = `✅ Version ${result[0]?.v ?? 'unknown'}`;
    } catch (e) {
        checks.MIGRATIONS = `❌ Failed: ${e instanceof Error ? e.message : String(e)}`;
    }

    return NextResponse.json(checks, { status: 200 });
}
