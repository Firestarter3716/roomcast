"use client";

import { useDisplaySSE, type DisplayEvent } from "./hooks/useDisplaySSE";
import { DisplayShell } from "./shared/DisplayShell";
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

interface DisplayViewProps {
  token: string;
  layoutType: string;
  initialConfig: DisplayConfig;
  initialEvents: DisplayEvent[];
  roomName?: string;
}

export function DisplayView({
  token,
  layoutType,
  initialConfig,
  initialEvents,
  roomName,
}: DisplayViewProps) {
  const { events, config: liveConfig, connected, error } = useDisplaySSE({ token });

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
          />
        );
      case "AGENDA":
        return (
          <AgendaView
            events={displayEvents}
            config={displayConfig.layout as AgendaConfig}
          />
        );
      case "DAY_GRID":
        return (
          <DayGridView
            events={displayEvents}
            config={displayConfig.layout as DayGridConfig}
          />
        );
      case "WEEK_GRID":
        return (
          <WeekGridView
            events={displayEvents}
            config={displayConfig.layout as WeekGridConfig}
          />
        );
      case "INFO_DISPLAY":
        return (
          <InfoDisplayView
            events={displayEvents}
            config={displayConfig.layout as InfoDisplayConfig}
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
      {!connected && !error && (
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
      {renderView()}
    </DisplayShell>
  );
}
