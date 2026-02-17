"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/server/db/prisma";
import { createCalendarSchema, updateCalendarSchema, type CreateCalendarInput, type UpdateCalendarInput } from "./schemas";
import { encryptProviderCredentials, decryptProviderCredentials, getProviderAdapter } from "./providers";
import { createAuditLog } from "@/server/middleware/audit";
import { logger } from "@/server/lib/logger";
import { type CalendarProvider, type Prisma } from "@prisma/client";

export async function getCalendars() {
  const calendars = await prisma.calendar.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { events: true, rooms: true },
      },
    },
  });

  return calendars.map((cal) => ({
    id: cal.id,
    name: cal.name,
    provider: cal.provider,
    color: cal.color,
    syncStatus: cal.syncStatus,
    lastSyncAt: cal.lastSyncAt,
    lastSyncError: cal.lastSyncError,
    syncIntervalSeconds: cal.syncIntervalSeconds,
    enabled: cal.enabled,
    eventCount: cal._count.events,
    roomCount: cal._count.rooms,
    createdAt: cal.createdAt,
    updatedAt: cal.updatedAt,
  }));
}

export async function getCalendar(id: string) {
  const calendar = await prisma.calendar.findUnique({
    where: { id },
    include: {
      _count: { select: { events: true, rooms: true } },
    },
  });

  if (!calendar) return null;

  return {
    ...calendar,
    credentials: decryptProviderCredentials(calendar.credentialsEncrypted, calendar.provider),
    eventCount: calendar._count.events,
    roomCount: calendar._count.rooms,
  };
}

export async function createCalendar(input: CreateCalendarInput) {
  const validated = createCalendarSchema.parse(input);
  const { credentials, ...calendarData } = validated;

  const encrypted = encryptProviderCredentials(credentials as unknown as Record<string, unknown>);

  const calendar = await prisma.calendar.create({
    data: {
      name: calendarData.name,
      provider: credentials.provider as CalendarProvider,
      color: calendarData.color,
      syncIntervalSeconds: calendarData.syncIntervalSeconds,
      credentialsEncrypted: encrypted,
      nextSyncAt: new Date(),
    },
  });

  await createAuditLog({
    action: "CREATE",
    entityType: "Calendar",
    entityId: calendar.id,
    entityName: calendar.name,
    details: { provider: credentials.provider },
  });

  revalidatePath("/admin/calendars");
  return calendar;
}

export async function updateCalendar(id: string, input: UpdateCalendarInput) {
  const validated = updateCalendarSchema.parse(input);
  const { credentials, ...updateData } = validated;

  const data: Prisma.CalendarUpdateInput = {};
  if (updateData.name !== undefined) data.name = updateData.name;
  if (updateData.color !== undefined) data.color = updateData.color;
  if (updateData.syncIntervalSeconds !== undefined) data.syncIntervalSeconds = updateData.syncIntervalSeconds;
  if (updateData.enabled !== undefined) data.enabled = updateData.enabled;

  if (credentials) {
    data.credentialsEncrypted = encryptProviderCredentials(credentials as unknown as Record<string, unknown>);
    data.provider = credentials.provider as CalendarProvider;
  }

  const calendar = await prisma.calendar.update({
    where: { id },
    data,
  });

  await createAuditLog({
    action: "UPDATE",
    entityType: "Calendar",
    entityId: calendar.id,
    entityName: calendar.name,
  });

  revalidatePath("/admin/calendars");
  return calendar;
}

export async function deleteCalendar(id: string) {
  const calendar = await prisma.calendar.findUnique({ where: { id } });
  if (!calendar) throw new Error("Calendar not found");

  await prisma.calendar.delete({ where: { id } });

  await createAuditLog({
    action: "DELETE",
    entityType: "Calendar",
    entityId: id,
    entityName: calendar.name,
  });

  revalidatePath("/admin/calendars");
}

export async function testCalendarConnection(
  provider: CalendarProvider,
  credentials: Record<string, string>
) {
  const adapter = getProviderAdapter(provider);
  return adapter.testConnection(credentials);
}

export async function triggerCalendarSync(id: string) {
  const calendar = await prisma.calendar.findUnique({ where: { id } });
  if (!calendar) throw new Error("Calendar not found");

  await prisma.calendar.update({
    where: { id },
    data: { nextSyncAt: new Date() },
  });

  revalidatePath("/admin/calendars");
  return { success: true };
}
