import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { assertOwnsRecipient, assertOwnsBlobPathname } from "@/lib/auth/isolation";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/validations/attachment";

export async function GET(): Promise<NextResponse> {
  let userId: string;
  try {
    userId = await requireUser();
  } catch {
    return NextResponse.json(
      { error: "Unauthorized: Sesi tidak valid atau belum masuk." },
      { status: 401 }
    );
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const isMock = !token || token.includes("sample");

  if (isMock && process.env.VERCEL === "1") {
    return NextResponse.json(
      {
        error:
          "Konfigurasi Vercel Blob (BLOB_READ_WRITE_TOKEN) belum aktif di server Vercel. Tambahkan Vercel Blob di tab Storage lalu redeploy.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    isMock,
    userId,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  // For client token generation, enforce user authentication.
  // For "blob.upload-completed" webhook, handleUpload verifies x-vercel-signature.
  let userId: string | null = null;
  if (body?.type !== "blob.upload-completed") {
    try {
      userId = await requireUser();
    } catch {
      return NextResponse.json(
        { error: "Unauthorized: Sesi tidak valid atau belum masuk." },
        { status: 401 }
      );
    }
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const isSampleToken = !token || token.includes("sample");

  // If running in development with sample placeholder token, provide simulated token
  if (isSampleToken) {
    if (process.env.VERCEL === "1") {
      return NextResponse.json(
        {
          error:
            "Konfigurasi Vercel Blob (BLOB_READ_WRITE_TOKEN) belum aktif di server Vercel.",
        },
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    const mockFilename = `mock_${Date.now()}`;
    return NextResponse.json({
      type: "blob.generate-client-token",
      isMock: true,
      clientToken: "mock-client-token",
      userId,
      mockBlob: {
        url: `${url.origin}/api/blob/mock/${mockFilename}`,
        pathname: `${userId}/mock/${mockFilename}`,
      },
    });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!userId) {
          throw new Error("Unauthorized: Sesi pengguna tidak ditemukan.");
        }

        // Enforce that blob pathname is scoped to this user
        assertOwnsBlobPathname(pathname, userId);

        // Verify that clientPayload has recipientId and the user owns this recipient
        if (clientPayload) {
          try {
            const parsed = typeof clientPayload === "string" ? JSON.parse(clientPayload) : clientPayload;
            if (parsed?.recipientId) {
              await assertOwnsRecipient(parsed.recipientId, userId);
            }
          } catch (payloadErr: unknown) {
            const e = payloadErr as Error;
            throw new Error(`Verifikasi kepemilikan penerima gagal: ${e.message}`);
          }
        }

        return {
          allowedContentTypes: [...ALLOWED_MIME_TYPES],
          maximumSizeInBytes: MAX_FILE_SIZE_BYTES,
          tokenPayload: clientPayload,
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || "Gagal memproses otorisasi upload Vercel Blob." },
      { status: 400 }
    );
  }
}
