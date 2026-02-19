"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getDisplayPreviewEvents } from "../actions";
import { getFontFamily } from "@/shared/lib/fonts";
import {
  type DisplayConfig,
  type RoomBookingConfig,
  type AgendaConfig,
  type DayGridConfig,
  type WeekGridConfig,
  type InfoDisplayConfig,
  DEFAULT_THEME,
  DEFAULT_BRANDING,
  DEFAULT_BACKGROUND,
} from "../types";
import { RoomBookingView } from "@/features/display/views/RoomBookingView";
import { AgendaView } from "@/features/display/views/AgendaView";
import { DayGridView } from "@/features/display/views/DayGridView";
import { WeekGridView } from "@/features/display/views/WeekGridView";
import { InfoDisplayView } from "@/features/display/views/InfoDisplayView";
import type { DisplayEvent } from "@/features/display/hooks/useDisplaySSE";

/** Reference resolution for scaling (what the display actually renders at). */
const REFERENCE_WIDTH_LANDSCAPE = 1920;
const REFERENCE_HEIGHT_LANDSCAPE = 1080;
const REFERENCE_WIDTH_PORTRAIT = 1080;
const REFERENCE_HEIGHT_PORTRAIT = 1920;

interface DisplayPreviewProps {
  displayId: string;
  layoutType: string;
  config: DisplayConfig;
  orientation?: string;
  roomName?: string;
}

/**
 * Generates plausible sample events for preview when no real events exist.
 * Produces events spread across today so every view type has something to show.
 */
function generateSampleEvents(): DisplayEvent[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const samples: { title: string; offsetHours: number; durationMin: number }[] = [
    { title: "Team Standup", offsetHours: 9, durationMin: 30 },
    { title: "Sprint Planning", offsetHours: 10, durationMin: 60 },
    { title: "Lunch Break", offsetHours: 12, durationMin: 60 },
    { title: "Design Review", offsetHours: 14, durationMin: 45 },
    { title: "1:1 with Manager", offsetHours: 15, durationMin: 30 },
    { title: "All-Hands Meeting", offsetHours: 16, durationMin: 60 },
  ];

  // Also add a few events on upcoming days for week/info views
  const upcomingSamples: { title: string; dayOffset: number; offsetHours: number; durationMin: number }[] = [
    { title: "Client Call", dayOffset: 1, offsetHours: 10, durationMin: 60 },
    { title: "Workshop", dayOffset: 1, offsetHours: 14, durationMin: 120 },
    { title: "Board Meeting", dayOffset: 2, offsetHours: 11, durationMin: 90 },
    { title: "Team Retro", dayOffset: 3, offsetHours: 15, durationMin: 60 },
    { title: "Tech Talk", dayOffset: 4, offsetHours: 13, durationMin: 45 },
  ];

  const colors = ["#3B82F6", "#8B5CF6", "#06B6D4", "#F59E0B", "#10B981", "#EF4444"];

  const events: DisplayEvent[] = samples.map((s, i) => {
    const start = new Date(today);
    start.setHours(s.offsetHours, 0, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + s.durationMin);
    return {
      id: `sample-${i}`,
      calendarId: "sample-cal",
      calendarColor: colors[i % colors.length],
      calendarName: "Sample Calendar",
      title: s.title,
      description: null,
      location: i % 2 === 0 ? "Room A" : "Room B",
      organizer: i % 3 === 0 ? "Jane Doe" : "John Smith",
      attendeeCount: 3 + i,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      isAllDay: false,
      isRecurring: false,
    };
  });

  upcomingSamples.forEach((s, i) => {
    const start = new Date(today);
    start.setDate(start.getDate() + s.dayOffset);
    start.setHours(s.offsetHours, 0, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + s.durationMin);
    events.push({
      id: `sample-upcoming-${i}`,
      calendarId: "sample-cal",
      calendarColor: colors[(i + 2) % colors.length],
      calendarName: "Sample Calendar",
      title: s.title,
      description: null,
      location: "Conference Room",
      organizer: "Team Lead",
      attendeeCount: 5 + i,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      isAllDay: false,
      isRecurring: false,
    });
  });

  return events;
}

