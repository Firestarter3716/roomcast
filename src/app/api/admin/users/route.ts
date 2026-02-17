import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/require-auth";
import { getUsers, createUser } from "@/features/users/actions";
import { handleApiError } from "@/shared/lib/api-error";

export async function GET() {
  const { error } = await requireAuth("ADMIN");
  if (error) return error;
  try {
    const users = await getUsers();
    return NextResponse.json({ data: users });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth("ADMIN");
  if (error) return error;
  try {
    const body = await request.json();
    const user = await createUser(body);
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
