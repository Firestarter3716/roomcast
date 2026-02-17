import { NextRequest, NextResponse } from "next/server";
import { triggerCalendarSync } from "@/features/calendars/actions";
import { handleApiError } from "@/shared/lib/api-error";
import { requireAuth } from "@/server/auth/require-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAuth("EDITOR");
    if (error) return error;

    const { id } = await params;
    const result = await triggerCalendarSync(id);
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
