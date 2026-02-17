import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/require-auth";
import { logger } from "@/server/lib/logger";

/**
 * GET /api/auth/google-calendar/callback
 *
 * Handles the OAuth callback from Google. Exchanges the authorization code
 * for tokens and redirects back to the calendar form with the refresh token.
 */
export async function GET(request: NextRequest) {
  const { error } = await requireAuth("EDITOR");
  if (error) return error;

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (oauthError) {
    logger.warn("Google OAuth denied by user", { error: oauthError });
    return NextResponse.redirect(
      `${baseUrl}/admin/calendars/new?google_error=${encodeURIComponent(oauthError)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${baseUrl}/admin/calendars/new?google_error=${encodeURIComponent("No authorization code received")}`
    );
  }

  // Retrieve client credentials from state param or cookie
  let clientId: string;
  let clientSecret: string;

  try {
    const stateData = state || request.cookies.get("google_oauth_creds")?.value;
    if (!stateData) {
      throw new Error("Missing OAuth state");
    }
    const parsed = JSON.parse(Buffer.from(stateData, "base64url").toString());
    clientId = parsed.clientId;
    clientSecret = parsed.clientSecret;

    if (!clientId || !clientSecret) {
      throw new Error("Invalid OAuth state data");
    }
  } catch (err) {
    logger.error("Failed to parse Google OAuth state", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.redirect(
      `${baseUrl}/admin/calendars/new?google_error=${encodeURIComponent("Invalid OAuth state. Please try again.")}`
    );
  }

  const redirectUri = `${baseUrl}/api/auth/google-calendar/callback`;

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error("Google token exchange failed", {
        status: tokenResponse.status,
        error: errorText,
      });
      return NextResponse.redirect(
        `${baseUrl}/admin/calendars/new?google_error=${encodeURIComponent("Token exchange failed. Please try again.")}`
      );
    }

    const tokenData = await tokenResponse.json();
    const refreshToken = tokenData.refresh_token;

    if (!refreshToken) {
      logger.error("No refresh token in Google response", {
        hasAccessToken: !!tokenData.access_token,
      });
      return NextResponse.redirect(
        `${baseUrl}/admin/calendars/new?google_error=${encodeURIComponent("No refresh token received. Please revoke app access in Google settings and try again.")}`
      );
    }

    logger.info("Google Calendar OAuth completed successfully");

    // Redirect back to the calendar form with the refresh token
    const response = NextResponse.redirect(
      `${baseUrl}/admin/calendars/new?google_refresh_token=${encodeURIComponent(refreshToken)}`
    );

    // Clean up the credentials cookie
    response.cookies.delete("google_oauth_creds");

    return response;
  } catch (err) {
    logger.error("Google OAuth callback error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.redirect(
      `${baseUrl}/admin/calendars/new?google_error=${encodeURIComponent("OAuth flow failed. Please try again.")}`
    );
  }
}
