import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { normalizeAppOrigin } from "@/lib/utils";
import crypto from "crypto";
import { cookies } from "next/headers";

export async function GET(request: Request): Promise<NextResponse> {
  let userId: string;
  try {
    userId = await requireUser();
  } catch {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID belum dikonfigurasi di server." },
      { status: 500 }
    );
  }

  // 1. Resolve application origin URL
  const configuredOrigin = normalizeAppOrigin(
    process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL
  );
  const origin = configuredOrigin || new URL(request.url).origin;

  const redirectUri = `${origin}/api/gmail/callback`;

  // 2. Generate random 32-byte state bound to this session
  const state = crypto.randomBytes(32).toString("hex");

  // 3. Generate PKCE code_verifier and code_challenge
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  // 4. Save state & verifier to HTTP-only, secure cookie
  const cookieStore = await cookies();
  const cookieData = JSON.stringify({ state, codeVerifier, userId });

  cookieStore.set("gmail_oauth_state", cookieData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60, // 15 minutes
  });

  // 5. Construct Google OAuth Authorization URL
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set(
    "scope",
    "openid email https://www.googleapis.com/auth/gmail.send"
  );
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  return NextResponse.redirect(authUrl.toString());
}
