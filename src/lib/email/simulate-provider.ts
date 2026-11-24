import { EmailProvider, SendEmailParams, SendEmailResult } from "./types";

export class SimulateProvider implements EmailProvider {
  public readonly name = "simulate";

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    const { to } = params;

    // Small delay to simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Support intentional testing via email format:
    // e.g. fail@example.com or user+force-fail@domain.com
    if (to.includes("force-fail") || to.startsWith("fail@")) {
      return {
        success: false,
        status: "failed",
        error: "Simulasi: Provider menolak pengiriman (alamat email tujuan tidak valid)",
        provider: "simulate",
      };
    }

    if (to.includes("force-timeout") || to.startsWith("timeout@")) {
      return {
        success: false,
        status: "unknown",
        error: "Simulasi: Permintaan terkirim tapi koneksi mengalami timeout tanpa konfirmasi",
        provider: "simulate",
      };
    }

    // Default simulated success
    const fakeMessageId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return {
      success: true,
      messageId: fakeMessageId,
      status: "sent",
      provider: "simulate",
    };
  }
}
