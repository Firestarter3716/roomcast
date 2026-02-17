import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/require-auth";
import { getAuditLogs } from "@/features/audit/actions";
import { handleApiError } from "@/shared/lib/api-error";
import { rateLimitRoute } from "@/server/middleware/rate-limit";

export async function GET(request: NextRequest) {
  const limited = rateLimitRoute(request, "api:admin:audit", 100, 60_000);
  if (limited) return limited;
  const { error } = await requireAuth("ADMIN");
  if (error) return error;
  try {
    const { searchParams } = request.nextUrl;
    const filters = {
      entityType: searchParams.get("entityType") || undefined,
      action: searchParams.get("action") || undefined,
      userId: searchParams.get("userId") || undefined,
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      page: searchParams.has("page") ? Number(searchParams.get("page")) : undefined,
      perPage: searchParams.has("perPage") ? Number(searchParams.get("perPage")) : undefined,
    };
    const result = await getAuditLogs(filters);
    return NextResponse.json({ data: result });
  } catch (e) {
    return handleApiError(e);
  }
}
