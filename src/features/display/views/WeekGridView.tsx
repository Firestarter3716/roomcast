"use client";

import { useMemo } from "react";
import { useCurrentTime } from "../hooks/useCurrentTime";
import { type DisplayEvent } from "../hooks/useDisplaySSE";
import { type WeekGridConfig } from "@/features/displays/types";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS_START = 7; const HOURS_END = 22; const TOTAL_HOURS = HOURS_END - HOURS_START;

interface WeekGridViewProps { events: DisplayEvent[]; config: WeekGridConfig; }

export function WeekGridView({ events, config }: WeekGridViewProps) {
  const now = useCurrentTime(60000);
  const days = useMemo(() => DAY_NAMES.slice(0, config.showWeekends ? 7 : 5), [config.showWeekends]);
  const weekStart = useMemo(() => { const d = new Date(now); const dow = d.getDay(); const diff = dow === 0 ? -6 : 1 - dow; d.setDate(d.getDate() + diff); d.setHours(0, 0, 0, 0); return d; }, [now]);
  const currentDayIndex = useMemo(() => { const d = now.getDay(); return d === 0 ? 6 : d - 1; }, [now]);
  const hours = useMemo(() => { const h = []; for (let i = HOURS_START; i < HOURS_END; i++) h.push(i); return h; }, []);

  function getEventsForDay(dayIndex: number) {
    const dayStart = new Date(weekStart); dayStart.setDate(dayStart.getDate() + dayIndex);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
    return events.filter((e) => { const s = new Date(e.startTime); return s >= dayStart && s < dayEnd && !e.isAllDay; });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "1rem" }}>
      <div style={{ display: "flex", paddingLeft: "3rem" }}>
        {days.map((day, i) => (<div key={day} style={{ flex: 1, textAlign: "center", padding: "0.5rem", fontSize: "0.8125rem", fontWeight: 600, opacity: config.showCurrentDayHighlight && i === currentDayIndex ? 1 : 0.7, color: config.showCurrentDayHighlight && i === currentDayIndex ? "var(--display-primary)" : "inherit" }}>{day}</div>))}
      </div>
      <div style={{ flex: 1, display: "flex", position: "relative", overflow: "hidden" }}>
        <div style={{ width: "3rem", flexShrink: 0, position: "relative" }}>
          {hours.map((h) => (<div key={h} style={{ position: "absolute", top: `${((h - HOURS_START) / TOTAL_HOURS) * 100}%`, fontSize: "0.625rem", opacity: 0.4, transform: "translateY(-50%)", right: "0.5rem" }}>{String(h).padStart(2, "0")}</div>))}
        </div>
        {days.map((_, dayIndex) => {
          const dayEvents = getEventsForDay(dayIndex);
          const isToday = config.showCurrentDayHighlight && dayIndex === currentDayIndex;
          return (
            <div key={dayIndex} style={{ flex: 1, position: "relative", borderLeft: "1px solid var(--display-muted)15", backgroundColor: isToday ? "var(--display-primary)08" : "transparent" }}>
              {hours.map((h) => (<div key={h} style={{ position: "absolute", top: `${((h - HOURS_START) / TOTAL_HOURS) * 100}%`, left: 0, right: 0, borderTop: "1px solid var(--display-muted)10" }} />))}
              {dayEvents.map((event) => {
                const start = new Date(event.startTime); const end = new Date(event.endTime);
                const startMin = start.getHours() * 60 + start.getMinutes(); const endMin = end.getHours() * 60 + end.getMinutes();
                const top = Math.max(0, ((startMin - HOURS_START * 60) / (TOTAL_HOURS * 60)) * 100);
                const height = Math.max(2, ((endMin - startMin) / (TOTAL_HOURS * 60)) * 100);
                return (<div key={event.id} style={{ position: "absolute", top: `${top}%`, height: `${height}%`, left: "2px", right: "2px", borderRadius: "0.25rem", padding: "0.125rem 0.25rem", overflow: "hidden", backgroundColor: `${event.calendarColor || "var(--display-primary)"}40`, borderLeft: `2px solid ${event.calendarColor || "var(--display-primary)"}`, fontSize: "0.625rem" }}><div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{event.title}</div></div>);
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
