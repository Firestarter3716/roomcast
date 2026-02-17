import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/require-auth";
import { logger } from "@/server/lib/logger";

/**
 * GET /api/auth/google-calendar
 *
 * Initiates the Google Calendar OAuth flow.
 * Expects clientId and clientSecret as query params (they are temporarily
 * stored in a signed, httpOnly cookie so the callback can retrieve them).
 */
export async function GET(request: NextRequest) {
  const { error } = await requireAuth("EDITOR");
  if (error) return error;

  const { searchParams } = request.nextUrl;
  const clientId = searchParams.get("clientId");
  const clientSecret = searchParams.get("clientSecret");

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "clientId and clientSecret are required" },
      { status: 400 }
    );
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/auth/google-calendar/callback`;

  // Store clientId & clientSecret in a secure cookie so the callback can use them
  const oauthState = Buffer.from(
    JSON.stringify({ clientId, clientSecret })
  ).toString("base64url");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.readonly",
    access_type: "offline",
    prompt: "consent",
    state: oauthState,
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  logger.info("Initiating Google Calendar OAuth flow", { clientId: clientId.slice(0, 8) + "..." });

  const response = NextResponse.redirect(googleAuthUrl);

  // Also store in a cookie as backup (state param could be stripped by proxies)
  response.cookies.set("google_oauth_creds", oauthState, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return response;
}
