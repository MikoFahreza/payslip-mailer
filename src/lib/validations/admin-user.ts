import { z } from "zod";
import { normalizeEmail } from "@/lib/utils";

export const userRoleSchema = z.enum(["admin", "user"]);

export const adminCreateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama pengguna minimal 2 karakter.")
    .max(255, "Nama pengguna maksimal 255 karakter."),
  email: z
    .string()
    .trim()
    .min(1, "Alamat email wajib diisi.")
    .email("Format alamat email tidak valid.")
    .max(255, "Email maksimal 255 karakter.")
    .transform((val) => normalizeEmail(val)),
  password: z
    .string()
    .min(6, "Kata sandi minimal 6 karakter.")
    .max(128, "Kata sandi maksimal 128 karakter."),
  role: userRoleSchema.default("user"),
});

export const adminUpdateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama pengguna minimal 2 karakter.")
    .max(255, "Nama pengguna maksimal 255 karakter."),
  role: userRoleSchema,
  newPassword: z
    .string()
    .optional()
    .transform((val) => (val ? val.trim() : ""))
    .refine((val) => val.length === 0 || val.length >= 6, {
      message: "Kata sandi baru minimal 6 karakter.",
    })
    .refine((val) => val.length <= 128, {
      message: "Kata sandi maksimal 128 karakter.",
    }),
});

export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
