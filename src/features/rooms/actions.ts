"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/server/db/prisma";
import { createRoomSchema, updateRoomSchema, type CreateRoomInput, type UpdateRoomInput } from "./schemas";
import { createAuditLog } from "@/server/middleware/audit";
import { requireActionAuth } from "@/server/auth/require-auth";

export async function getRooms() {
  await requireActionAuth("VIEWER");
  const rooms = await prisma.room.findMany({
    orderBy: { name: "asc" },
    include: {
      calendar: {
        select: { id: true, name: true, color: true },
      },
      displays: {
        select: { id: true },
        take: 1,
      },
    },
  });

  return rooms.map((room) => ({
    ...room,
    hasDisplay: room.displays.length > 0,
    displayId: room.displays[0]?.id ?? null,
  }));
}

export async function getRoom(id: string) {
  await requireActionAuth("VIEWER");
  return prisma.room.findUnique({
    where: { id },
    include: {
      calendar: {
        select: { id: true, name: true, color: true },
      },
    },
  });
}

export async function createRoom(input: CreateRoomInput) {
  await requireActionAuth("EDITOR");
  const validated = createRoomSchema.parse(input);

  const room = await prisma.room.create({
    data: {
      name: validated.name,
      location: validated.location || null,
      capacity: validated.capacity ?? null,
      equipment: validated.equipment,
      calendarId: validated.calendarId,
      resourceEmail: validated.resourceEmail || null,
      resourceId: validated.resourceId || null,
    },
  });

  await createAuditLog({
    action: "CREATE",
    entityType: "Room",
    entityId: room.id,
    entityName: room.name,
  });

  revalidatePath("/admin/rooms");
  return room;
}

export async function updateRoom(id: string, input: UpdateRoomInput) {
  await requireActionAuth("EDITOR");
  const validated = updateRoomSchema.parse(input);

  const room = await prisma.room.update({
    where: { id },
    data: {
      name: validated.name,
      location: validated.location || null,
      capacity: validated.capacity ?? null,
      equipment: validated.equipment,
      calendarId: validated.calendarId,
      resourceEmail: validated.resourceEmail || null,
      resourceId: validated.resourceId || null,
    },
  });

  await createAuditLog({
    action: "UPDATE",
    entityType: "Room",
    entityId: room.id,
    entityName: room.name,
  });

  revalidatePath("/admin/rooms");
  return room;
}

export async function deleteRoom(id: string) {
  await requireActionAuth("EDITOR");
  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) throw new Error("Room not found");

  await prisma.room.delete({ where: { id } });

  await createAuditLog({
    action: "DELETE",
    entityType: "Room",
    entityId: id,
    entityName: room.name,
  });

  revalidatePath("/admin/rooms");
}

export type RoomStatus = {
  isFree: boolean;
  currentEvent: {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
  } | null;
  nextEvent: {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
  } | null;
  isEndingSoon: boolean;
  progressPercent: number;
};

export async function getRoomsWithStatus() {
  await requireActionAuth("VIEWER");

  const rooms = await prisma.room.findMany({
    orderBy: { name: "asc" },
    include: {
      calendar: {
        select: { id: true, name: true, color: true },
      },
      displays: {
        select: { id: true },
        take: 1,
      },
    },
  });

  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const calendarIds = [...new Set(rooms.map((r) => r.calendarId))];

  const events = await prisma.calendarEvent.findMany({
    where: {
      calendarId: { in: calendarIds },
      startTime: { lte: endOfDay },
      endTime: { gte: now },
    },
    orderBy: { startTime: "asc" },
    select: {
      id: true,
      calendarId: true,
      title: true,
      startTime: true,
      endTime: true,
    },
  });

  const eventsByCalendar = new Map<string, typeof events>();
  for (const event of events) {
    const list = eventsByCalendar.get(event.calendarId) ?? [];
    list.push(event);
    eventsByCalendar.set(event.calendarId, list);
  }

  return rooms.map((room) => {
    const roomEvents = eventsByCalendar.get(room.calendarId) ?? [];

    const currentEvent =
      roomEvents.find((e) => e.startTime <= now && e.endTime > now) ?? null;
    const nextEvent =
      roomEvents.find((e) => e.startTime > now) ?? null;

    const isFree = !currentEvent;
    const isEndingSoon = currentEvent
      ? currentEvent.endTime.getTime() - now.getTime() <= 15 * 60 * 1000
      : false;

    const progressPercent = currentEvent
      ? Math.min(
          100,
          Math.max(
            0,
            ((now.getTime() - currentEvent.startTime.getTime()) /
              (currentEvent.endTime.getTime() -
                currentEvent.startTime.getTime())) *
              100
          )
        )
      : 0;

    const status: RoomStatus = {
      isFree,
      currentEvent: currentEvent
        ? {
            id: currentEvent.id,
            title: currentEvent.title,
            startTime: currentEvent.startTime,
            endTime: currentEvent.endTime,
          }
        : null,
      nextEvent: nextEvent
        ? {
            id: nextEvent.id,
            title: nextEvent.title,
            startTime: nextEvent.startTime,
            endTime: nextEvent.endTime,
          }
        : null,
      isEndingSoon,
      progressPercent,
    };

    return {
      ...room,
      hasDisplay: room.displays.length > 0,
      displayId: room.displays[0]?.id ?? null,
      status,
    };
  });
}

export async function getRoomStatus(roomId: string) {
  await requireActionAuth("VIEWER");
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { calendarId: true },
  });

  if (!room) return null;

  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const events = await prisma.calendarEvent.findMany({
    where: {
      calendarId: room.calendarId,
      startTime: { lte: endOfDay },
      endTime: { gte: now },
    },
    orderBy: { startTime: "asc" },
    take: 5,
  });

  const currentEvent = events.find(
    (e) => e.startTime <= now && e.endTime > now
  ) ?? null;

  const nextEvent = events.find(
    (e) => e.startTime > now
  ) ?? null;

  const isFree = !currentEvent;
  const isEndingSoon = currentEvent
    ? (currentEvent.endTime.getTime() - now.getTime()) <= 15 * 60 * 1000
    : false;

  const progressPercent = currentEvent
    ? Math.min(100, Math.max(0,
        ((now.getTime() - currentEvent.startTime.getTime()) /
          (currentEvent.endTime.getTime() - currentEvent.startTime.getTime())) *
          100
      ))
    : 0;

  return {
    isFree,
    currentEvent,
    nextEvent,
    isEndingSoon,
    progressPercent,
  };
}
