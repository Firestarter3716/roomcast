import { NextResponse } from "next/server";
import prisma from "@/server/db/prisma";
import { sseRegistry } from "@/server/sse/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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
      status: "healthy",
      database: "connected",
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
