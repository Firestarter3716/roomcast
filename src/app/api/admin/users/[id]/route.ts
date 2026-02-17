import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/require-auth";
import { getUser, updateUser, deleteUser } from "@/features/users/actions";
import { handleApiError } from "@/shared/lib/api-error";
import { rateLimitRoute } from "@/server/middleware/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitRoute(request, "api:admin:users", 100, 60_000);
  if (limited) return limited;
  const { error } = await requireAuth("ADMIN");
  if (error) return error;
  try {
    const { id } = await params;
    const user = await getUser(id);
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: user });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitRoute(request, "api:admin:users", 100, 60_000);
  if (limited) return limited;
  const { error } = await requireAuth("ADMIN");
  if (error) return error;
  try {
    const { id } = await params;
    const body = await request.json();
    const user = await updateUser(id, body);
    return NextResponse.json({ data: user });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitRoute(request, "api:admin:users", 100, 60_000);
  if (limited) return limited;
  const { error } = await requireAuth("ADMIN");
  if (error) return error;
  try {
    const { id } = await params;
    await deleteUser(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return handleApiError(e);
  }
}
