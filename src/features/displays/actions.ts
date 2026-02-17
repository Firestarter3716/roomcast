"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/server/db/prisma";
import { createDisplaySchema, updateDisplaySchema, type CreateDisplayInput, type UpdateDisplayInput } from "./schemas";
import { createAuditLog } from "@/server/middleware/audit";
import { generateToken } from "@/shared/lib/utils";
import { sanitizeObject } from "@/shared/lib/sanitize";
import { type LayoutType, type Orientation, Prisma } from "@prisma/client";
import {
  DEFAULT_THEME,
  DEFAULT_BRANDING,
  DEFAULT_BACKGROUND,
  getDefaultLayoutConfig,
} from "./types";
import { sseRegistry } from "@/server/sse/registry";
import { requireActionAuth } from "@/server/auth/require-auth";

export async function getDisplays() {
  await requireActionAuth("VIEWER");
  const displays = await prisma.display.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      room: { select: { id: true, name: true } },
      displayCalendars: {
        include: { calendar: { select: { id: true, name: true, provider: true, color: true } } },
      },
    },
  });

  return displays.map((d) => ({
    id: d.id,
    name: d.name,
    token: d.token,
    orientation: d.orientation,
    layoutType: d.layoutType,
    config: d.config,
    room: d.room,
    calendars: d.displayCalendars.map((dc) => dc.calendar),
    ipWhitelist: d.ipWhitelist,
    defaultTheme: d.defaultTheme,
    defaultLang: d.defaultLang,
    refreshRate: d.refreshRate,
    enabled: d.enabled,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }));
}

export async function getDisplay(id: string) {
  await requireActionAuth("VIEWER");
  const display = await prisma.display.findUnique({
    where: { id },
    include: {
      room: { select: { id: true, name: true, calendarId: true } },
      displayCalendars: {
        include: { calendar: { select: { id: true, name: true, provider: true, color: true } } },
      },
    },
  });

  if (!display) return null;

  return {
    ...display,
    calendars: display.displayCalendars.map((dc) => dc.calendar),
  };
}

export async function getDisplayByToken(token: string) {
  const display = await prisma.display.findUnique({
    where: { token },
    include: {
      room: {
        include: {
          calendar: { select: { id: true, name: true, color: true } },
        },
      },
      displayCalendars: {
        include: { calendar: { select: { id: true, name: true, color: true } } },
      },
    },
  });

  if (!display || !display.enabled) return null;
  return display;
}

export async function createDisplay(input: CreateDisplayInput) {
  await requireActionAuth("EDITOR");
  const validated = createDisplaySchema.parse(input);
  const token = generateToken();

  const defaultConfig = {
    theme: { ...DEFAULT_THEME },
    branding: { ...DEFAULT_BRANDING },
    background: { ...DEFAULT_BACKGROUND },
    layout: getDefaultLayoutConfig(validated.layoutType),
  };

  const display = await prisma.display.create({
    data: {
      name: validated.name,
      token,
      orientation: validated.orientation as Orientation,
      layoutType: validated.layoutType as LayoutType,
      config: defaultConfig,
      roomId: validated.roomId || null,
      displayCalendars: validated.calendarIds?.length
        ? {
            create: validated.calendarIds.map((calId) => ({
              calendarId: calId,
            })),
          }
        : undefined,
    },
  });

  await createAuditLog({
    action: "CREATE",
    entityType: "Display",
    entityId: display.id,
    entityName: display.name,
    details: { layoutType: validated.layoutType },
  });

  revalidatePath("/admin/displays");
  return display;
}

export async function updateDisplay(id: string, input: UpdateDisplayInput) {
  await requireActionAuth("EDITOR");
  const validated = updateDisplaySchema.parse(input);
  const { config, ...updateData } = validated;

  const data: Record<string, unknown> = {};
  if (updateData.name !== undefined) data.name = updateData.name;
  if (updateData.orientation !== undefined) data.orientation = updateData.orientation;
  if (updateData.layoutType !== undefined) data.layoutType = updateData.layoutType;
  if (updateData.roomId !== undefined) data.roomId = updateData.roomId || null;
  if (updateData.ipWhitelist !== undefined) data.ipWhitelist = updateData.ipWhitelist;
  if (updateData.defaultTheme !== undefined) data.defaultTheme = updateData.defaultTheme;
  if (updateData.defaultLang !== undefined) data.defaultLang = updateData.defaultLang;
  if (updateData.refreshRate !== undefined) data.refreshRate = updateData.refreshRate;
  if (updateData.enabled !== undefined) data.enabled = updateData.enabled;
  if (config !== undefined) data.config = config;

  const display = await prisma.display.update({
    where: { id },
    data,
  });

  await createAuditLog({
    action: "UPDATE",
    entityType: "Display",
    entityId: display.id,
    entityName: display.name,
  });

  revalidatePath("/admin/displays");
  return display;
}

export async function updateDisplayConfig(id: string, config: Record<string, unknown>) {
  await requireActionAuth("EDITOR");
  const sanitizedConfig = sanitizeObject(config);
  const display = await prisma.display.update({
    where: { id },
    data: { config: sanitizedConfig as Prisma.InputJsonValue },
  });

  // Notify connected display clients of config change
  sseRegistry.notifyDisplayConfigUpdate(id, sanitizedConfig);

  revalidatePath("/admin/displays");
  return display;
}

export async function updateDisplayCalendars(id: string, calendarIds: string[]) {
  await requireActionAuth("EDITOR");
  await prisma.$transaction([
    prisma.displayCalendar.deleteMany({ where: { displayId: id } }),
    ...calendarIds.map((calId) =>
      prisma.displayCalendar.create({
        data: { displayId: id, calendarId: calId },
      })
    ),
  ]);

  revalidatePath("/admin/displays");
}

export async function regenerateDisplayToken(id: string) {
  await requireActionAuth("EDITOR");
  const token = generateToken();

  const display = await prisma.display.update({
    where: { id },
    data: { token },
  });

  await createAuditLog({
    action: "TOKEN_REGENERATE",
    entityType: "Display",
    entityId: display.id,
    entityName: display.name,
  });

  revalidatePath("/admin/displays");
  return { token };
}

export async function deleteDisplay(id: string) {
  await requireActionAuth("EDITOR");
  const display = await prisma.display.findUnique({ where: { id } });
  if (!display) throw new Error("Display not found");

  await prisma.display.delete({ where: { id } });

  await createAuditLog({
    action: "DELETE",
    entityType: "Display",
    entityId: id,
    entityName: display.name,
  });

  revalidatePath("/admin/displays");
}

export async function getDisplayPreviewEvents(displayId: string) {
  await requireActionAuth("VIEWER");

  const display = await prisma.display.findUnique({
    where: { id: displayId },
    include: {
      room: { select: { calendarId: true, name: true } },
      displayCalendars: { select: { calendarId: true } },
    },
  });

  if (!display) return { events: [], roomName: undefined };

  const calendarIds: string[] = [];
  if (display.room?.calendarId) calendarIds.push(display.room.calendarId);
  for (const dc of display.displayCalendars) {
    if (!calendarIds.includes(dc.calendarId)) calendarIds.push(dc.calendarId);
  }

  if (calendarIds.length === 0) {
    return { events: [], roomName: display.room?.name };
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

  return {
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
    roomName: display.room?.name,
  };
}
