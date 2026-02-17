import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/require-auth";
import { getSystemSettings, updateSystemSettings } from "@/features/settings/actions";
import { handleApiError } from "@/shared/lib/api-error";
import { rateLimitRoute } from "@/server/middleware/rate-limit";

export async function GET(request: NextRequest) {
  const limited = rateLimitRoute(request, "api:admin:settings", 100, 60_000);
  if (limited) return limited;
  const { error } = await requireAuth("ADMIN");
  if (error) return error;
  try {
    const settings = await getSystemSettings();
    return NextResponse.json({ data: settings });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(request: NextRequest) {
  const limited = rateLimitRoute(request, "api:admin:settings", 100, 60_000);
  if (limited) return limited;
  const { error } = await requireAuth("ADMIN");
  if (error) return error;
  try {
    const body = await request.json();
    const settings = await updateSystemSettings(body);
    return NextResponse.json({ data: settings });
  } catch (e) {
    return handleApiError(e);
  }
}
