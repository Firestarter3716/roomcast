import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count };
}

/**
 * Extract client IP from a NextRequest.
 * Checks x-forwarded-for first (reverse proxy), then falls back to request IP.
 */
function getIpFromRequest(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Rate-limit helper for Next.js API route handlers.
 *
 * Call at the top of a route handler. Returns a 429 Response when the limit
 * is exceeded, or `null` when the request is allowed through.
 *
 * @example
 *   export async function POST(request: NextRequest) {
 *     const limited = rateLimitRoute(request, "api:auth", 10, 60_000);
 *     if (limited) return limited;
 *     // ... handle request
 *   }
 */
export function rateLimitRoute(
  request: NextRequest,
  prefix: string,
  limit: number,
  windowMs: number,
): NextResponse | null {
  const ip = getIpFromRequest(request);
  const key = `${prefix}:${ip}`;
  const { allowed, remaining } = rateLimit(key, limit, windowMs);

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(windowMs / 1000)),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  return null;
}

/**
 * Rate-limit helper for Next.js Server Actions.
 *
 * Server Actions don't receive a NextRequest object, so we read the IP from
 * next/headers instead. Throws nothing — returns a result object so the
 * calling action can decide what to send back to the client.
 *
 * @example
 *   const limited = await rateLimitAction("password-reset", 5, 60_000);
 *   if (!limited.allowed) return { success: false, error: limited.error };
 */
export async function rateLimitAction(
  prefix: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: true } | { allowed: false; error: string }> {
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    "unknown";

  const key = `${prefix}:${ip}`;
  const { allowed } = rateLimit(key, limit, windowMs);

  if (!allowed) {
    return { allowed: false, error: "Too many requests. Please try again later." };
  }

  return { allowed: true };
}

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
      if (now > entry.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}
