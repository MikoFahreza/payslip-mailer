import { describe, it, expect } from "vitest";
import { SimulateProvider } from "./simulate-provider";

describe("SimulateProvider", () => {
  const provider = new SimulateProvider();

  it("should return sent status for normal email addresses", async () => {
    const result = await provider.sendEmail({
      to: "karyawan@example.com",
      toName: "Karyawan",
      subject: "Slip Gaji",
      html: "<p>Halo</p>",
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe("sent");
    expect(result.provider).toBe("simulate");
    expect(result.messageId).toBeDefined();
  });

  it("should simulate failure when email contains force-fail or starts with fail@", async () => {
    const result = await provider.sendEmail({
      to: "fail@example.com",
      toName: "Gagal Test",
      subject: "Slip Gaji",
      html: "<p>Halo</p>",
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("Simulasi: Provider menolak pengiriman");
  });

  it("should simulate unknown status when email contains force-timeout or starts with timeout@", async () => {
    const result = await provider.sendEmail({
      to: "timeout@example.com",
      toName: "Timeout Test",
      subject: "Slip Gaji",
      html: "<p>Halo</p>",
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe("unknown");
    expect(result.error).toContain("Simulasi: Permintaan terkirim tapi koneksi mengalami timeout");
  });
});
