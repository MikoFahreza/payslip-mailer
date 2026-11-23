"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { loginSchema } from "@/lib/validations/auth";

export interface LoginActionResult {
  success: boolean;
  error: string | null;
}

export async function loginAction(
  _prevState: LoginActionResult | null,
  formData: FormData
): Promise<LoginActionResult> {
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");

  const validation = loginSchema.safeParse({
    email: rawEmail,
    password: rawPassword,
  });

  if (!validation.success) {
    return {
      success: false,
      error: "Email atau kata sandi tidak valid. Silakan periksa kembali formulir Anda.",
    };
  }

  try {
    await signIn("credentials", {
      email: validation.data.email,
      password: validation.data.password,
      redirectTo: "/app",
    });
    return { success: true, error: null };
  } catch (error) {
    if (error instanceof AuthError) {
      // Check for rate limit signal
      const cause = error.cause as { err?: { message?: string } } | undefined;
      if (
        error.message?.includes("TOO_MANY_REQUESTS") ||
        cause?.err?.message === "TOO_MANY_REQUESTS"
      ) {
        return {
          success: false,
          error:
            "Terlalu banyak percobaan masuk yang gagal. Demi keamanan, silakan coba beberapa menit lagi.",
        };
      }

      // Generic authentication failure to prevent user enumeration
      return {
        success: false,
        error: "Email atau kata sandi tidak sesuai. Silakan coba kembali.",
      };
    }

    // Let Next.js handle NEXT_REDIRECT without catching it
    throw error;
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
