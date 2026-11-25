import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { saveMockFile } from "@/lib/storage/mock-store";

export async function POST(request: Request): Promise<NextResponse> {
  let userId: string;
  try {
    userId = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const rawPathname = (formData.get("pathname") as string) || `mock/${Date.now()}`;
    const pathname = rawPathname.startsWith(`${userId}/`) ? rawPathname : `${userId}/${rawPathname}`;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan dalam request" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const id = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    saveMockFile(id, buffer, file.type || "application/octet-stream", file.name);

    const origin = new URL(request.url).origin;
    return NextResponse.json({
      url: `${origin}/api/blob/mock/${id}`,
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
