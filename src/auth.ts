import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { checkRateLimit, recordFailedAttempt, resetAttempts } from "@/lib/auth/rate-limiter";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Admin Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);

        // Rate limit: 5 attempts per 15 minutes per email identifier
        const rateLimitKey = `login:${email}`;
        const limit = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);
        if (!limit.allowed) {
          console.warn(`[Security] Percobaan login melampaui batas untuk: ${email}`);
          throw new Error("TOO_MANY_REQUESTS");
        }

        const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
        const adminHash = process.env.ADMIN_PASSWORD_HASH?.trim();

        if (!adminEmail || !adminHash) {
          console.error("[Auth] ADMIN_EMAIL atau ADMIN_PASSWORD_HASH belum dikonfigurasi.");
          return null;
        }

        if (email !== adminEmail) {
          recordFailedAttempt(rateLimitKey);
          return null;
        }

        const isValid = await bcrypt.compare(password, adminHash);
        if (!isValid) {
          recordFailedAttempt(rateLimitKey);
          return null;
        }

        // Reset rate limiter on successful authentication
        resetAttempts(rateLimitKey);

        return {
          id: "admin",
          email: adminEmail,
          name: "Administrator",
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
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token) {
        session.user.email = (token.email as string) || session.user.email;
        session.user.name = (token.name as string) || session.user.name;
      }
      return session;
    },
  },
});
