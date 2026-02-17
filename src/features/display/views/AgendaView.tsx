"use client";

import { useMemo } from "react";
import { useCurrentTime } from "../hooks/useCurrentTime";
import { type DisplayEvent } from "../hooks/useDisplaySSE";
import { type AgendaConfig } from "@/features/displays/types";

interface AgendaViewProps { events: DisplayEvent[]; config: AgendaConfig; locale?: string; }

export function AgendaView({ events, config, locale }: AgendaViewProps) {
  const now = useCurrentTime(30000);
  const filteredEvents = useMemo(() => {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(today); start.setHours(config.timeRangeStart);
    const end = new Date(today); end.setHours(config.timeRangeEnd);
    return events.filter((e) => new Date(e.endTime) > start && new Date(e.startTime) < end).slice(0, config.maxEvents);
  }, [events, now, config]);

  const hours = useMemo(() => { const h = []; for (let i = config.timeRangeStart; i < config.timeRangeEnd; i++) h.push(i); return h; }, [config.timeRangeStart, config.timeRangeEnd]);

  return (
    <div style={{ display: "flex", height: "100%", padding: "1.5rem", overflow: "hidden" }}>
      <div style={{ width: "4rem", flexShrink: 0, paddingTop: "0.25rem" }}>
        {hours.map((h) => (<div key={h} style={{ height: `${100 / hours.length}%`, fontSize: "0.75rem", opacity: 0.5, display: "flex", alignItems: "flex-start" }}>{String(h).padStart(2, "0")}:00</div>))}
      </div>
      <div style={{ flex: 1, borderLeft: "1px solid var(--display-muted)33", paddingLeft: "1rem" }}>
        {filteredEvents.length === 0 && <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", opacity: 0.4 }}>No events today</div>}
        {filteredEvents.map((event) => {
          const startTime = new Date(event.startTime); const endTime = new Date(event.endTime);
          const isCurrent = startTime.getTime() <= now.getTime() && endTime.getTime() > now.getTime();
          const isPast = endTime.getTime() < now.getTime();
          return (
            <div key={event.id} style={{ padding: "0.75rem 1rem", marginBottom: "0.5rem", borderRadius: "0.5rem", borderLeft: `3px solid ${event.calendarColor || "var(--display-primary)"}`, backgroundColor: isCurrent ? `${event.calendarColor || "var(--display-primary)"}20` : "transparent", opacity: isPast ? 0.5 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{event.title}</span>
                {config.showRoomName && event.location && <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>{event.location}</span>}
              </div>
              <div style={{ fontSize: "0.8125rem", opacity: 0.7, marginTop: "0.25rem" }}>
                {startTime.toLocaleTimeString(locale || "de-DE", { hour: "2-digit", minute: "2-digit" })} - {endTime.toLocaleTimeString(locale || "de-DE", { hour: "2-digit", minute: "2-digit" })}{event.organizer && ` \u00B7 ${event.organizer}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
