import { auth } from "@/server/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Content-Security-Policy
  // frame-ancestors varies by route: 'none' by default, 'self' for admin (preview iframe)
  const isDisplayRoute = req.nextUrl.pathname.startsWith("/display/");
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");

  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    `frame-ancestors ${isAdminRoute || isDisplayRoute ? "'self'" : "'none'"}`,
    "base-uri 'self'",
    "form-action 'self'",
  ];
  response.headers.set("Content-Security-Policy", cspDirectives.join("; "));

  // Allow display pages to be framed (for preview in editor)
  if (isDisplayRoute) {
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
  }

  // Protect admin routes
  const isApiAdmin = req.nextUrl.pathname.startsWith("/api/admin");
  const isLoggedIn = !!req.auth;

  if ((isAdminRoute || isApiAdmin) && !isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
