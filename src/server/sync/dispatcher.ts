import prisma from "@/server/db/prisma";
import { runSyncForCalendar } from "@/features/calendars/services/sync-service";
import { logger } from "@/server/lib/logger";

export async function dispatchSync(): Promise<void> {
  const now = new Date();

  // Recover calendars stuck in SYNCING for more than 5 minutes
  const staleThreshold = new Date(now.getTime() - 5 * 60 * 1000);
  const staleCount = await prisma.calendar.updateMany({
    where: {
      syncStatus: "SYNCING",
      updatedAt: { lte: staleThreshold },
    },
    data: {
      syncStatus: "ERROR",
      lastSyncError: "Sync timed out (stuck in SYNCING state)",
      nextSyncAt: now,
    },
  });
  if (staleCount.count > 0) {
    logger.warn("Recovered stale SYNCING calendars", { count: staleCount.count });
  }

  // Find calendars that are due for sync
  const dueCalendars = await prisma.calendar.findMany({
    where: {
      enabled: true,
      syncStatus: { not: "SYNCING" },
      OR: [
        { nextSyncAt: { lte: now } },
        { nextSyncAt: null },
      ],
    },
    select: { id: true, name: true },
    take: 10, // Process max 10 at a time
  });

  if (dueCalendars.length === 0) {
    return;
  }

  logger.info("Dispatching sync", { count: dueCalendars.length });

  // Run syncs in parallel (with a limit)
  const results = await Promise.allSettled(
    dueCalendars.map((cal) => runSyncForCalendar(cal.id))
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const calendar = dueCalendars[i];
    if (result.status === "rejected") {
      logger.error("Sync dispatch failed for calendar", {
        calendarId: calendar.id,
        calendarName: calendar.name,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  }
}