export function DisplayPreview({ displayId, layoutType, config, orientation, roomName: initialRoomName }: DisplayPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [events, setEvents] = useState<DisplayEvent[]>([]);
  const [roomName, setRoomName] = useState(initialRoomName);
  const [loaded, setLoaded] = useState(false);

  const isPortrait = orientation === "PORTRAIT";
  const refWidth = isPortrait ? REFERENCE_WIDTH_PORTRAIT : REFERENCE_WIDTH_LANDSCAPE;
  const refHeight = isPortrait ? REFERENCE_HEIGHT_PORTRAIT : REFERENCE_HEIGHT_LANDSCAPE;

  // Fetch real events from DB
  useEffect(() => {
    let cancelled = false;
    async function fetchEvents() {
      try {
        const result = await getDisplayPreviewEvents(displayId);
        if (cancelled) return;
        if (result.events.length > 0) {
          setEvents(result.events as DisplayEvent[]);
        } else {
          setEvents(generateSampleEvents());
        }
        if (result.roomName) setRoomName(result.roomName);
      } catch {
        // On error, fall back to sample data
        if (!cancelled) setEvents(generateSampleEvents());
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    fetchEvents();
    return () => { cancelled = true; };
  }, [displayId]);

  // Calculate scale based on container size vs reference resolution
  const recalcScale = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const scaleX = containerWidth / refWidth;
    setScale(scaleX);
  }, [refWidth]);

  useEffect(() => {
    recalcScale();
    const observer = new ResizeObserver(recalcScale);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [recalcScale]);

  const theme = { ...DEFAULT_THEME, ...config.theme };
  const branding = { ...DEFAULT_BRANDING, ...config.branding };
  const background = { ...DEFAULT_BACKGROUND, ...config.background };

  // Background style (mirrors DisplayShell)
  const bgStyle: React.CSSProperties =
    background.type === "gradient"
      ? { background: `linear-gradient(${background.gradientAngle}deg, ${background.gradientStart}, ${background.gradientEnd})` }
      : background.type === "solid"
      ? { backgroundColor: background.color }
      : { backgroundColor: theme.background };

  function renderView() {
    switch (layoutType) {
      case "ROOM_BOOKING":
        return <RoomBookingView events={events} config={config.layout as RoomBookingConfig} roomName={roomName} locale="en-US" />;
      case "AGENDA":
        return <AgendaView events={events} config={config.layout as AgendaConfig} locale="en-US" />;
      case "DAY_GRID":
        return <DayGridView events={events} config={config.layout as DayGridConfig} locale="en-US" />;
      case "WEEK_GRID":
        return <WeekGridView events={events} config={config.layout as WeekGridConfig} locale="en-US" />;
      case "INFO_DISPLAY":
        return <InfoDisplayView events={events} config={config.layout as InfoDisplayConfig} locale="en-US" />;
      default:
        return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.5 }}>Unknown layout: {layoutType}</div>;
    }
  }

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-lg border border-[var(--color-border)]" style={{ aspectRatio: `${refWidth}/${refHeight}` }}>
      {/* Scaled inner container at reference resolution */}
      <div
        style={{
          width: `${refWidth}px`,
          height: `${refHeight}px`,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          ...bgStyle,
          fontFamily: getFontFamily(theme.fontFamily),
          fontSize: `${theme.baseFontSize}px`,
          color: theme.foreground,
          position: "relative",
          overflow: "hidden",
          // CSS custom properties matching DisplayShell
          "--display-bg": theme.background,
          "--display-fg": theme.foreground,
          "--display-primary": theme.primary,
          "--display-secondary": theme.secondary,
          "--display-free": theme.free,
          "--display-busy": theme.busy,
          "--display-muted": theme.muted,
          "--display-base-size": `${theme.baseFontSize}px`,
        } as React.CSSProperties}
      >
        {/* Background image layer */}
        {background.type === "image" && background.imageUrl && (
          <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${background.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center", opacity: background.imageOpacity, zIndex: 0 }} />
        )}

        {/* Content layer (mirrors DisplayShell structure) */}
        <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
          {/* Logo / branding header */}
          {branding.logoUrl && (
            <div style={{ display: "flex", justifyContent: branding.logoPosition === "top-center" ? "center" : branding.logoPosition === "top-right" ? "flex-end" : "flex-start", padding: "1rem 1.5rem 0" }}>
              <img
                src={branding.logoUrl}
                alt=""
                style={{ height: branding.logoSize === "small" ? "1.5rem" : branding.logoSize === "large" ? "3rem" : "2rem" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}

          {/* Main view */}
          <div style={{ flex: 1, minHeight: 0 }}>
            {loaded ? renderView() : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.4 }}>
                Loading preview...
              </div>
            )}
          </div>

          {/* Powered by footer */}
          {branding.showPoweredBy && (
            <div style={{ textAlign: "center", padding: "0.5rem", fontSize: "0.625rem", opacity: 0.4, color: theme.muted }}>
              RoomCast by UNYX
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
