"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/server/db/prisma";
import { createCalendarSchema, updateCalendarSchema, type CreateCalendarInput, type UpdateCalendarInput } from "./schemas";
import { encryptProviderCredentials, decryptProviderCredentials, getProviderAdapter } from "./providers";
import { createAuditLog } from "@/server/middleware/audit";
import { logger } from "@/server/lib/logger";
import { type CalendarProvider, type Prisma } from "@prisma/client";
import { requireActionAuth } from "@/server/auth/require-auth";

export async function getCalendars() {
  await requireActionAuth("VIEWER");
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
  await requireActionAuth("VIEWER");
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
  await requireActionAuth("EDITOR");
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
  await requireActionAuth("EDITOR");
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
  await requireActionAuth("EDITOR");
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
  await requireActionAuth("EDITOR");
  const adapter = getProviderAdapter(provider);
  return adapter.testConnection(credentials);
}

export async function triggerCalendarSync(id: string) {
  await requireActionAuth("EDITOR");
  const calendar = await prisma.calendar.findUnique({ where: { id } });
  if (!calendar) throw new Error("Calendar not found");

  await prisma.calendar.update({
    where: { id },
    data: { nextSyncAt: new Date() },
  });

  revalidatePath("/admin/calendars");
  return { success: true };
}

/**
 * Lists Google Calendars using the provided OAuth credentials.
 * Returns an array of { id, summary } objects.
 */
export async function listGoogleCalendars(credentials: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<{ id: string; summary: string }[]> {
  await requireActionAuth("EDITOR");

  try {
    // Get an access token using the refresh token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        refresh_token: credentials.refreshToken,
        grant_type: "refresh_token",
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error("Google token refresh failed in listGoogleCalendars", {
        status: tokenResponse.status,
        error: errorText,
      });
      throw new Error("Failed to refresh access token. Please re-authorize.");
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Fetch the calendar list
    const calendarListResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!calendarListResponse.ok) {
      const errorText = await calendarListResponse.text();
      logger.error("Google calendarList API failed", {
        status: calendarListResponse.status,
        error: errorText,
      });
      throw new Error(`Google API error (${calendarListResponse.status})`);
    }

    const data = await calendarListResponse.json();
    const items: Array<{ id: string; summary: string }> = (data.items || []).map(
      (cal: { id: string; summary: string }) => ({
        id: cal.id,
        summary: cal.summary,
      })
    );

    return items;
  } catch (error) {
    logger.error("listGoogleCalendars failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Discovers CalDAV calendars on the given server using PROPFIND.
 * Returns an array of { id, name, path } objects.
 */
export async function discoverCalDavCalendars(
  serverUrl: string,
  username: string,
  password: string
): Promise<{ id: string; name: string; path: string }[]> {
  await requireActionAuth("EDITOR");

  try {
    const adapter = getProviderAdapter("CALDAV");
    if (!adapter.listCalendars) {
      throw new Error("CalDAV provider does not support calendar discovery");
    }

    const calendars = await adapter.listCalendars({
      serverUrl,
      username,
      password,
    });

    return calendars.map((cal) => ({
      id: cal.id,
      name: cal.name,
      path: cal.id, // CalDAV provider returns the path as the id
    }));
  } catch (error) {
    logger.error("discoverCalDavCalendars failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
