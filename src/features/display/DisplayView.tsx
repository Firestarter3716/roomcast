"use client";

import { useEffect, useState } from "react";
import { useDisplaySSE, type DisplayEvent } from "./hooks/useDisplaySSE";
import { DisplayShell } from "./shared/DisplayShell";
import { EventErrorBoundary } from "./shared/EventErrorBoundary";
import { ViewErrorBoundary } from "./shared/ViewErrorBoundary";
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
  DEFAULT_SCREEN,
  getDefaultLayoutConfig,
} from "@/features/displays/types";
import { THEME_PALETTES } from "@/features/displays/palettes";

import "@/shared/styles/display.css";
const LOCALE_MAP: Record<string, string> = { de: "de-DE", en: "en-US", fr: "fr-FR" };

interface DisplayOverrides {
  theme?: string;
  lang?: string;
  refresh?: number;
  scale?: string;
}

interface DisplayViewProps {
  token: string;
  layoutType: string;
  initialConfig: DisplayConfig;
  initialEvents: DisplayEvent[];
  roomName?: string;
  roomLocation?: string;
  defaultLang?: string;
  orientation?: string;
  overrides?: DisplayOverrides;
}

export function DisplayView({
  token,
  layoutType,
  initialConfig,
  initialEvents,
  roomName,
  roomLocation,
  defaultLang,
  orientation,
  overrides,
}: DisplayViewProps) {
  const effectiveLang = overrides?.lang || defaultLang || "de";
  const locale = LOCALE_MAP[effectiveLang] || "de-DE";
  const { events, config: liveConfig, connected, error, connectionMode } = useDisplaySSE({ token });

  // Refresh interval override: reload the page periodically
  useEffect(() => {
    if (!overrides?.refresh) return;
    const intervalMs = overrides.refresh * 1000;
    const id = setInterval(() => {
      window.location.reload();
    }, intervalMs);
    return () => clearInterval(id);
  }, [overrides?.refresh]);

  // Log connection status to console for debugging (not shown visually)
  useEffect(() => {
    if (error) {
      console.warn("[RoomCast] Display connection error:", error);
    }
  }, [error]);

  useEffect(() => {
    if (connectionMode === "polling") {
      console.info("[RoomCast] Display connection mode: polling (SSE unavailable)");
    }
  }, [connectionMode]);

  useEffect(() => {
    if (!connected && connectionMode === "sse") {
      console.info("[RoomCast] Display SSE reconnecting...");
    }
  }, [connected, connectionMode]);

  // --- Auto-detect screen orientation ---
  const [detectedOrientation, setDetectedOrientation] = useState<"LANDSCAPE" | "PORTRAIT">("LANDSCAPE");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(orientation: portrait)");
    // Set initial value
    setDetectedOrientation(mql.matches ? "PORTRAIT" : "LANDSCAPE");
    const handler = (e: MediaQueryListEvent) => {
      setDetectedOrientation(e.matches ? "PORTRAIT" : "LANDSCAPE");
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Resolve orientation: when prop is "AUTO", use detected screen orientation
  const resolvedOrientation = orientation === "AUTO" ? detectedOrientation : orientation;

  // Derive connection status for the shell indicator
  const connectionStatus: "connected" | "polling" | "disconnected" =
    connectionMode === "polling"
      ? "polling"
      : connected
        ? "connected"
        : "disconnected";

  const displayEvents = events.length > 0 ? events : initialEvents;

  // Resolve theme palette override
  const themePaletteOverride = overrides?.theme
    ? THEME_PALETTES.find((p) => p.id === overrides.theme)?.theme
    : undefined;

  const baseConfig: DisplayConfig = liveConfig
    ? {
        theme: { ...DEFAULT_THEME, ...(liveConfig as DisplayConfig).theme },
        branding: { ...DEFAULT_BRANDING, ...(liveConfig as DisplayConfig).branding },
        background: { ...DEFAULT_BACKGROUND, ...(liveConfig as DisplayConfig).background },
        screen: { ...DEFAULT_SCREEN, ...(liveConfig as DisplayConfig).screen },
        layout: { ...getDefaultLayoutConfig(layoutType), ...(liveConfig as DisplayConfig).layout },
      }
    : initialConfig;

  // Apply theme override on top of resolved config
  const displayConfig: DisplayConfig = themePaletteOverride
    ? { ...baseConfig, theme: { ...baseConfig.theme, ...themePaletteOverride } }
    : baseConfig;

  function renderView() {
    switch (layoutType) {
      case "ROOM_BOOKING":
        return (
          <RoomBookingView
            events={displayEvents}
            config={displayConfig.layout as RoomBookingConfig}
            roomName={roomName}
            roomLocation={roomLocation}
            locale={locale}
            orientation={resolvedOrientation}
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

  const scaleStyle: React.CSSProperties | undefined =
    overrides?.scale === "fit"
      ? { objectFit: "contain" as const }
      : overrides?.scale === "fill"
        ? { objectFit: "cover" as const }
        : undefined;

  return (
    <DisplayShell config={displayConfig} style={scaleStyle} connectionStatus={connectionStatus}>
      <ViewErrorBoundary>
        <EventErrorBoundary>
          {renderView()}
        </EventErrorBoundary>
      </ViewErrorBoundary>
    </DisplayShell>
  );
}
