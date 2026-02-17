"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useCurrentTime } from "../hooks/useCurrentTime";
import { type DisplayEvent } from "../hooks/useDisplaySSE";
import { type WeekGridConfig } from "@/features/displays/types";

const HOURS_START = 7; const HOURS_END = 22; const TOTAL_HOURS = HOURS_END - HOURS_START;

/**
 * Generate short day names (Mon, Tue, ...) using Intl.DateTimeFormat for the given locale.
 * Returns an array of 7 strings starting with Monday.
 */
function getLocaleDayNames(locale: string): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  // Jan 5, 2026 is a Monday
  const monday = new Date(2026, 0, 5);
  const names: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    names.push(formatter.format(d));
  }
  return names;
}

/** Returns ISO week number string "YYYY-Www" for stable week identity */
function getISOWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Thursday of the current week determines the year
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - yearStart.getTime()) / 86400000 - 3 + ((yearStart.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

interface WeekGridViewProps { events: DisplayEvent[]; config: WeekGridConfig; locale?: string; }

export function WeekGridView({ events, config, locale }: WeekGridViewProps) {
  const now = useCurrentTime(60000);

  // --- Monday 00:00 auto-rollover ---
  // Track the current week key; when a new Monday arrives the key changes,
  // which forces weekStart (and therefore the entire grid) to recompute.
  const [weekKey, setWeekKey] = useState(() => getISOWeekKey(new Date()));

  useEffect(() => {
    const check = setInterval(() => {
      const newKey = getISOWeekKey(new Date());
      setWeekKey((prev) => (prev !== newKey ? newKey : prev));
    }, 60_000);
    return () => clearInterval(check);
  }, []);

  const localeDayNames = useMemo(() => getLocaleDayNames(locale || "de-DE"), [locale]);
  const days = useMemo(() => localeDayNames.slice(0, config.showWeekends ? 7 : 5), [localeDayNames, config.showWeekends]);

  const weekStart = useMemo(() => {
    // weekKey is included as a dependency so the week resets on Monday rollover
    void weekKey;
    const d = new Date(now);
    const dow = d.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [now, weekKey]);

  const currentDayIndex = useMemo(() => { const d = now.getDay(); return d === 0 ? 6 : d - 1; }, [now]);
  const hours = useMemo(() => { const h = []; for (let i = HOURS_START; i < HOURS_END; i++) h.push(i); return h; }, []);

  // --- Current time indicator position (percentage) ---
  const currentTimePercent = useMemo(() => {
    const minutes = now.getHours() * 60 + now.getMinutes();
    return ((minutes - HOURS_START * 60) / (TOTAL_HOURS * 60)) * 100;
  }, [now]);

  const getEventsForDay = useCallback((dayIndex: number) => {
    const dayStart = new Date(weekStart); dayStart.setDate(dayStart.getDate() + dayIndex);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
    return events.filter((e) => { const s = new Date(e.startTime); return s >= dayStart && s < dayEnd && !e.isAllDay; });
  }, [weekStart, events]);

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
              {/* Current time indicator -- only in today's column, within visible hour range */}
              {isToday && currentTimePercent >= 0 && currentTimePercent <= 100 && (
                <div style={{ position: "absolute", top: `${currentTimePercent}%`, left: "-4px", right: 0, zIndex: 10, pointerEvents: "none" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--display-primary)", transform: "translateY(-50%)" }} />
                  <div style={{ position: "absolute", top: "50%", left: "8px", right: 0, height: "2px", backgroundColor: "var(--display-primary)", transform: "translateY(-50%)" }} />
                </div>
              )}
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
