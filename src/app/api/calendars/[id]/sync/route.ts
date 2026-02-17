import { NextRequest, NextResponse } from "next/server";
import { triggerCalendarSync } from "@/features/calendars/actions";
import { handleApiError } from "@/shared/lib/api-error";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await triggerCalendarSync(id);
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
