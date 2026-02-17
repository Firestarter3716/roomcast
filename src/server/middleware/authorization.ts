import { type Role } from "@prisma/client";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AppSession {
  user: SessionUser;
}

export class AuthorizationError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = "AuthorizationError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function requireAuth(session: AppSession | null): asserts session is AppSession {
  if (!session?.user) {
    throw new AuthorizationError("Authentication required", "UNAUTHORIZED", 401);
  }
}

export function requireRole(session: AppSession | null, allowedRoles: Role[]): asserts session is AppSession {
  requireAuth(session);
  if (!allowedRoles.includes(session.user.role)) {
    throw new AuthorizationError("Insufficient permissions", "FORBIDDEN", 403);
  }
}
