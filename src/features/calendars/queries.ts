import prisma from "@/server/db/prisma";

export async function getCalendarsForSelect() {
  return prisma.calendar.findMany({
    where: { enabled: true },
    select: {
      id: true,
      name: true,
      provider: true,
      color: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function getCalendarEvents(calendarId: string, start: Date, end: Date) {
  return prisma.calendarEvent.findMany({
    where: {
      calendarId,
      startTime: { lte: end },
      endTime: { gte: start },
    },
    orderBy: { startTime: "asc" },
  });
}
