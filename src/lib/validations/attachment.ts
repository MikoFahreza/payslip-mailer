import { z } from "zod";

export const ALLOWED_EXTENSIONS = ["pdf", "png", "jpg", "jpeg"] as const;
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
] as const;

export const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB
export const MAX_ATTACHMENTS_PER_RECIPIENT = 3;

export const attachmentKindSchema = z.enum(["payslip", "transfer_proof", "other"]);

export const attachmentInputSchema = z.object({
  filename: z.string().min(1, "Nama file wajib diisi").max(255),
  blobUrl: z.string().url("URL Blob tidak valid"),
  blobPathname: z.string().min(1, "Pathname Blob wajib diisi"),
  contentType: z
    .string()
    .refine((mime) => (ALLOWED_MIME_TYPES as readonly string[]).includes(mime), {
      message: "Tipe file tidak didukung. Hanya PDF, PNG, dan JPG yang diperbolehkan.",
    }),
  sizeBytes: z
    .number()
    .int()
    .positive("Ukuran file harus lebih dari 0")
    .max(MAX_FILE_SIZE_BYTES, "Ukuran file melebihi batas maksimal 4 MB"),
  kind: attachmentKindSchema.default("payslip"),
});

export type AttachmentInput = z.infer<typeof attachmentInputSchema>;

/**
 * Sanitizes a filename to eliminate path traversal, directory separators,
 * control characters, and dangerous characters.
 */
export function sanitizeFilename(filename: string): string {
  // Remove directory separators, null bytes, control characters
  let clean = filename.replace(/[\0\r\n/\\]/g, "");
  // Replace potentially hazardous characters with an underscore
  clean = clean.replace(/[^a-zA-Z0-9._-]/g, "_");
  // Collapse multiple consecutive underscores into a single one
  clean = clean.replace(/_{2,}/g, "_");
  // Prevent path traversal via multiple consecutive dots
  clean = clean.replace(/\.{2,}/g, ".");
  // Strip leading dot to prevent hidden files
  while (clean.startsWith(".")) {
    clean = clean.substring(1);
  }
  // Fallback if cleaned name is empty
  if (!clean || clean === "_") {
    clean = `dokumen_${Date.now()}`;
  }
  // Ensure maximum length of 255 characters
  return clean.substring(0, 255);
}

/**
 * Validates file object against size, extension, and MIME type rules.
 */
export function validateAttachmentFile(file: { name: string; size: number; type: string }): {
  valid: boolean;
  error: string | null;
} {
  // 1. Check size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Ukuran file (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimal 4 MB.`,
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      error: "File tidak boleh kosong (0 byte).",
    };
  }

  // 2. Check extension
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
    return {
      valid: false,
      error: "Format file tidak didukung. Hanya file PDF, PNG, dan JPG yang diizinkan.",
    };
  }

  // 3. Check MIME type
  if (file.type && !(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: "Tipe konten tidak valid. Hanya file PDF, PNG, dan JPG yang diizinkan.",
    };
  }

  return { valid: true, error: null };
}

/**
 * Generates an unguessable, secure pathname for Vercel Blob storage.
 */
export function generateSecureBlobPathname(
  recipientId: string,
  originalFilename: string,
  userId?: string
): string {
  const sanitized = sanitizeFilename(originalFilename);
  const randomSuffix = crypto.randomUUID();
  const basePrefix = userId ? `${userId}` : "payslips";
  return `${basePrefix}/${recipientId}/${randomSuffix}-${sanitized}`;
}
