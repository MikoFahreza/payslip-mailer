import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const proxy = auth((req) => {
  const isLoggedIn = !!req.auth?.user?.id;
  const isAppRoute = req.nextUrl.pathname.startsWith("/app");
  const isAdminRoute = req.nextUrl.pathname.startsWith("/app/admin");
  const isLoginRoute = req.nextUrl.pathname === "/login";

  if (isAppRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute && req.auth?.user?.role !== "admin") {
    return NextResponse.redirect(new URL("/app", req.nextUrl.origin));
  }

  if (isLoginRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/app", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
