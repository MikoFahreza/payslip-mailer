import { del } from "@vercel/blob";

export interface BlobTokenResolution {
  token: string | undefined;
  sourceKey: string | null;
  status: "active" | "placeholder_sample" | "missing";
}

function isPlaceholderToken(val: string): boolean {
  const lower = val.toLowerCase();
  return lower.includes("sample") || lower.includes("your-") || lower.includes("placeholder");
}

/**
 * Resolves a live Vercel Blob Read-Write token from process.env.
 * Supports both default BLOB_READ_WRITE_TOKEN and custom-prefixed *_READ_WRITE_TOKEN
 * injected by Vercel Storage integrations (excluding placeholder/sample tokens).
 */
export function resolveBlobToken(): BlobTokenResolution {
  const primary = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (primary && !isPlaceholderToken(primary)) {
    return { token: primary, sourceKey: "BLOB_READ_WRITE_TOKEN", status: "active" };
  }

  for (const [key, value] of Object.entries(process.env)) {
    if (
      key !== "BLOB_READ_WRITE_TOKEN" &&
      key.endsWith("_READ_WRITE_TOKEN") &&
      typeof value === "string"
    ) {
      const trimmed = value.trim();
      if (trimmed && !isPlaceholderToken(trimmed)) {
        return { token: trimmed, sourceKey: key, status: "active" };
      }
    }
  }

  if (primary && isPlaceholderToken(primary)) {
    return {
      token: undefined,
      sourceKey: "BLOB_READ_WRITE_TOKEN",
      status: "placeholder_sample",
    };
  }

  return { token: undefined, sourceKey: null, status: "missing" };
}

/**
 * Builds a clear user-facing error message when Vercel Blob is not active on Vercel.
 */
export function formatMissingBlobError(resolution: BlobTokenResolution): string {
  if (resolution.status === "placeholder_sample") {
    return "BLOB_READ_WRITE_TOKEN di Vercel masih berisi token contoh ('sample'). Hapus token lama di Settings -> Environment Variables, lalu pastikan token Vercel Blob asli aktif untuk Production & Preview dan lakukan Redeploy.";
  }
  return "Variabel BLOB_READ_WRITE_TOKEN tidak ditemukan di environment Vercel ini. Pastikan Vercel Blob terhubung ke Production & Preview di tab Storage/Settings, lalu klik Deployments -> Redeploy (tanpa Build Cache).";
}

/**
 * Deletes remote Vercel Blob URLs safely using the resolved token.
 */
export async function deleteRemoteBlobs(urls: string[]): Promise<void> {
  const { token } = resolveBlobToken();
  if (!token) return;

  const remoteUrls = urls.filter(
    (u) => u.startsWith("https://") && !u.includes("/api/blob/mock") && !u.includes("localhost")
  );
  if (remoteUrls.length === 0) return;

  await del(remoteUrls, { token });
}
