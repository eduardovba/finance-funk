import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { findUserByEmail, verifyPassword, findOrCreateOAuthUser, updateUserAvatar, getUserById } from "@/lib/users";
import type { User } from "@/types";

export const { handlers, signIn, signOut, auth } = NextAuth({
    trustHost: true,
    debug: true,
    logger: {
        error(code, ...message) { console.error(`[AUTH ERROR] ${code}:`, ...message); },
        warn(code) { console.warn(`[AUTH WARN] ${code}`); },
        debug(code, ...message) { console.log(`[AUTH DEBUG] ${code}:`, ...message); },
    },
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
        Credentials({
            name: "Email & Password",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const user = await findUserByEmail(credentials.email as string);
                if (!user || !user.password_hash) {
                    return null;
                }

                const isValid = await verifyPassword(credentials.password as string, user.password_hash);
                if (!isValid) {
                    return null;
                }

                return {
                    id: String(user.id),
                    name: user.name,
                    email: user.email,
                };
            },
        }),
    ],
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async signIn({ user, account }) {
            console.log("[AUTH] signIn callback START", { provider: account?.provider, userId: user.id, email: user.email });
            // For OAuth providers, find or create the user in our DB
            if (account?.provider === "google") {
                try {
                    const dbUser = await findOrCreateOAuthUser({
                        name: user.name || "",
                        email: user.email || "",
                        provider: "google",
                    });
                    // Block soft-deleted users
                    if ((dbUser as User).deleted_at) {
                        console.log("[AUTH] signIn: user is soft-deleted, blocking");
                        return false;
                    }
                    user.id = String(dbUser.id);
                    console.log("[AUTH] signIn: mapped to DB user id", user.id);
                    // Persist Google avatar to our DB
                    if (user.image) {
                        await updateUserAvatar(dbUser.id, user.image);
                    }
                } catch (error) {
                    console.error("[AUTH] Error in signIn callback:", error);
                    console.error("[AUTH] Stack:", error instanceof Error ? error.stack : 'no stack');
                    return false;
                }
            }
            // For credentials, block soft-deleted users
            if (account?.provider === "credentials") {
                try {
                    const dbUser = await getUserById(user.id as string);
                    if ((dbUser as User)?.deleted_at) return false;
                } catch (_e) { /* allow sign in if check fails */ }
            }
            console.log("[AUTH] signIn returning TRUE");
            return true;
        },
        async jwt({ token, user, trigger }) {
            console.log("[AUTH] jwt callback START", { trigger, hasUser: !!user, tokenSub: token?.sub, tokenId: token?.id });
            if (user) {
                token.id = user.id;
                token.picture = user.image || null;
                console.log("[AUTH] jwt: set token.id =", token.id);
            }
            // Refresh avatar + admin flag from DB
            if (token.id) {
                try {
                    const dbUser = await getUserById(token.id as string);
                    if (dbUser?.avatar_url) token.picture = dbUser.avatar_url;
                    token.is_admin = !!dbUser?.is_admin;
                    console.log("[AUTH] jwt: refreshed from DB, is_admin=", token.is_admin);
                } catch (e) {
                    console.error("[AUTH] jwt: getUserById failed:", e);
                }
            }
            console.log("[AUTH] jwt returning token with id=", token.id);
            return token;
        },
        async session({ session, token }) {
            console.log("[AUTH] session callback START", { tokenId: token?.id });
            if (token?.id) {
                // @ts-expect-error — NextAuth v5 beta session.user type doesn't include custom id field
                session.user.id = token.id;
            }
            if (token?.picture) {
                session.user.image = token.picture as string;
            }
            // @ts-expect-error — NextAuth v5 beta session.user type doesn't include is_admin
            session.user.is_admin = !!token?.is_admin;
            console.log("[AUTH] session returning with user.id=", session.user?.id);
            return session;
        },
    },
});
