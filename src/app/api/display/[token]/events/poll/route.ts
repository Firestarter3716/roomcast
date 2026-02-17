import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/server/db/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const display = await prisma.display.findUnique({
    where: { token },
    include: {
      room: { select: { calendarId: true } },
      displayCalendars: { select: { calendarId: true } },
    },
  });

  if (!display || !display.enabled) {
    return NextResponse.json({ error: "Display not found" }, { status: 404 });
  }

  if (display.ipWhitelist.length > 0) {
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (!display.ipWhitelist.includes(clientIp)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const calendarIds: string[] = [];
  if (display.room?.calendarId) calendarIds.push(display.room.calendarId);
  for (const dc of display.displayCalendars) {
    if (!calendarIds.includes(dc.calendarId)) calendarIds.push(dc.calendarId);
  }

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 7);

  const events = await prisma.calendarEvent.findMany({
    where: {
      calendarId: { in: calendarIds },
      endTime: { gte: dayStart },
      startTime: { lte: dayEnd },
    },
    orderBy: { startTime: "asc" },
    include: { calendar: { select: { color: true, name: true } } },
  });

  return NextResponse.json({
    type: "init",
    displayId: display.id,
    config: display.config,
    events: events.map((e) => ({
      id: e.id,
      calendarId: e.calendarId,
      calendarColor: e.calendar.color,
      calendarName: e.calendar.name,
      title: e.title,
      description: e.description,
      location: e.location,
      organizer: e.organizer,
      attendeeCount: e.attendeeCount,
      startTime: e.startTime.toISOString(),
      endTime: e.endTime.toISOString(),
      isAllDay: e.isAllDay,
      isRecurring: e.isRecurring,
    })),
  });
}
