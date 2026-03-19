import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limiting in middleware for all API routes
// Note: Upstash works in Edge Runtime
export async function middleware(request: NextRequest) {
    // Only rate-limit API routes
    if (!request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.next();
    }

    // Skip rate limiting in development
    if (!process.env.UPSTASH_REDIS_REST_URL) {
        return NextResponse.next();
    }

    const { Ratelimit } = await import('@upstash/ratelimit');
    const { Redis } = await import('@upstash/redis');

    const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    // Determine tier based on path
    let limit = 60;
    let prefix = 'rl:standard';
    const path = request.nextUrl.pathname;

    if (path.includes('/auth/')) {
        limit = 10;
        prefix = 'rl:auth';
    } else if (path.includes('/market-data') || path.includes('/pension-prices') || path.includes('/fx-rates')) {
        limit = 30;
        prefix = 'rl:market';
    } else if (path.includes('/import')) {
        limit = 5;
        prefix = 'rl:import';
    }

    const ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, '1 m'),
        prefix,
    });

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'anonymous';

    const { success, limit: maxLimit, remaining, reset } = await ratelimit.limit(ip);

    if (!success) {
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            {
                status: 429,
                headers: {
                    'X-RateLimit-Limit': maxLimit.toString(),
                    'X-RateLimit-Remaining': remaining.toString(),
                    'X-RateLimit-Reset': reset.toString(),
                },
            }
        );
    }

    // Add rate limit headers to successful responses
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', maxLimit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    return response;
}

export const config = {
    matcher: '/api/:path*',
};
