export interface TemplateParams {
  recipientName: string;
  batchName: string;
  appName?: string;
  attachmentNames?: string[];
}

export function generateEmailHtml({
  recipientName,
  batchName,
  appName = "Payslip Mailer",
  attachmentNames = [],
}: TemplateParams): string {
  const attachmentListHtml =
    attachmentNames.length > 0
      ? `
    <div style="margin: 20px 0; padding: 16px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
      <p style="margin: 0 0 10px 0; font-weight: 600; color: #1e293b; font-size: 14px;">Lampiran Dokumen:</p>
      <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px;">
        ${attachmentNames.map((name) => `<li style="margin-bottom: 4px;">${name}</li>`).join("")}
      </ul>
    </div>
  `
      : "";

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Slip Gaji - ${batchName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #334155; background-color: #f1f5f9; margin: 0; padding: 24px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <tr>
      <td style="padding: 28px 32px; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: #ffffff;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">${appName}</h1>
        <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Pemberitahuan Pembayaran Gaji</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <p style="margin: 0 0 16px 0; font-size: 16px;">Yth. <strong>${recipientName}</strong>,</p>
        <p style="margin: 0 0 16px 0; font-size: 15px; color: #475569;">
          Berikut kami sampaikan slip gaji dan dokumen bukti transfer Anda untuk periode:
        </p>
        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 0 0 20px 0; border-radius: 0 6px 6px 0;">
          <p style="margin: 0; font-size: 15px; font-weight: 600; color: #1e40af;">${batchName}</p>
        </div>

        ${attachmentListHtml}

        <p style="margin: 0 0 24px 0; font-size: 14px; color: #475569;">
          Silakan periksa file terlampir pada email ini. Jika terdapat pertanyaan mengenai rincian penghasilan, silakan hubungi bagian Keuangan / SDM.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

        <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
          <strong>Pemberitahuan Kerahasiaan:</strong> Email ini beserta lampirannya bersifat rahasia dan hanya ditujukan untuk penerima yang berhak. Dilarang menyebarluaskan, menyalin, atau mendistribusikan isi dokumen ini tanpa izin.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">
          Email ini dikirim secara otomatis oleh sistem ${appName}. Mohon tidak membalas email ini secara langsung.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function generateEmailText({
  recipientName,
  batchName,
  appName = "Payslip Mailer",
  attachmentNames = [],
}: TemplateParams): string {
  const attachmentsText =
    attachmentNames.length > 0
      ? `\nLampiran:\n${attachmentNames.map((n) => `- ${n}`).join("\n")}\n`
      : "";

  return `Yth. ${recipientName},

Berikut kami sampaikan slip gaji dan dokumen bukti transfer Anda untuk periode: ${batchName}.
${attachmentsText}
Silakan periksa file terlampir pada email ini. Jika terdapat pertanyaan, silakan hubungi bagian Keuangan / SDM.

---
Pemberitahuan Kerahasiaan:
Email ini beserta lampirannya bersifat rahasia dan hanya ditujukan untuk penerima yang berhak.

Email otomatis dari ${appName}.`;
}
