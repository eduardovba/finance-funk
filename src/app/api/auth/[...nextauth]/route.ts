import { handlers } from "@/auth";
import { NextRequest } from "next/server";

// Wrap the GET handler to log response cookies
export async function GET(req: NextRequest) {
    console.log("[AUTH ROUTE] GET request intercepted:", req.nextUrl.pathname);
    try {
        const response = await handlers.GET(req);
        console.log("[AUTH ROUTE] Response status:", response.status);
        console.log("[AUTH ROUTE] Response headers:");
        response.headers.forEach((value, key) => {
            if (key.toLowerCase() === 'set-cookie' || key.toLowerCase() === 'location') {
                // Truncate cookie values for readability but show the name
                const truncated = value.length > 200
                    ? value.substring(0, 100) + '...[TRUNCATED]...' + value.substring(value.length - 50)
                    : value;
                console.log(`[AUTH ROUTE]   ${key}: ${truncated}`);
            }
        });
        // Specifically check for session token cookie
        const setCookies = response.headers.getSetCookie?.() || [];
        console.log("[AUTH ROUTE] Number of Set-Cookie headers:", setCookies.length);
        setCookies.forEach((cookie, i) => {
            const name = cookie.split('=')[0];
            console.log(`[AUTH ROUTE] Cookie ${i}: name=${name}, length=${cookie.length}`);
        });
        return response;
    } catch (error) {
        console.error("[AUTH ROUTE] Handler threw:", error);
        throw error;
    }
}

export const { POST } = handlers;
