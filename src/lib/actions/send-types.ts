export const DAILY_SEND_LIMIT = 100;

export interface DailyQuotaResult {
  used: number;
  max: number;
  remaining: number;
}

export interface SendRecipientResult {
  success: boolean;
  status: "sent" | "failed" | "unknown" | "skipped";
  recipientId: string;
  error?: string;
}
