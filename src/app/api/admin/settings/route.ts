import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/require-auth";
import { getSystemSettings, updateSystemSettings } from "@/features/settings/actions";
import { handleApiError } from "@/shared/lib/api-error";

export async function GET() {
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
