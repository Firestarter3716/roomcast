"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useCurrentTime } from "../hooks/useCurrentTime";
import { type DisplayEvent } from "../hooks/useDisplaySSE";
import { type DayGridConfig } from "@/features/displays/types";

// ---------------------------------------------------------------------------
// CSS keyframes injected once for the fade transition
// ---------------------------------------------------------------------------
const FADE_KEYFRAMES = `
@keyframes displayFadeIn {
  from { opacity: 0.3; }
  to   { opacity: 1; }
}
`;

let keyframesInjected = false;
function ensureKeyframes() {
  if (typeof document === "undefined" || keyframesInjected) return;
  const style = document.createElement("style");
  style.textContent = FADE_KEYFRAMES;
  document.head.appendChild(style);
  keyframesInjected = true;
}

interface DayGridViewProps { events: DisplayEvent[]; config: DayGridConfig; locale?: string; }

/** Overlap layout: event with its computed column position */
interface LayoutEvent {
  event: DisplayEvent;
  columnIndex: number;
  columnCount: number;
}

/**
 * Groups overlapping events into columns (Google Calendar style).
 *
 * Algorithm:
 * 1. Sort events by start time, then by duration descending.
 * 2. Walk through events, maintaining "overlap clusters" — contiguous
 *    groups of events where at least one event overlaps with another.
 * 3. Within each cluster, greedily assign columns: for each event, pick
 *    the first column whose last event ends before this event starts.
 *    If no column fits, create a new one.
 * 4. After the cluster is complete, stamp every event in it with the
 *    total column count for that cluster.
 */
function computeOverlapLayout(events: DisplayEvent[]): LayoutEvent[] {
  if (events.length === 0) return [];

  // Helper: event start/end in minutes since midnight
  function toMinutes(iso: string): number {
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
  }

  // Sort: earliest start first; ties broken by longest duration first
  const sorted = [...events].sort((a, b) => {
    const aStart = toMinutes(a.startTime);
    const bStart = toMinutes(b.startTime);
    if (aStart !== bStart) return aStart - bStart;
    // Longer events first so they anchor the column
    const aDuration = toMinutes(a.endTime) - aStart;
    const bDuration = toMinutes(b.endTime) - bStart;
    return bDuration - aDuration;
  });

  const result: LayoutEvent[] = [];

  // Process events in clusters of overlapping items
  let i = 0;
  while (i < sorted.length) {
    // Start a new cluster with the first unprocessed event
    // columns[col] = end-minute of the last event placed in that column
    const columns: number[] = [];
    const clusterItems: { event: DisplayEvent; columnIndex: number }[] = [];
    let clusterEnd = 0; // the latest end time seen in this cluster so far

    // Seed the cluster
    const firstStart = toMinutes(sorted[i].startTime);
    const firstEnd = toMinutes(sorted[i].endTime);
    columns.push(firstEnd);
    clusterItems.push({ event: sorted[i], columnIndex: 0 });
    clusterEnd = firstEnd;
    i++;

    // Keep adding events while they overlap with the cluster
    while (i < sorted.length) {
      const evStart = toMinutes(sorted[i].startTime);
      const evEnd = toMinutes(sorted[i].endTime);

      // Does this event overlap with the current cluster?
      // An event overlaps if its start is before the latest end in the cluster.
      if (evStart < clusterEnd) {
        // Find the first column where this event fits (column's last event ends <= evStart)
        let placed = false;
        for (let col = 0; col < columns.length; col++) {
          if (columns[col] <= evStart) {
            columns[col] = evEnd;
            clusterItems.push({ event: sorted[i], columnIndex: col });
            placed = true;
            break;
          }
        }
        if (!placed) {
          // Need a new column
          const newCol = columns.length;
          columns.push(evEnd);
          clusterItems.push({ event: sorted[i], columnIndex: newCol });
        }
        clusterEnd = Math.max(clusterEnd, evEnd);
        i++;
      } else {
        // No overlap — this event starts a new cluster
        break;
      }
    }

    // Stamp every item in this cluster with the total column count
    const columnCount = columns.length;
    for (const item of clusterItems) {
      result.push({
        event: item.event,
        columnIndex: item.columnIndex,
        columnCount,
      });
    }
  }

  return result;
}

