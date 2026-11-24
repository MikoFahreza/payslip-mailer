"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { normalizeEmail } from "@/lib/utils";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Kata sandi minimal 6 karakter"),
});

export async function loginWithGoogleAction() {
  await signIn("google", { redirectTo: "/app" });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function loginWithCredentialsAction(
  _prevState: { success: boolean; error?: string } | null,
  formData: FormData
) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, error: "Email dan kata sandi wajib diisi." };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/app",
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: "Email atau kata sandi tidak sesuai." };
    }
    // Re-throw next.js redirect
    throw error;
  }
}

export async function registerUserAction(
  _prevState: { success: boolean; error?: string; registered?: boolean } | null,
  formData: FormData
) {
  const rawData = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const validation = registerSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || "Data pendaftaran tidak valid.",
    };
  }

  const { name, email, password } = validation.data;
  const normalized = normalizeEmail(email);

  const url = process.env.DATABASE_URL;
  if (!url || url.includes("ep-sample-pooler")) {
    return {
      success: false,
      error: "Koneksi database belum tersedia.",
    };
  }

  try {
    // Check if email already registered
    const existing = await db.query.users.findFirst({
      where: eq(users.email, normalized),
    });

    if (existing) {
      if (!existing.passwordHash) {
        return {
          success: false,
          error: "Email ini terdaftar dengan Akun Google. Silakan klik 'Masuk dengan Google'.",
        };
      }
      return {
        success: false,
        error: "Email ini sudah terdaftar. Silakan langsung masuk.",
      };
    }

    // Hash password and insert
    const passwordHash = await bcrypt.hash(password, 10);
    await db.insert(users).values({
      name: name.trim(),
      email: normalized,
      passwordHash,
    });

    // Auto sign in with the new credentials
    await signIn("credentials", {
      email: normalized,
      password,
      redirectTo: "/app",
    });

    return { success: true, registered: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        success: true,
        registered: true,
        error: "Akun berhasil dibuat. Silakan masuk.",
      };
    }
    // Let Next.js handle NEXT_REDIRECT without catching it
    throw error;
  }
}
