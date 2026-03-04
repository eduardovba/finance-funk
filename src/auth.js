import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { findUserByEmail, verifyPassword, findOrCreateOAuthUser, updateUserAvatar, getUserById } from "@/lib/users";

export const { handlers, signIn, signOut, auth } = NextAuth({
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

                const user = await findUserByEmail(credentials.email);
                if (!user || !user.password_hash) {
                    return null;
                }

                const isValid = await verifyPassword(credentials.password, user.password_hash);
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
            // For OAuth providers, find or create the user in our DB
            if (account?.provider === "google") {
                try {
                    const dbUser = await findOrCreateOAuthUser({
                        name: user.name,
                        email: user.email,
                        provider: "google",
                    });
                    user.id = String(dbUser.id);
                    // Persist Google avatar to our DB
                    if (user.image) {
                        await updateUserAvatar(dbUser.id, user.image);
                    }
                } catch (error) {
                    console.error("Error creating OAuth user:", error);
                    return false;
                }
            }
            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.picture = user.image || null;
            }
            // Refresh avatar from DB on every token refresh
            if (token.id && !token.picture) {
                try {
                    const dbUser = await getUserById(token.id);
                    if (dbUser?.avatar_url) token.picture = dbUser.avatar_url;
                } catch (e) { /* ignore */ }
            }
            return token;
        },
        async session({ session, token }) {
            if (token?.id) {
                session.user.id = token.id;
            }
            if (token?.picture) {
                session.user.image = token.picture;
            }
            return session;
        },
    },
});
