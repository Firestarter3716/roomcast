import { NextRequest, NextResponse } from "next/server";
import { testCalendarConnection } from "@/features/calendars/actions";
import { calendarCredentialsSchema } from "@/features/calendars/schemas";
import { handleApiError } from "@/shared/lib/api-error";
import { requireAuth } from "@/server/auth/require-auth";
import { rateLimitRoute } from "@/server/middleware/rate-limit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitRoute(request, "api:calendars:test", 10, 60_000);
  if (limited) return limited;
  try {
    const { error } = await requireAuth("EDITOR");
    if (error) return error;

    const body = await request.json();
    const validated = calendarCredentialsSchema.parse(body);
    const { provider, ...credentials } = validated;
    const result = await testCalendarConnection(
      provider as "EXCHANGE" | "GOOGLE" | "CALDAV" | "ICS",
      credentials as unknown as Record<string, string>
    );
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
