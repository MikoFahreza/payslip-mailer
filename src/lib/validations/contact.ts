import { z } from "zod";
import { normalizeEmail } from "@/lib/utils";

export const MAX_CONTACTS_PER_USER = 200;

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama kontak tidak boleh kosong.")
    .max(255, "Nama kontak maksimal 255 karakter."),
  email: z
    .string()
    .trim()
    .min(1, "Email kontak tidak boleh kosong.")
    .email("Format alamat email tidak valid.")
    .transform((val) => normalizeEmail(val)),
});

export type ContactInput = z.infer<typeof contactSchema>;

export interface ContactUpsertReport {
  newCount: number;
  updatedCount: number;
  skippedCount: number;
  problematicCount: number;
  errors: { row: number; name: string; email: string; message: string }[];
}
