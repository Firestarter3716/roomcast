"use client";

import { useMemo } from "react";
import { useCurrentTime } from "../hooks/useCurrentTime";
import { type DisplayEvent } from "../hooks/useDisplaySSE";
import { type DayGridConfig } from "@/features/displays/types";

interface DayGridViewProps { events: DisplayEvent[]; config: DayGridConfig; locale?: string; }

export function DayGridView({ events, config, locale }: DayGridViewProps) {
  const now = useCurrentTime(60000);
  const totalHours = config.timeRangeEnd - config.timeRangeStart;
  const hours = useMemo(() => { const h = []; for (let i = config.timeRangeStart; i < config.timeRangeEnd; i++) h.push(i); return h; }, [config.timeRangeStart, config.timeRangeEnd]);

  const todayEvents = useMemo(() => {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayEnd = new Date(today); dayEnd.setDate(dayEnd.getDate() + 1);
    return events.filter((e) => { const s = new Date(e.startTime); return s >= today && s < dayEnd && !e.isAllDay; });
  }, [events, now]);

  const currentTimePercent = useMemo(() => {
    const minutes = now.getHours() * 60 + now.getMinutes();
    return ((minutes - config.timeRangeStart * 60) / (totalHours * 60)) * 100;
  }, [now, config.timeRangeStart, totalHours]);

  function getEventPosition(event: DisplayEvent) {
    const start = new Date(event.startTime); const end = new Date(event.endTime);
    const startMin = start.getHours() * 60 + start.getMinutes(); const endMin = end.getHours() * 60 + end.getMinutes();
    const rangeStart = config.timeRangeStart * 60; const rangeEnd = config.timeRangeEnd * 60;
    const top = Math.max(0, ((startMin - rangeStart) / (rangeEnd - rangeStart)) * 100);
    const bottom = Math.min(100, ((endMin - rangeStart) / (rangeEnd - rangeStart)) * 100);
    return { top: `${top}%`, height: `${Math.max(2, bottom - top)}%` };
  }

  return (
    <div style={{ display: "flex", height: "100%", padding: "1.5rem" }}>
      <div style={{ width: "4rem", flexShrink: 0, position: "relative" }}>
        {hours.map((h) => (<div key={h} style={{ position: "absolute", top: `${((h - config.timeRangeStart) / totalHours) * 100}%`, fontSize: "0.75rem", opacity: 0.5, transform: "translateY(-50%)" }}>{String(h).padStart(2, "0")}:00</div>))}
      </div>
      <div style={{ flex: 1, position: "relative", borderLeft: "1px solid var(--display-muted)33" }}>
        {hours.map((h) => (<div key={h} style={{ position: "absolute", top: `${((h - config.timeRangeStart) / totalHours) * 100}%`, left: 0, right: 0, borderTop: "1px solid var(--display-muted)15" }} />))}
        {config.showCurrentTimeLine && currentTimePercent >= 0 && currentTimePercent <= 100 && (
          <div style={{ position: "absolute", top: `${currentTimePercent}%`, left: "-4px", right: 0, zIndex: 10 }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--display-primary)", transform: "translateY(-50%)" }} />
            <div style={{ position: "absolute", top: "50%", left: "8px", right: 0, height: "2px", backgroundColor: "var(--display-primary)", transform: "translateY(-50%)" }} />
          </div>
        )}
        {todayEvents.map((event) => {
          const pos = getEventPosition(event);
          return (
            <div key={event.id} style={{ position: "absolute", top: pos.top, height: pos.height, left: "0.5rem", right: "0.5rem", borderRadius: "0.375rem", padding: "0.375rem 0.5rem", overflow: "hidden", backgroundColor: `${event.calendarColor || "var(--display-primary)"}30`, borderLeft: `3px solid ${event.calendarColor || "var(--display-primary)"}`, fontSize: "0.75rem" }}>
              <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{event.title}</div>
              <div style={{ opacity: 0.7, fontSize: "0.6875rem" }}>
                {new Date(event.startTime).toLocaleTimeString(locale || "de-DE", { hour: "2-digit", minute: "2-digit" })} - {new Date(event.endTime).toLocaleTimeString(locale || "de-DE", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
