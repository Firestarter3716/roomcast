"use client";

import { useDisplaySSE, type DisplayEvent } from "./hooks/useDisplaySSE";
import { DisplayShell } from "./shared/DisplayShell";
import { EventErrorBoundary } from "./shared/EventErrorBoundary";
import { RoomBookingView } from "./views/RoomBookingView";
import { AgendaView } from "./views/AgendaView";
import { DayGridView } from "./views/DayGridView";
import { WeekGridView } from "./views/WeekGridView";
import { InfoDisplayView } from "./views/InfoDisplayView";
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
  getDefaultLayoutConfig,
} from "@/features/displays/types";

const LOCALE_MAP: Record<string, string> = { de: "de-DE", en: "en-US", fr: "fr-FR" };

interface DisplayViewProps {
  token: string;
  layoutType: string;
  initialConfig: DisplayConfig;
  initialEvents: DisplayEvent[];
  roomName?: string;
  defaultLang?: string;
  orientation?: string;
}

export function DisplayView({
  token,
  layoutType,
  initialConfig,
  initialEvents,
  roomName,
  defaultLang,
  orientation,
}: DisplayViewProps) {
  const locale = LOCALE_MAP[defaultLang || "de"] || "de-DE";
  const { events, config: liveConfig, connected, error, connectionMode } = useDisplaySSE({ token });

  const displayEvents = events.length > 0 ? events : initialEvents;
  const displayConfig: DisplayConfig = liveConfig
    ? {
        theme: { ...DEFAULT_THEME, ...(liveConfig as DisplayConfig).theme },
        branding: { ...DEFAULT_BRANDING, ...(liveConfig as DisplayConfig).branding },
        background: { ...DEFAULT_BACKGROUND, ...(liveConfig as DisplayConfig).background },
        layout: { ...getDefaultLayoutConfig(layoutType), ...(liveConfig as DisplayConfig).layout },
      }
    : initialConfig;

  function renderView() {
    switch (layoutType) {
      case "ROOM_BOOKING":
        return (
          <RoomBookingView
            events={displayEvents}
            config={displayConfig.layout as RoomBookingConfig}
            roomName={roomName}
            locale={locale}
            orientation={orientation}
          />
        );
      case "AGENDA":
        return (
          <AgendaView
            events={displayEvents}
            config={displayConfig.layout as AgendaConfig}
            locale={locale}
          />
        );
      case "DAY_GRID":
        return (
          <DayGridView
            events={displayEvents}
            config={displayConfig.layout as DayGridConfig}
            locale={locale}
          />
        );
      case "WEEK_GRID":
        return (
          <WeekGridView
            events={displayEvents}
            config={displayConfig.layout as WeekGridConfig}
            locale={locale}
          />
        );
      case "INFO_DISPLAY":
        return (
          <InfoDisplayView
            events={displayEvents}
            config={displayConfig.layout as InfoDisplayConfig}
            locale={locale}
          />
        );
      default:
        return <div>Unknown layout type: {layoutType}</div>;
    }
  }

  return (
    <DisplayShell config={displayConfig}>
      {error && (
        <div
          style={{
            position: "absolute",
            top: "0.5rem",
            right: "0.5rem",
            zIndex: 100,
            padding: "0.5rem 1rem",
            borderRadius: "0.375rem",
            backgroundColor: "rgba(239, 68, 68, 0.9)",
            color: "white",
            fontSize: "0.75rem",
          }}
        >
          {error}
        </div>
      )}
      {connectionMode === "polling" && (
        <div
          style={{
            position: "absolute",
            top: "0.5rem",
            right: "0.5rem",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            padding: "0.25rem 0.5rem",
            borderRadius: "0.375rem",
            backgroundColor: "rgba(234, 179, 8, 0.15)",
            fontSize: "0.625rem",
            color: "#A16207",
          }}
          title="SSE unavailable. Using HTTP polling (30s refresh). Attempting SSE reconnect in background."
        >
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "#EAB308",
              flexShrink: 0,
            }}
          />
          Polling
        </div>
      )}
      {!connected && !error && connectionMode === "sse" && (
        <div
          style={{
            position: "absolute",
            top: "0.5rem",
            right: "0.5rem",
            zIndex: 100,
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: "#EAB308",
          }}
          title="Reconnecting..."
        />
      )}
      <EventErrorBoundary>
        {renderView()}
      </EventErrorBoundary>
    </DisplayShell>
  );
}
