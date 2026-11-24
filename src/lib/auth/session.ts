import { auth } from "@/auth";

/**
 * Returns current session or null.
 */
export async function getSession() {
  return await auth();
}

/**
 * Returns the current authenticated user's ID (`userId`).
 * Throws an Error if no valid session or userId is found.
 */
export async function requireUser(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!session?.user || !userId) {
    throw new Error("Unauthorized: Sesi tidak valid atau belum masuk. Silakan login kembali.");
  }
  return userId;
}

/**
 * Legacy compatibility alias for requireUser().
 */
export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized: Sesi tidak valid atau belum masuk. Silakan login kembali.");
  }
  return session;
}
