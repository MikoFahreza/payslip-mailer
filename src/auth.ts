import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users, gmailConnections } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { normalizeEmail } from "@/lib/utils";
import { encrypt } from "@/lib/crypto/encryption";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/gmail.send",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
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
    async signIn({ user, account }) {
      if (!user.email) {
        console.error("[Auth] Login gagal: akun tidak memiliki alamat email.");
        return false;
      }

      const email = normalizeEmail(user.email);

      // Handle Google Provider: auto upsert user & auto connect Gmail if refresh_token returned
      if (account?.provider === "google") {
        const name = user.name || null;
        const image = user.image || null;

        const url = process.env.DATABASE_URL;
        if (url && !url.includes("ep-sample-pooler")) {
          try {
            // 1. Upsert user into users table
            const [savedUser] = await db
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
              })
              .returning();

            // 2. If Google returned a refresh_token, encrypt and auto-connect Gmail
            if (account.refresh_token && savedUser?.id) {
              const encryptedToken = encrypt(account.refresh_token);
              await db
                .insert(gmailConnections)
                .values({
                  userId: savedUser.id,
                  gmailEmail: email,
                  refreshTokenEncrypted: encryptedToken,
                  scope:
                    account.scope ||
                    "openid email profile https://www.googleapis.com/auth/gmail.send",
                  status: "connected",
                  connectedAt: new Date(),
                  updatedAt: new Date(),
                })
                .onConflictDoUpdate({
                  target: [gmailConnections.userId],
                  set: {
                    gmailEmail: email,
                    refreshTokenEncrypted: encryptedToken,
                    scope:
                      account.scope ||
                      "openid email profile https://www.googleapis.com/auth/gmail.send",
                    status: "connected",
                    updatedAt: new Date(),
                  },
                });
            }
          } catch (error) {
            console.error("[Auth] Gagal upsert user atau auto-connect gmail_connections:", error);
          }
        }
      }

      return true;
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
