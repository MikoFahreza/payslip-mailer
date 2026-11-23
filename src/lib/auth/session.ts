import { auth } from "@/auth";

/**
 * Returns current session or null.
 */
export async function getSession() {
  return await auth();
}

/**
 * Guards Server Actions and API handlers.
 * Throws an Error if no valid session is found.
 */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized: Sesi tidak valid atau belum masuk. Silakan login kembali.");
  }
  return session;
}
