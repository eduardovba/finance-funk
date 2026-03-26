import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public routes that don't require authentication
    const publicRoutes = ["/login", "/register", "/onboarding", "/demo"];
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
    const isAuthRoute = pathname.startsWith("/api/auth");

    // PWA static assets that must be served without auth
    const pwaAssets = ["/manifest.json", "/sw.js", "/offline.html", "/logos/FF Star.png", "/logos/FF Star Favcon.png"];
    const isPwaAsset = pwaAssets.includes(pathname);

    // Allow public routes, auth API routes, and PWA assets
    if (isPublicRoute || isAuthRoute || isPwaAsset) {
        return NextResponse.next();
    }

    // ─── Rate Limiting (API routes only) ───
    if (pathname.startsWith("/api/") && process.env.UPSTASH_REDIS_REST_URL) {
        try {
            const { Ratelimit } = await import("@upstash/ratelimit");
            const { Redis } = await import("@upstash/redis");

            const redis = new Redis({
                url: process.env.UPSTASH_REDIS_REST_URL,
                token: process.env.UPSTASH_REDIS_REST_TOKEN!,
            });

            // Determine tier based on path
            let limit = 60;
            let prefix = "rl:standard";

            if (pathname.includes("/auth/")) {
                limit = 10;
                prefix = "rl:auth";
            } else if (pathname.includes("/market-data") || pathname.includes("/pension-prices") || pathname.includes("/fx-rates")) {
                limit = 30;
                prefix = "rl:market";
            } else if (pathname.includes("/import")) {
                limit = 5;
                prefix = "rl:import";
            }

            const ratelimit = new Ratelimit({
                redis,
                limiter: Ratelimit.slidingWindow(limit, "1 m"),
                prefix,
            });

            const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
                || request.headers.get("x-real-ip")
                || "anonymous";

            const { success, limit: maxLimit, remaining, reset } = await ratelimit.limit(ip);

            if (!success) {
                return NextResponse.json(
                    { error: "Too many requests. Please try again later." },
                    {
                        status: 429,
                        headers: {
                            "X-RateLimit-Limit": maxLimit.toString(),
                            "X-RateLimit-Remaining": remaining.toString(),
                            "X-RateLimit-Reset": reset.toString(),
                        },
                    }
                );
            }
        } catch (e) {
            // If rate limiting fails, allow the request through
            console.error("Rate limiting error:", e);
        }
    }

    // Check session using Edge-compatible JWT token verification
    // (avoids importing the full auth config which pulls in Node.js-only DB modules)
    const token = await getToken({
        req: request,
        secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
        // For API routes, return 401 JSON response
        if (pathname.startsWith("/api/")) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // For page requests, redirect to login
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        // Match all routes except static files and Next.js internals
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
