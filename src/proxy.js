import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default async function proxy(request) {
    const { pathname } = request.nextUrl;

    // Public routes that don't require authentication
    const publicRoutes = ["/login", "/register"];
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
                token: process.env.UPSTASH_REDIS_REST_TOKEN,
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

    // Check session
    const session = await auth();

    if (!session) {
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

    // Add rate limit headers to successful responses
    const response = NextResponse.next();
    return response;
}

export const config = {
    matcher: [
        // Match all routes except static files and Next.js internals
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
