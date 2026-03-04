import { auth } from "@/auth";

/**
 * Require an authenticated session. Returns the user object { id, name, email }.
 * Throws a 401 Response if the user is not authenticated.
 */
export async function requireAuth() {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }
    return session.user;
}
