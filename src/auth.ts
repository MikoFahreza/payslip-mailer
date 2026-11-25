import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users, type UserRole } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { normalizeEmail } from "@/lib/utils";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers: [
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = normalizeEmail(String(credentials.email));
        const password = String(credentials.password);

        const url = process.env.DATABASE_URL;
        if (!url || url.includes("ep-sample-pooler")) {
          return null;
        }

        try {
          const user = await db.query.users.findFirst({
            where: eq(users.email, email),
          });

          if (!user || !user.passwordHash) {
            return null;
          }

          const isValid = await bcrypt.compare(password, user.passwordHash);
          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
          };
        } catch (err) {
          console.error("[Auth] Error during credentials authorize:", err);
          return null;
        }
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
        console.error("[Auth] Login gagal: akun tidak memiliki alamat email.");
        return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.id = user.id;
        token.role = user.role || "user";
      }

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
              token.role = dbUser.role;
            } else {
              // User was removed from database -> revoke active session token
              token.userId = "";
              token.id = "";
              token.role = undefined;
            }
          } catch (dbErr) {
            console.warn("[Auth Warning] Gagal query user saat jwt callback:", dbErr);
          }
        }
      }

      if (!token.userId && token.id) {
        token.userId = token.id as string;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token) {
        session.user.id = (token.userId || token.id || "") as string;
        session.user.email = (token.email as string) || session.user.email;
        session.user.name = (token.name as string) || session.user.name;
        session.user.image = (token.picture as string) || session.user.image;
        session.user.role = (token.role as UserRole) || "user";
      }
      return session;
    },
  },
});
