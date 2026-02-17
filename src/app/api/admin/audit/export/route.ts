import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/require-auth";
import { exportAuditLogsCsv } from "@/features/audit/actions";
import { handleApiError } from "@/shared/lib/api-error";

export async function GET(request: NextRequest) {
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
    };
    const csv = await exportAuditLogsCsv(filters);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
