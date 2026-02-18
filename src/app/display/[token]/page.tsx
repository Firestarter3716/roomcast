import { notFound } from "next/navigation";
import type { Viewport } from "next";
import prisma from "@/server/db/prisma";
import { DisplayView } from "@/features/display/DisplayView";
import {
  type DisplayConfig,
  DEFAULT_THEME,
  DEFAULT_BRANDING,
  DEFAULT_BACKGROUND,
  DEFAULT_SCREEN,
  getDefaultLayoutConfig,
} from "@/features/displays/types";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  userScalable: false,
};

interface DisplayPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DisplayPage({ params, searchParams }: DisplayPageProps) {
  const { token } = await params;
  const query = await searchParams;

  const display = await prisma.display.findUnique({
    where: { token },
    include: {
      room: {
        select: { name: true, location: true, calendarId: true },
      },
      displayCalendars: {
        select: { calendarId: true },
      },
    },
  });

  if (!display || !display.enabled) {
    notFound();
  }

  // Collect calendar IDs
  const calendarIds: string[] = [];
  if (display.room?.calendarId) calendarIds.push(display.room.calendarId);
  for (const dc of display.displayCalendars) {
    if (!calendarIds.includes(dc.calendarId)) calendarIds.push(dc.calendarId);
  }

  // Fetch initial events
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
    include: {
      calendar: { select: { color: true, name: true } },
    },
  });

  const serializedEvents = events.map((e) => ({
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
  }));

  const rawConfig = display.config as unknown as DisplayConfig | null;
  const config: DisplayConfig = {
    theme: { ...DEFAULT_THEME, ...rawConfig?.theme },
    branding: { ...DEFAULT_BRANDING, ...rawConfig?.branding },
    background: { ...DEFAULT_BACKGROUND, ...rawConfig?.background },
    screen: { ...DEFAULT_SCREEN, ...rawConfig?.screen },
    layout: { ...getDefaultLayoutConfig(display.layoutType), ...rawConfig?.layout },
  };

  // Build query parameter overrides
  const overrides: {
    theme?: string;
    lang?: string;
    refresh?: number;
    scale?: string;
  } = {};

  const qTheme = typeof query.theme === "string" ? query.theme : undefined;
  if (qTheme === "light" || qTheme === "dark") {
    overrides.theme = qTheme;
  }

  const qLang = typeof query.lang === "string" ? query.lang : undefined;
  if (qLang === "de" || qLang === "en" || qLang === "fr") {
    overrides.lang = qLang;
  }

  const qRefresh = typeof query.refresh === "string" ? parseInt(query.refresh, 10) : NaN;
  if (!isNaN(qRefresh) && qRefresh > 0) {
    overrides.refresh = qRefresh;
  }

  const qScale = typeof query.scale === "string" ? query.scale : undefined;
  if (qScale === "fit" || qScale === "fill") {
    overrides.scale = qScale;
  }

  return (
    <DisplayView
      token={token}
      layoutType={display.layoutType}
      initialConfig={config}
      initialEvents={serializedEvents}
      roomName={display.room?.name}
      roomLocation={display.room?.location ?? undefined}
      defaultLang={display.defaultLang ?? undefined}
      orientation={display.orientation}
      overrides={overrides}
    />
  );
}
