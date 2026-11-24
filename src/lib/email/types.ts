export interface EmailAttachment {
  filename: string;
  contentType: string;
  content: Buffer;
}

export interface SendEmailParams {
  to: string;
  toName: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  status: "sent" | "failed" | "unknown";
  error?: string;
  provider: "gmail" | "simulate";
}

export interface EmailProvider {
  name: string;
  sendEmail(params: SendEmailParams): Promise<SendEmailResult>;
}
