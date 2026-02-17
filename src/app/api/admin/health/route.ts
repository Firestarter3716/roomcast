import { NextResponse } from "next/server";
import prisma from "@/server/db/prisma";
import { sseRegistry } from "@/server/sse/registry";
import { requireAuth } from "@/server/auth/require-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { error } = await requireAuth("ADMIN");
    if (error) return error;

    // Database connectivity check with timing
    let dbStatus: { connected: boolean; responseTimeMs: number };
    try {
      const dbStart = performance.now();
      await prisma.$queryRaw`SELECT 1`;
      const dbEnd = performance.now();
      dbStatus = { connected: true, responseTimeMs: Math.round(dbEnd - dbStart) };
    } catch {
      dbStatus = { connected: false, responseTimeMs: -1 };
    }

    const [calendarCount, eventCount, displayCount, sseStatus] = await Promise.all([
      prisma.calendar.count(),
      prisma.calendarEvent.count(),
      prisma.display.count(),
      Promise.resolve(sseRegistry.getStatus()),
    ]);

    const calendarsWithStatus = await prisma.calendar.findMany({
      select: { id: true, name: true, provider: true, syncStatus: true, lastSyncAt: true, lastSyncError: true, consecutiveErrors: true, enabled: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      status: dbStatus.connected ? "healthy" : "degraded",
      database: dbStatus,
      calendars: calendarCount,
      events: eventCount,
      displays: displayCount,
      sse: sseStatus,
      calendarSync: calendarsWithStatus,
    });
  } catch (error) {
    return NextResponse.json(
      { status: "unhealthy", error: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
