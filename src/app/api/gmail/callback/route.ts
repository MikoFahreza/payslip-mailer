import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { gmailConnections } from "@/lib/db/schema";
import { encrypt } from "@/lib/crypto/encryption";
import { normalizeAppOrigin, normalizeEmail } from "@/lib/utils";
import { cookies } from "next/headers";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const settingsUrl = new URL("/app/settings", request.url);

  let userId: string;
  try {
    userId = await requireUser();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  if (errorParam) {
    settingsUrl.searchParams.set("error", `Google OAuth ditolak: ${errorParam}`);
    return NextResponse.redirect(settingsUrl);
  }

  if (!code || !state) {
    settingsUrl.searchParams.set("error", "Parameter otorisasi tidak lengkap.");
    return NextResponse.redirect(settingsUrl);
  }

  // 1. Verify state from HTTP-only cookie
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get("gmail_oauth_state")?.value;

  if (!rawCookie) {
    settingsUrl.searchParams.set(
      "error",
      "Sesi otorisasi kedaluwarsa atau tidak valid. Silakan coba kembali."
    );
    return NextResponse.redirect(settingsUrl);
  }

  let cookieData: { state: string; codeVerifier: string; userId: string };
  try {
    cookieData = JSON.parse(rawCookie);
  } catch {
    settingsUrl.searchParams.set("error", "Data cookie otorisasi rusak.");
    return NextResponse.redirect(settingsUrl);
  }

  // Delete state cookie
  cookieStore.delete("gmail_oauth_state");

  if (cookieData.state !== state || cookieData.userId !== userId) {
    settingsUrl.searchParams.set(
      "error",
      "Validasi keamanan state gagal (CSRF detected). Otorisasi dibatalkan."
    );
    return NextResponse.redirect(settingsUrl);
  }

  // 2. Exchange authorization code for tokens
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const configuredOrigin = normalizeAppOrigin(
    process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL
  );
  const origin = configuredOrigin || url.origin;
  const redirectUri = `${origin}/api/gmail/callback`;

  if (!clientId || !clientSecret) {
    settingsUrl.searchParams.set("error", "Kredensial OAuth Google server belum lengkap.");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: cookieData.codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error("[Gmail Callback] Gagal menukar token dengan Google:", errBody);
      settingsUrl.searchParams.set(
        "error",
        "Gagal menukar kode otorisasi dengan token Google."
      );
      return NextResponse.redirect(settingsUrl);
    }

    const tokenData = await tokenResponse.json();
    const refreshToken = tokenData.refresh_token;

    if (!refreshToken) {
      // If user had previously authorized and prompt wasn't consent, refresh_token might be absent
      settingsUrl.searchParams.set(
        "error",
        "Google tidak mengembalikan refresh token. Silakan putuskan dan hubungkan ulang dengan izin penuh."
      );
      return NextResponse.redirect(settingsUrl);
    }

    // 3. Resolve Gmail email from userinfo endpoint
    let gmailEmail = "";
    if (tokenData.access_token) {
      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (userInfoRes.ok) {
        const userInfo = await userInfoRes.json();
        gmailEmail = normalizeEmail(userInfo.email);
      }
    }

    if (!gmailEmail) {
      settingsUrl.searchParams.set("error", "Gagal membaca alamat email Gmail yang dihubungkan.");
      return NextResponse.redirect(settingsUrl);
    }

    // 4. Encrypt refresh token using AES-256-GCM
    const refreshTokenEncrypted = encrypt(refreshToken);

    // 5. Store into gmail_connections table
    await db
      .insert(gmailConnections)
      .values({
        userId,
        gmailEmail,
        refreshTokenEncrypted,
        scope:
          tokenData.scope ||
          "openid email https://www.googleapis.com/auth/gmail.send",
        status: "connected",
        connectedAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [gmailConnections.userId],
        set: {
          gmailEmail,
          refreshTokenEncrypted,
          scope:
            tokenData.scope ||
            "openid email https://www.googleapis.com/auth/gmail.send",
          status: "connected",
          updatedAt: new Date(),
        },
      });

    settingsUrl.searchParams.set("connected", "true");
    return NextResponse.redirect(settingsUrl);
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[Gmail Callback Error]:", error);
    settingsUrl.searchParams.set(
      "error",
      error.message || "Terjadi kesalahan internal saat menghubungkan akun Gmail."
    );
    return NextResponse.redirect(settingsUrl);
  }
}
