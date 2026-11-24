import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { normalizeEmail } from "@/lib/utils";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile",
          prompt: "select_account",
        },
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
    async signIn({ user }) {
      if (!user.email) {
        console.error("[Auth] Login Google gagal: akun Google tidak memiliki alamat email.");
        return false;
      }

      const email = normalizeEmail(user.email);
      const name = user.name || null;
      const image = user.image || null;

      const url = process.env.DATABASE_URL;
      if (!url || url.includes("ep-sample-pooler")) {
        // If testing without a live database, allow sign in to proceed
        return true;
      }

      try {
        await db
          .insert(users)
          .values({
            email,
            name,
            image,
          })
          .onConflictDoUpdate({
            target: [users.email],
            set: {
              ...(name ? { name } : {}),
              ...(image ? { image } : {}),
            },
          });
        return true;
      } catch (error) {
        console.error("[Auth] Gagal upsert user saat login:", error);
        return false;
      }
    },
    async jwt({ token, user }) {
      const rawEmail = (user?.email || token.email) as string | undefined;
      if (rawEmail) {
        const email = normalizeEmail(rawEmail);
        token.email = email;

        const url = process.env.DATABASE_URL;
        if (url && !url.includes("ep-sample-pooler")) {
          try {
            const dbUser = await db.query.users.findFirst({
              where: eq(users.email, email),
            });
            if (dbUser) {
              token.userId = dbUser.id;
              token.id = dbUser.id;
              token.name = dbUser.name ?? token.name;
              token.picture = dbUser.image ?? token.picture;
            }
          } catch (dbErr) {
            console.warn("[Auth Warning] Gagal query user saat jwt callback:", dbErr);
          }
        }
      }

      // Fallback ID if database lookup is skipped (e.g. test environments)
      if (!token.userId && token.id) {
        token.userId = token.id as string;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token) {
        session.user.id = (token.userId || token.id || token.sub) as string;
        session.user.email = (token.email as string) || session.user.email;
        session.user.name = (token.name as string) || session.user.name;
        session.user.image = (token.picture as string) || session.user.image;
      }
      return session;
    },
  },
});
