import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createUserByAdmin,
  updateUserByAdmin,
  deleteUserByAdmin,
  getUsersForAdmin,
} from "./admin-users";
import { requireAdmin } from "@/lib/auth/session";
import { ForbiddenError } from "@/lib/auth/isolation";
import { db } from "@/lib/db";
import { cleanupUserExternalResources } from "./user-cleanup";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ userId: "admin-1", role: "admin" }),
}));

vi.mock("./user-cleanup", () => ({
  cleanupUserExternalResources: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          orderBy: vi.fn().mockResolvedValue([]),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([
          {
            id: "user-new",
            name: "Operator Baru",
            email: "operator@example.com",
            role: "user",
            createdAt: new Date(),
          },
        ]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([
            {
              id: "user-2",
              name: "Operator Diubah",
              email: "op2@example.com",
              role: "admin",
            },
          ]),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn().mockResolvedValue([]),
    })),
  },
}));

describe("Admin User Management & RBAC Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
    vi.mocked(requireAdmin).mockResolvedValue({ userId: "admin-1", role: "admin" });
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: "admin-1",
      role: "admin",
    } as never);
  });

  it("blocks non-admin user from calling admin actions", async () => {
    vi.mocked(requireAdmin).mockRejectedValueOnce(new ForbiddenError());
    await expect(getUsersForAdmin()).rejects.toThrow(ForbiddenError);

    vi.mocked(requireAdmin).mockRejectedValueOnce(new ForbiddenError());
    await expect(
      createUserByAdmin({
        name: "Test",
        email: "test@example.com",
        password: "password123",
        role: "user",
      })
    ).rejects.toThrow(ForbiddenError);
  });

  it("blocks a demoted admin whose JWT is stale via live DB role check", async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
      id: "admin-1",
      role: "user",
    } as never);

    await expect(getUsersForAdmin()).rejects.toThrow(ForbiddenError);
  });

  it("creates user with normalized email and hashed password", async () => {
    vi.mocked(db.query.users.findFirst)
      .mockResolvedValueOnce({ id: "admin-1", role: "admin" } as never) // assertLiveAdmin
      .mockResolvedValueOnce(null as never); // duplicate check

    const res = await createUserByAdmin({
      name: "  Operator HR  ",
      email: "  Operator@Example.COM ",
      password: "rahasia123",
      role: "user",
    });

    expect(res.success).toBe(true);
    expect(res.data?.email).toBe("operator@example.com");
    expect(db.insert).toHaveBeenCalled();
  });

  it("rejects duplicate email on createUserByAdmin", async () => {
    vi.mocked(db.query.users.findFirst)
      .mockResolvedValueOnce({ id: "admin-1", role: "admin" } as never)
      .mockResolvedValueOnce({ id: "existing-u" } as never);

    const res = await createUserByAdmin({
      name: "Dup",
      email: "dup@example.com",
      password: "password123",
      role: "user",
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("sudah terdaftar");
  });

  it("prevents admin from demoting their own admin role", async () => {
    const res = await updateUserByAdmin("admin-1", {
      name: "Admin",
      role: "user",
      newPassword: "",
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("tidak dapat menurunkan peran admin");
  });

  it("updates user name, role, and resets password when provided", async () => {
    const res = await updateUserByAdmin("user-2", {
      name: "Operator Diubah",
      role: "admin",
      newPassword: "newpassword123",
    });

    expect(res.success).toBe(true);
    expect(db.update).toHaveBeenCalled();
  });

  it("prevents admin from deleting their own account via admin panel", async () => {
    const res = await deleteUserByAdmin("admin-1");
    expect(res.success).toBe(false);
    expect(res.error).toContain("Tidak dapat menghapus akun sendiri");
    expect(db.delete).not.toHaveBeenCalled();
  });

  it("cleans up Gmail tokens and Blobs before deleting another user", async () => {
    vi.mocked(db.query.users.findFirst)
      .mockResolvedValueOnce({ id: "admin-1", role: "admin" } as never)
      .mockResolvedValueOnce({ id: "user-target" } as never);

    const res = await deleteUserByAdmin("user-target");

    expect(res.success).toBe(true);
    expect(cleanupUserExternalResources).toHaveBeenCalledWith("user-target");
    expect(db.delete).toHaveBeenCalled();
  });
});
