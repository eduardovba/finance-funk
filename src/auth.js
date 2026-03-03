import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { findUserByEmail, verifyPassword, findOrCreateOAuthUser } from "@/lib/users";

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
            }
            return token;
        },
        async session({ session, token }) {
            if (token?.id) {
                session.user.id = token.id;
            }
            return session;
        },
    },
});
