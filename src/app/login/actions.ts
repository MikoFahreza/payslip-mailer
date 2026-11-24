"use server";

import { signIn, signOut } from "@/auth";

export async function loginWithGoogleAction() {
  await signIn("google", { redirectTo: "/app" });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
