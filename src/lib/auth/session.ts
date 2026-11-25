import { auth } from "@/auth";
import { ForbiddenError } from "@/lib/auth/isolation";
import type { UserRole } from "@/lib/db/schema";

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
 * Requires an authenticated session with the "admin" role.
 * Throws Error if unauthenticated or ForbiddenError if not an admin.
 */
export async function requireAdmin(): Promise<{ userId: string; role: "admin" }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!session?.user || !userId) {
    throw new Error("Unauthorized: Sesi tidak valid atau belum masuk. Silakan login kembali.");
  }
  const role: UserRole = session.user.role || "user";
  if (role !== "admin") {
    throw new ForbiddenError("Akses ditolak: Hanya administrator yang diizinkan melakukan aksi ini.");
  }
  return { userId, role: "admin" };
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
