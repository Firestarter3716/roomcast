import { auth } from "@/server/auth";
import { NextResponse } from "next/server";

type Role = "ADMIN" | "EDITOR" | "VIEWER";

export async function requireAuth(minRole?: Role) {
  const session = await auth();

  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }

  if (minRole) {
    const roleHierarchy: Record<Role, number> = { VIEWER: 0, EDITOR: 1, ADMIN: 2 };
    const userLevel = roleHierarchy[(session.user as { role: string }).role as Role] ?? -1;
    const requiredLevel = roleHierarchy[minRole];
    if (userLevel < requiredLevel) {
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
    }
  }

  return { error: null, session };
}

/**
 * Auth check for server actions. Throws on failure instead of returning NextResponse.
 */
export async function requireActionAuth(minRole?: Role) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (minRole) {
    const roleHierarchy: Record<Role, number> = { VIEWER: 0, EDITOR: 1, ADMIN: 2 };
    const userLevel = roleHierarchy[(session.user as { role: string }).role as Role] ?? -1;
    const requiredLevel = roleHierarchy[minRole];
    if (userLevel < requiredLevel) {
      throw new Error("Forbidden");
    }
  }

  return session;
}
