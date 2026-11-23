import { z } from "zod";

export const recipientStatusValues = ["pending", "sending", "sent", "failed", "unknown"] as const;

export const recipientSchema = z.object({
  name: z
    .string()
    .min(1, "Nama penerima wajib diisi")
    .max(255, "Nama penerima maksimal 255 karakter"),
  email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid")
    .max(255, "Email maksimal 255 karakter"),
});

export const recipientListSchema = z
  .array(recipientSchema)
  .min(1, "Daftar penerima tidak boleh kosong")
  .max(50, "Maksimal 50 penerima per batch untuk mencegah penyalahgunaan");

export type RecipientInput = z.infer<typeof recipientSchema>;
