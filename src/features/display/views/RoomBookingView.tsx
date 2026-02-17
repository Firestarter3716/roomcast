"use client";

import { useMemo } from "react";
import { useCurrentTime } from "../hooks/useCurrentTime";
import { DisplayClock } from "../shared/DisplayClock";
import { ProgressBar } from "../shared/ProgressBar";
import { StatusBanner } from "../shared/StatusBanner";
import { type DisplayEvent } from "../hooks/useDisplaySSE";
import { type RoomBookingConfig } from "@/features/displays/types";

interface RoomBookingViewProps {
  events: DisplayEvent[];
  config: RoomBookingConfig;
  roomName?: string;
  locale?: string;
}

export function RoomBookingView({ events, config, roomName, locale }: RoomBookingViewProps) {
  const now = useCurrentTime(10000);

  const { currentEvent, nextEvents, isFree, isEndingSoon } = useMemo(() => {
    const nowMs = now.getTime();
    const current = events.find((e) => !e.isAllDay && new Date(e.startTime).getTime() <= nowMs && new Date(e.endTime).getTime() > nowMs);
    const allDay = events.find((e) => e.isAllDay);
    const upcoming = events.filter((e) => !e.isAllDay && new Date(e.startTime).getTime() > nowMs).slice(0, config.futureEventCount);
    const endingSoon = current ? (new Date(current.endTime).getTime() - nowMs) <= 15 * 60 * 1000 : false;
    return { currentEvent: current || allDay || null, nextEvents: upcoming, isFree: !current && !allDay, isEndingSoon: endingSoon };
  }, [events, now, config.futureEventCount]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>{roomName && <div style={{ fontSize: "clamp(1rem, 2vw, 1.5rem)", opacity: 0.7 }}>{roomName}</div>}</div>
        <DisplayClock format={config.clockFormat} className="text-3xl font-light opacity-70" locale={locale} />
      </div>
      <StatusBanner isFree={isFree} />
      {currentEvent && !currentEvent.isAllDay && (
        <div style={{ marginTop: "1.5rem", padding: "1.5rem", borderRadius: "0.75rem", backgroundColor: "var(--display-busy)15" }}>
          <div style={{ fontSize: "clamp(1.25rem, 3vw, 2rem)", fontWeight: 600 }}>{currentEvent.title}</div>
          {config.showOrganizer && currentEvent.organizer && <div style={{ marginTop: "0.5rem", opacity: 0.7 }}>{currentEvent.organizer}</div>}
          {config.showAttendeeCount && currentEvent.attendeeCount != null && <div style={{ marginTop: "0.25rem", opacity: 0.6, fontSize: "0.875rem" }}>{currentEvent.attendeeCount} attendees</div>}
          {isEndingSoon && <div style={{ marginTop: "0.5rem", color: "var(--display-busy)", fontSize: "0.875rem", fontWeight: 500 }}>Ending soon</div>}
          {config.showProgressBar && <div style={{ marginTop: "1rem" }}><ProgressBar startTime={new Date(currentEvent.startTime)} endTime={new Date(currentEvent.endTime)} color="var(--display-busy)" /></div>}
          <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", opacity: 0.6 }}>
            {new Date(currentEvent.startTime).toLocaleTimeString(locale || "de-DE", { hour: "2-digit", minute: "2-digit" })} - {new Date(currentEvent.endTime).toLocaleTimeString(locale || "de-DE", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      )}
      {nextEvents.length > 0 && (
        <div style={{ marginTop: "auto", paddingTop: "1.5rem" }}>
          <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.5, marginBottom: "0.75rem" }}>Coming up</div>
          {nextEvents.map((event) => (
            <div key={event.id} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.75rem 0", borderTop: "1px solid var(--display-muted)22" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 500, opacity: 0.7, width: "5rem", flexShrink: 0 }}>{new Date(event.startTime).toLocaleTimeString(locale || "de-DE", { hour: "2-digit", minute: "2-digit" })}</div>
              <div style={{ fontSize: "0.875rem" }}>{event.title}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
