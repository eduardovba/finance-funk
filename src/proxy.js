import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default async function proxy(request) {
    const { pathname } = request.nextUrl;

    // Public routes that don't require authentication
    const publicRoutes = ["/login", "/register"];
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
    const isAuthRoute = pathname.startsWith("/api/auth");

    // Allow public routes and auth API routes
    if (isPublicRoute || isAuthRoute) {
        return NextResponse.next();
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

    return NextResponse.next();
}

export const config = {
    matcher: [
        // Match all routes except static files and Next.js internals
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
