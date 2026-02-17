import prisma from "@/server/db/prisma";
import { getProviderAdapter, decryptProviderCredentials } from "../providers";
import { type ExternalEvent } from "../providers/types";
import { logger } from "@/server/lib/logger";
import { type Prisma } from "@prisma/client";
import { sseRegistry } from "@/server/sse/registry";

export interface SyncResult {
  calendarId: string;
  created: number;
  updated: number;
  deleted: number;
  error?: string;
}

function hasChanged(
  cached: { title: string; startTime: Date; endTime: Date; location: string | null; organizer: string | null },
  external: ExternalEvent
): boolean {
  return (
    cached.title !== external.title ||
    cached.startTime.getTime() !== external.startTime.getTime() ||
    cached.endTime.getTime() !== external.endTime.getTime() ||
    cached.location !== (external.location ?? null) ||
    cached.organizer !== (external.organizer ?? null)
  );
}

function mapToDbFields(event: ExternalEvent, calendarId: string): Prisma.CalendarEventCreateInput {
  return {
    calendar: { connect: { id: calendarId } },
    externalId: event.externalId,
    title: event.title,
    description: event.description ?? null,
    location: event.location ?? null,
    organizer: event.organizer ?? null,
    attendeeCount: event.attendeeCount ?? null,
    startTime: event.startTime,
    endTime: event.endTime,
    isAllDay: event.isAllDay,
    isRecurring: event.isRecurring,
    recurrenceId: event.recurrenceId ?? null,
    rawData: event.rawData as Prisma.InputJsonValue ?? undefined,
  };
}

export async function syncCalendar(calendarId: string): Promise<SyncResult> {
  const calendar = await prisma.calendar.findUniqueOrThrow({
    where: { id: calendarId },
  });

  const credentials = decryptProviderCredentials(
    calendar.credentialsEncrypted,
    calendar.provider
  );
  const adapter = getProviderAdapter(calendar.provider);

  const now = new Date();
  const start = new Date(now.getTime() - calendar.cachePastDays * 24 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + calendar.cacheFutureDays * 24 * 60 * 60 * 1000);

  // Fetch from external provider
  const externalEvents = await adapter.fetchEvents(credentials, { start, end });

  // Fetch current cached events
  const cachedEvents = await prisma.calendarEvent.findMany({
    where: {
      calendarId,
      startTime: { gte: start },
      endTime: { lte: end },
    },
  });

  const cachedMap = new Map(cachedEvents.map((e) => [e.externalId, e]));
  const externalMap = new Map(externalEvents.map((e) => [e.externalId, e]));

  const toCreate: ExternalEvent[] = [];
  const toUpdate: { id: string; data: ExternalEvent }[] = [];
  const toDeleteIds: string[] = [];

  // Determine creates and updates
  for (const [extId, extEvent] of externalMap) {
    const cached = cachedMap.get(extId);
    if (!cached) {
      toCreate.push(extEvent);
    } else if (hasChanged(cached, extEvent)) {
      toUpdate.push({ id: cached.id, data: extEvent });
    }
  }

  // Determine deletes
  for (const [extId, cached] of cachedMap) {
    if (!externalMap.has(extId)) {
      toDeleteIds.push(cached.id);
    }
  }

  // Execute in transaction
  const operations: Prisma.PrismaPromise<unknown>[] = [];

  for (const event of toCreate) {
    operations.push(
      prisma.calendarEvent.create({
        data: mapToDbFields(event, calendarId),
      })
    );
  }

  for (const { id, data } of toUpdate) {
    operations.push(
      prisma.calendarEvent.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description ?? null,
          location: data.location ?? null,
          organizer: data.organizer ?? null,
          attendeeCount: data.attendeeCount ?? null,
          startTime: data.startTime,
          endTime: data.endTime,
          isAllDay: data.isAllDay,
          isRecurring: data.isRecurring,
          recurrenceId: data.recurrenceId ?? null,
          rawData: data.rawData as Prisma.InputJsonValue ?? undefined,
        },
      })
    );
  }

  if (toDeleteIds.length > 0) {
    operations.push(
      prisma.calendarEvent.deleteMany({
        where: { id: { in: toDeleteIds } },
      })
    );
  }

  if (operations.length > 0) {
    await prisma.$transaction(operations);
  }

  logger.info("Calendar sync completed", {
    calendarId,
    calendarName: calendar.name,
    created: toCreate.length,
    updated: toUpdate.length,
    deleted: toDeleteIds.length,
    total: externalEvents.length,
  });

  // Notify connected display clients via SSE
  if (toCreate.length > 0 || toUpdate.length > 0 || toDeleteIds.length > 0) {
    const updatedEvents = await prisma.calendarEvent.findMany({
      where: { calendarId, startTime: { gte: start }, endTime: { lte: end } },
      orderBy: { startTime: "asc" },
    });
    sseRegistry.notifyCalendarUpdate(calendarId, updatedEvents);
  }

  return {
    calendarId,
    created: toCreate.length,
    updated: toUpdate.length,
    deleted: toDeleteIds.length,
  };
}

function computeNextSyncAt(syncIntervalSeconds: number, consecutiveErrors: number, hasError: boolean): Date {
  if (!hasError) {
    return new Date(Date.now() + syncIntervalSeconds * 1000);
  }
  // Exponential backoff: 1min, 2min, 4min, 8min, capped at 30min
  const backoffMs = Math.min(
    60_000 * Math.pow(2, consecutiveErrors),
    30 * 60 * 1000
  );
  return new Date(Date.now() + backoffMs);
}

export async function runSyncForCalendar(calendarId: string): Promise<SyncResult> {
  // Mark as syncing
  await prisma.calendar.update({
    where: { id: calendarId },
    data: { syncStatus: "SYNCING" },
  });

  try {
    const result = await syncCalendar(calendarId);

    // Update calendar status
    const calendar = await prisma.calendar.findUniqueOrThrow({ where: { id: calendarId } });
    await prisma.calendar.update({
      where: { id: calendarId },
      data: {
        syncStatus: "IDLE",
        lastSyncAt: new Date(),
        lastSyncError: null,
        consecutiveErrors: 0,
        nextSyncAt: computeNextSyncAt(calendar.syncIntervalSeconds, 0, false),
      },
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Calendar sync failed", { calendarId, error: errorMessage });

    const calendar = await prisma.calendar.findUniqueOrThrow({ where: { id: calendarId } });
    const newConsecutiveErrors = calendar.consecutiveErrors + 1;

    await prisma.calendar.update({
      where: { id: calendarId },
      data: {
        syncStatus: "ERROR",
        lastSyncError: errorMessage,
        consecutiveErrors: newConsecutiveErrors,
        nextSyncAt: computeNextSyncAt(calendar.syncIntervalSeconds, newConsecutiveErrors, true),
      },
    });

    return { calendarId, created: 0, updated: 0, deleted: 0, error: errorMessage };
  }
}
