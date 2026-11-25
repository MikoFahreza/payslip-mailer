"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { normalizeEmail } from "@/lib/utils";
import {
  checkRateLimit,
  recordFailedAttempt,
  resetAttempts,
} from "@/lib/auth/rate-limiter";

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function loginWithCredentialsAction(
  _prevState: { success: boolean; error?: string } | null,
  formData: FormData
) {
  const rawEmail = (formData.get("email") as string) || "";
  const password = (formData.get("password") as string) || "";

  const email = normalizeEmail(rawEmail);

  if (!email || !password) {
    return { success: false, error: "Email dan kata sandi wajib diisi." };
  }

  const rateLimitKey = `login:${email}`;
  const rateLimit = checkRateLimit(rateLimitKey);
  if (!rateLimit.allowed) {
    const minutesLeft = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 60000));
    return {
      success: false,
      error: `Terlalu banyak percobaan login gagal. Silakan coba lagi dalam ${minutesLeft} menit.`,
    };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/app",
    });
    resetAttempts(rateLimitKey);
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      recordFailedAttempt(rateLimitKey);
      return { success: false, error: "Email atau kata sandi tidak sesuai." };
    }
    // Re-throw next.js redirect
    resetAttempts(rateLimitKey);
    throw error;
  }
}
