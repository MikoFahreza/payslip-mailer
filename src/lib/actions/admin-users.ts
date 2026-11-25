"use server";

import { db } from "@/lib/db";
import { gmailConnections, users, type UserRole } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { ForbiddenError } from "@/lib/auth/isolation";
import { cleanupUserExternalResources } from "@/lib/actions/user-cleanup";
import {
  adminCreateUserSchema,
  adminUpdateUserSchema,
  type AdminCreateUserInput,
  type AdminUpdateUserInput,
} from "@/lib/validations/admin-user";
import bcrypt from "bcryptjs";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface AdminUserRow {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  createdAt: Date;
  gmailEmail: string | null;
  gmailStatus: "connected" | "revoked" | "not_connected";
}

async function assertLiveAdmin(): Promise<string> {
  const { userId } = await requireAdmin();

  const url = process.env.DATABASE_URL;
  if (url && !url.includes("ep-sample-pooler")) {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, role: true },
    });
    if (!dbUser || dbUser.role !== "admin") {
      throw new ForbiddenError("Akses ditolak: Hanya administrator aktif yang diizinkan.");
    }
  }

  return userId;
}

export async function getUsersForAdmin(): Promise<AdminUserRow[]> {
  await assertLiveAdmin();

  const url = process.env.DATABASE_URL;
  if (!url || url.includes("ep-sample-pooler")) {
    return [];
  }

  const userRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      gmailEmail: gmailConnections.gmailEmail,
      gmailStatus: gmailConnections.status,
    })
    .from(users)
    .leftJoin(gmailConnections, eq(users.id, gmailConnections.userId))
    .orderBy(desc(users.createdAt));

  return userRows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.createdAt,
    gmailEmail: row.gmailEmail || null,
    gmailStatus: row.gmailStatus || "not_connected",
  }));
}

export async function createUserByAdmin(input: AdminCreateUserInput) {
  await assertLiveAdmin();

  const validation = adminCreateUserSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || "Data pengguna tidak valid.",
    };
  }

  const { name, email, password, role } = validation.data;

  const url = process.env.DATABASE_URL;
  if (!url || url.includes("ep-sample-pooler")) {
    return { success: false, error: "Database belum dikonfigurasi." };
  }

  try {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true },
    });

    if (existing) {
      return {
        success: false,
        error: `Email "${email}" sudah terdaftar pada sistem.`,
      };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [created] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash,
        role,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      });

    revalidatePath("/app/admin/users");
    return { success: true, data: created };
  } catch (err: unknown) {
    console.error("[createUserByAdmin Error]:", err);
    return { success: false, error: "Gagal menambahkan pengguna baru." };
  }
}

export async function updateUserByAdmin(targetUserId: string, input: AdminUpdateUserInput) {
  const adminId = await assertLiveAdmin();

  const validation = adminUpdateUserSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || "Data perubahan pengguna tidak valid.",
    };
  }

  const { name, role, newPassword } = validation.data;

  if (targetUserId === adminId && role !== "admin") {
    return {
      success: false,
      error: "Anda tidak dapat menurunkan peran admin milik akun Anda sendiri.",
    };
  }

  const url = process.env.DATABASE_URL;
  if (!url || url.includes("ep-sample-pooler")) {
    return { success: false, error: "Database belum dikonfigurasi." };
  }

  try {
    const updatePayload: {
      name: string;
      role: UserRole;
      passwordHash?: string;
    } = {
      name,
      role,
    };

    if (newPassword && newPassword.length >= 6) {
      updatePayload.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const [updated] = await db
      .update(users)
      .set(updatePayload)
      .where(eq(users.id, targetUserId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      });

    if (!updated) {
      return { success: false, error: "Pengguna tidak ditemukan." };
    }

    revalidatePath("/app/admin/users");
    return { success: true, data: updated };
  } catch (err: unknown) {
    console.error("[updateUserByAdmin Error]:", err);
    return { success: false, error: "Gagal memperbarui data pengguna." };
  }
}

export async function deleteUserByAdmin(targetUserId: string) {
  const adminId = await assertLiveAdmin();

  if (targetUserId === adminId) {
    return {
      success: false,
      error: "Tidak dapat menghapus akun sendiri dari menu ini. Gunakan halaman Pengaturan.",
    };
  }

  const url = process.env.DATABASE_URL;
  if (!url || url.includes("ep-sample-pooler")) {
    return { success: false, error: "Database belum dikonfigurasi." };
  }

  try {
    const existing = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
      columns: { id: true },
    });

    if (!existing) {
      return { success: false, error: "Pengguna tidak ditemukan." };
    }

    await cleanupUserExternalResources(targetUserId);
    await db.delete(users).where(eq(users.id, targetUserId));

    revalidatePath("/app/admin/users");
    return { success: true };
  } catch (err: unknown) {
    console.error("[deleteUserByAdmin Error]:", err);
    return { success: false, error: "Gagal menghapus akun pengguna." };
  }
}
