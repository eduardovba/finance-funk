import { auth } from "@/auth";
import type { SessionUser } from "@/types";

/**
 * Require an authenticated session. Returns the user object { id, name, email }.
 * Throws a 401 Response if the user is not authenticated.
 */
export async function requireAuth(): Promise<SessionUser> {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }
    return session.user as SessionUser;
}

/**
 * Require an admin session. Returns the user object.
 * Throws 401 if not authenticated, 403 if not an admin.
 */
export async function requireAdmin(): Promise<SessionUser> {
    const user = await requireAuth();
    if (!user.is_admin) {
        throw new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
        });
    }
    return user;
}

/**
 * Require the super-admin (ADMIN_EMAIL). Returns the user object.
 * Only the super-admin can promote/demote other admins.
 */
export async function requireSuperAdmin(): Promise<SessionUser> {
    const user = await requireAdmin();
    const superAdminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    if (user.email?.toLowerCase() !== superAdminEmail) {
        throw new Response(JSON.stringify({ error: "Forbidden: super-admin only" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
        });
    }
    return user;
}
