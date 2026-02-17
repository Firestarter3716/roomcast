import { type NextRequest } from "next/server";
import prisma from "@/server/db/prisma";
import { sseRegistry } from "@/server/sse/registry";
import { isIpInWhitelist } from "@/shared/lib/ip-utils";

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
    return new Response("Display not found", { status: 404 });
  }

  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  if (!isIpInWhitelist(clientIp, display.ipWhitelist)) {
    return new Response("Forbidden", { status: 403 });
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

  const clientId = crypto.randomUUID();

  const stream = new ReadableStream({
    start(controller) {
      sseRegistry.register({
        id: clientId,
        displayId: display.id,
        calendarIds,
        controller,
        connectedAt: new Date(),
        lastHeartbeat: new Date(),
      });

      const encoder = new TextEncoder();
      const initialPayload = JSON.stringify({
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
      controller.enqueue(encoder.encode(`data: ${initialPayload}\n\n`));
    },
    cancel() {
      sseRegistry.unregister(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
