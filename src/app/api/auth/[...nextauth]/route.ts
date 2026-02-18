import { NextRequest } from "next/server";
import { handlers } from "@/server/auth";
import { rateLimitRoute } from "@/server/middleware/rate-limit";

const { GET: authGET, POST: authPOST } = handlers;

export async function GET(request: NextRequest) {
  const limited = rateLimitRoute(request, "api:auth", 60, 60_000);
  if (limited) return limited;
  return authGET(request);
}

export async function POST(request: NextRequest) {
  const limited = rateLimitRoute(request, "api:auth", 60, 60_000);
  if (limited) return limited;
  return authPOST(request);
}
