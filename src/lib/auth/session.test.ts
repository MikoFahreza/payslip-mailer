import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireUser, requireSession, getSession } from "./session";
import type { Session } from "next-auth";

const mockAuth = vi.fn<() => Promise<Session | null>>();

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

describe("requireUser, requireSession & getSession helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw an error when session is null or unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(requireUser()).rejects.toThrow(
      "Unauthorized: Sesi tidak valid atau belum masuk. Silakan login kembali."
    );
  });

  it("requireUser should return the userId string when authenticated", async () => {
    const mockSession: Session = {
      user: {
        id: "usr_12345",
        email: "user@example.com",
        name: "Pengguna Google",
      },
      expires: "2026-12-31T23:59:59.999Z",
    };

    mockAuth.mockResolvedValue(mockSession);

    const userId = await requireUser();
    expect(userId).toBe("usr_12345");
  });

  it("requireSession should return full session object when authenticated", async () => {
    const mockSession: Session = {
      user: {
        id: "usr_12345",
        email: "user@example.com",
        name: "Pengguna Google",
      },
      expires: "2026-12-31T23:59:59.999Z",
    };

    mockAuth.mockResolvedValue(mockSession);

    const session = await requireSession();
    expect(session.user.id).toBe("usr_12345");
    expect(session.user.email).toBe("user@example.com");
  });

  it("getSession should return null when unauthenticated without throwing", async () => {
    mockAuth.mockResolvedValue(null);
    const session = await getSession();
    expect(session).toBeNull();
  });
});
