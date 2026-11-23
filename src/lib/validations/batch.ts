import { z } from "zod";

export const batchSchema = z.object({
  name: z
    .string()
    .min(3, "Nama batch minimal 3 karakter")
    .max(255, "Nama batch maksimal 255 karakter"),
});

export type BatchInput = z.infer<typeof batchSchema>;