export function DayGridView({ events, config, locale: localeProp }: DayGridViewProps) {
  const locale = localeProp || "de-DE";
  const now = useCurrentTime(60000);
  const totalHours = config.timeRangeEnd - config.timeRangeStart;

  // Inject keyframes on mount
  useEffect(() => {
    ensureKeyframes();
  }, []);

  // Fade transition: track event changes
  const [fadeKey, setFadeKey] = useState(0);
  const prevEventIdsRef = useRef<string>("");

  useEffect(() => {
    const currentIds = events.map((e) => e.id).join(",");
    if (prevEventIdsRef.current && prevEventIdsRef.current !== currentIds) {
      setFadeKey((k) => k + 1);
    }
    prevEventIdsRef.current = currentIds;
  }, [events]);
  const hours = useMemo(() => { const h = []; for (let i = config.timeRangeStart; i < config.timeRangeEnd; i++) h.push(i); return h; }, [config.timeRangeStart, config.timeRangeEnd]);

  // Ref for the scrollable container (outermost div)
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Track whether we have done the initial scroll
  const hasScrolledRef = useRef(false);

  const todayEvents = useMemo(() => {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayEnd = new Date(today); dayEnd.setDate(dayEnd.getDate() + 1);
    return events.filter((e) => { const s = new Date(e.startTime); return s >= today && s < dayEnd && !e.isAllDay; });
  }, [events, now]);

  const currentTimePercent = useMemo(() => {
    const minutes = now.getHours() * 60 + now.getMinutes();
    return ((minutes - config.timeRangeStart * 60) / (totalHours * 60)) * 100;
  }, [now, config.timeRangeStart, totalHours]);

  // --- Overlapping event layout ---
  const layoutEvents = useMemo(() => computeOverlapLayout(todayEvents), [todayEvents]);

  function getEventPosition(event: DisplayEvent) {
    const start = new Date(event.startTime); const end = new Date(event.endTime);
    const startMin = start.getHours() * 60 + start.getMinutes(); const endMin = end.getHours() * 60 + end.getMinutes();
    const rangeStart = config.timeRangeStart * 60; const rangeEnd = config.timeRangeEnd * 60;
    const top = Math.max(0, ((startMin - rangeStart) / (rangeEnd - rangeStart)) * 100);
    const bottom = Math.min(100, ((endMin - rangeStart) / (rangeEnd - rangeStart)) * 100);
    return { top: `${top}%`, height: `${Math.max(2, bottom - top)}%` };
  }

  // --- Auto-scroll to current time ---
  const scrollToCurrentTime = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Only scroll when the current time is within the grid's range
    if (currentTimePercent < 0 || currentTimePercent > 100) return;

    // The grid content height is the scrollHeight of the container.
    // We want the current-time position to sit roughly 1/3 from the top
    // of the visible viewport.
    const scrollHeight = container.scrollHeight;
    const viewportHeight = container.clientHeight;
    const currentTimeOffset = (currentTimePercent / 100) * scrollHeight;
    const targetScroll = currentTimeOffset - viewportHeight / 3;

    container.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: hasScrolledRef.current ? "smooth" : "auto",
    });
    hasScrolledRef.current = true;
  }, [currentTimePercent]);

  // Scroll on initial mount (instant) and whenever currentTimePercent updates (smooth)
  useEffect(() => {
    scrollToCurrentTime();
  }, [scrollToCurrentTime]);

  // Locale-aware date header
  const dateString = now.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      key={fadeKey}
      ref={scrollContainerRef}
      style={{ height: "100%", overflowY: "auto", padding: "1.5rem", animation: "displayFadeIn 0.5s ease-in-out" }}
    >
      {/* Date header */}
      <div
        style={{
          fontSize: "clamp(0.875rem, 1.5vw, 1.125rem)",
          opacity: 0.6,
          marginBottom: "1rem",
          paddingLeft: "4rem",
        }}
      >
        {dateString}
      </div>
      <div style={{ display: "flex", position: "relative", minHeight: "100%" }}>
        {/* Hour labels column */}
        <div style={{ width: "4rem", flexShrink: 0, position: "relative" }}>
          {hours.map((h) => (<div key={h} style={{ position: "absolute", top: `${((h - config.timeRangeStart) / totalHours) * 100}%`, fontSize: "0.75rem", opacity: 0.5, transform: "translateY(-50%)" }}>{String(h).padStart(2, "0")}:00</div>))}
        </div>

        {/* Grid area */}
        <div style={{ flex: 1, position: "relative", borderLeft: "1px solid var(--display-muted)33" }}>
          {/* Hour grid lines */}
          {hours.map((h) => (<div key={h} style={{ position: "absolute", top: `${((h - config.timeRangeStart) / totalHours) * 100}%`, left: 0, right: 0, borderTop: "1px solid var(--display-muted)15" }} />))}

          {/* Current time indicator */}
          {config.showCurrentTimeLine && currentTimePercent >= 0 && currentTimePercent <= 100 && (
            <div
              data-current-time-line
              style={{ position: "absolute", top: `${currentTimePercent}%`, left: "-4px", right: 0, zIndex: 10 }}
            >
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--display-primary)", transform: "translateY(-50%)" }} />
              <div style={{ position: "absolute", top: "50%", left: "8px", right: 0, height: "2px", backgroundColor: "var(--display-primary)", transform: "translateY(-50%)" }} />
            </div>
          )}

          {/* Events with overlap-aware column positioning */}
          {layoutEvents.map(({ event, columnIndex, columnCount }) => {
            const pos = getEventPosition(event);
            const widthPercent = (1 / columnCount) * 100;
            const leftPercent = (columnIndex / columnCount) * 100;
            // Inset: small gap between columns and edges
            const gap = 4; // px
            return (
              <div
                key={event.id}
                style={{
                  position: "absolute",
                  top: pos.top,
                  height: pos.height,
                  left: `calc(${leftPercent}% + ${gap / 2}px)`,
                  width: `calc(${widthPercent}% - ${gap}px)`,
                  borderRadius: "0.375rem",
                  padding: "0.375rem 0.5rem",
                  overflow: "hidden",
                  backgroundColor: `${event.calendarColor || "var(--display-primary)"}30`,
                  borderLeft: `3px solid ${event.calendarColor || "var(--display-primary)"}`,
                  fontSize: "0.75rem",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{event.title}</div>
                <div style={{ opacity: 0.7, fontSize: "0.6875rem" }}>
                  {new Date(event.startTime).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })} - {new Date(event.endTime).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
