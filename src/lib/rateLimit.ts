import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Use environment variables for Upstash Redis
// Falls back to a no-op in development if env vars aren't set
const redis = process.env.UPSTASH_REDIS_REST_URL
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    : null;

// Different rate limits for different route types
export const rateLimiters = {
    // Standard API routes: 60 requests per minute
    standard: redis ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, '1 m'),
        analytics: true,
        prefix: 'ratelimit:standard',
    }) : null,

    // Auth routes (login, register): 10 requests per minute (brute force protection)
    auth: redis ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1 m'),
        analytics: true,
        prefix: 'ratelimit:auth',
    }) : null,

    // Market data routes: 30 requests per minute (expensive external API calls)
    marketData: redis ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, '1 m'),
        analytics: true,
        prefix: 'ratelimit:market',
    }) : null,

    // Import routes: 5 requests per minute (heavy processing)
    import: redis ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '1 m'),
        analytics: true,
        prefix: 'ratelimit:import',
    }) : null,
};

export type RateLimitTier = keyof typeof rateLimiters;

/**
 * Apply rate limiting to a request.
 * Returns null if allowed, or a 429 Response if rate limited.
 * In development (no Redis), always allows.
 */
export async function applyRateLimit(
    request: NextRequest,
    tier: RateLimitTier = 'standard'
): Promise<NextResponse | null> {
    const limiter = rateLimiters[tier];
    if (!limiter) return null; // No Redis configured (dev mode) — allow all

    // Use user IP as the rate limit key, fall back to 'anonymous'
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'anonymous';

    const { success, limit, reset, remaining } = await limiter.limit(ip);

    if (!success) {
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            {
                status: 429,
                headers: {
                    'X-RateLimit-Limit': limit.toString(),
                    'X-RateLimit-Remaining': remaining.toString(),
                    'X-RateLimit-Reset': reset.toString(),
                    'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
                },
            }
        );
    }

    return null; // Allowed
}
