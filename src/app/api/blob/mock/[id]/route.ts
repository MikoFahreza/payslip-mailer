import { NextResponse } from "next/server";
import { getMockFile } from "@/lib/storage/mock-store";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams): Promise<Response> {
  const { id } = await params;
  const file = getMockFile(id);

  if (!file) {
    return new NextResponse("File mock tidak ditemukan", { status: 404 });
  }

  return new Response(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `inline; filename="${file.filename}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
