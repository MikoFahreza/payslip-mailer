import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireSession, getSession } from "./session";
import type { Session } from "next-auth";

const mockAuth = vi.fn<() => Promise<Session | null>>();

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

describe("requireSession & getSession helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw an error when session is null or unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(requireSession()).rejects.toThrow(
      "Unauthorized: Sesi tidak valid atau belum masuk. Silakan login kembali."
    );
  });

  it("should return the session when user is authenticated", async () => {
    const mockSession: Session = {
      user: {
        id: "admin",
        email: "admin@example.com",
        name: "Administrator",
      },
      expires: "2026-12-31T23:59:59.999Z",
    };

    mockAuth.mockResolvedValue(mockSession);

    const session = await requireSession();
    expect(session).toEqual(mockSession);
    expect(session.user?.email).toBe("admin@example.com");
  });

  it("getSession should return null when unauthenticated without throwing", async () => {
    mockAuth.mockResolvedValue(null);
    const session = await getSession();
    expect(session).toBeNull();
  });
});
