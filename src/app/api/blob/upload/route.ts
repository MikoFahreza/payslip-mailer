import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/validations/attachment";

export async function POST(request: Request): Promise<NextResponse> {
  // 1. Enforce session check on route handler
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized: Sesi tidak valid atau belum masuk." },
      { status: 401 }
    );
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const isSampleToken = !token || token.includes("sample");

  // If running in development with sample placeholder token, provide simulated token
  if (isSampleToken) {
    const url = new URL(request.url);
    const mockFilename = `mock_${Date.now()}`;
    return NextResponse.json({
      type: "blob.generate-client-token",
      isMock: true,
      clientToken: "mock-client-token",
      mockBlob: {
        url: `${url.origin}/api/blob/mock/${mockFilename}`,
        pathname: `payslips/mock/${mockFilename}`,
      },
    });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        return {
          allowedContentTypes: [...ALLOWED_MIME_TYPES],
          maximumSizeInBytes: MAX_FILE_SIZE_BYTES,
          tokenPayload: clientPayload,
        };
      },
      onUploadCompleted: async () => {
        // Handled via explicit server action saveAttachmentMetadata
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
