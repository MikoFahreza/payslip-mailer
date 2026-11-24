import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveMockFile } from "@/lib/storage/mock-store";

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const pathname = (formData.get("pathname") as string) || `payslips/mock/${Date.now()}`;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan dalam request" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const id = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    saveMockFile(id, buffer, file.type || "application/octet-stream", file.name);

    return NextResponse.json({
      url: `/api/blob/mock/${id}`,
      pathname,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || "Gagal mengunggah file mock" },
      { status: 500 }
    );
  }
}
