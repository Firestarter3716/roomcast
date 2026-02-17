"use client";

import { useMemo, useState, useEffect } from "react";
import { useCurrentTime } from "../hooks/useCurrentTime";
import { type DisplayEvent } from "../hooks/useDisplaySSE";
import { type AgendaConfig } from "@/features/displays/types";
import { AutoScroller } from "../shared/AutoScroller";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgendaViewProps {
  events: DisplayEvent[];
  config: AgendaConfig;
  locale?: string;
}

/** A rendered item: either a real event card or a gap placeholder. */
type AgendaItem =
  | { kind: "event"; event: DisplayEvent; isCurrent: boolean; isPast: boolean }
  | { kind: "gap"; label: string; subLabel?: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtTime(date: Date, locale: string) {
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

/**
 * Returns the fractional hour for a Date (e.g. 13:30 -> 13.5).
 */
function fractionalHour(d: Date): number {
  return d.getHours() + d.getMinutes() / 60;
}

/**
 * Detect gaps between sorted events that are longer than `minGapHours` and
 * return placeholder items to insert between them.
 */
function buildGapPlaceholders(
  sorted: DisplayEvent[],
  now: Date,
  endOfDayHour: number,
  locale: string,
  minGapHours = 2,
): { afterIndex: number; item: AgendaItem }[] {
  const gaps: { afterIndex: number; item: AgendaItem }[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const currentEnd = new Date(sorted[i].endTime);
    // Determine start of the next occupied period
    const nextStart =
      i < sorted.length - 1 ? new Date(sorted[i + 1].startTime) : null;

    if (nextStart) {
      // Gap between two consecutive events
      const gapMs = nextStart.getTime() - currentEnd.getTime();
      const gapHours = gapMs / (1000 * 60 * 60);

      if (gapHours > minGapHours) {
        const startFrac = fractionalHour(currentEnd);
        const endFrac = fractionalHour(nextStart);

        // Check if gap overlaps the typical lunch window (11:30 - 13:30)
        const isLunch = startFrac <= 13.5 && endFrac >= 11.5 && startFrac >= 11 && endFrac <= 14;

        if (isLunch) {
          gaps.push({ afterIndex: i, item: { kind: "gap", label: "Lunch Break" } });
        } else {
          gaps.push({
            afterIndex: i,
            item: {
              kind: "gap",
              label: "Free",
              subLabel: `${fmtTime(currentEnd, locale)} \u2013 ${fmtTime(nextStart, locale)}`,
            },
          });
        }
      }
    } else {
      // Last event -- check gap until end of day
      const eodToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endOfDayHour);
      const gapMs = eodToday.getTime() - currentEnd.getTime();
      const gapHours = gapMs / (1000 * 60 * 60);

      if (gapHours > minGapHours) {
        gaps.push({
          afterIndex: i,
          item: { kind: "gap", label: "No further events today" },
        });
      }
    }
  }

  return gaps;
}

/**
 * Merge events and gap placeholders into a single ordered list.
 */
function buildAgendaItems(
  events: DisplayEvent[],
  now: Date,
  endOfDayHour: number,
  locale: string,
): AgendaItem[] {
  const nowMs = now.getTime();

  // Build event items
  const eventItems: AgendaItem[] = events.map((event) => {
    const startMs = new Date(event.startTime).getTime();
    const endMs = new Date(event.endTime).getTime();
    return {
      kind: "event",
      event,
      isCurrent: startMs <= nowMs && endMs > nowMs,
      isPast: endMs < nowMs,
    };
  });

  // Build gap placeholders
  const gaps = buildGapPlaceholders(events, now, endOfDayHour, locale);

  // Merge: iterate event items and insert gaps after the correct indices
  const result: AgendaItem[] = [];
  for (let i = 0; i < eventItems.length; i++) {
    result.push(eventItems[i]);
    for (const gap of gaps) {
      if (gap.afterIndex === i) {
        result.push(gap.item);
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EventCard({
  item,
  config,
  locale,
}: {
  item: Extract<AgendaItem, { kind: "event" }>;
  config: AgendaConfig;
  locale: string;
}) {
  const { event, isCurrent, isPast } = item;
  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);

  return (
    <div
      style={{
        padding: "0.75rem 1rem",
        marginBottom: "0.5rem",
        borderRadius: "0.5rem",
        borderLeft: `3px solid ${event.calendarColor || "var(--display-primary)"}`,
        backgroundColor: isCurrent
          ? `${event.calendarColor || "var(--display-primary)"}20`
          : "transparent",
        opacity: isPast ? 0.5 : 1,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{event.title}</span>
        {config.showRoomName && event.location && (
          <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>{event.location}</span>
        )}
      </div>
      <div style={{ fontSize: "0.8125rem", opacity: 0.7, marginTop: "0.25rem" }}>
        {fmtTime(startTime, locale)} - {fmtTime(endTime, locale)}
        {event.organizer && ` \u00B7 ${event.organizer}`}
      </div>
    </div>
  );
}

function GapPlaceholder({ item }: { item: Extract<AgendaItem, { kind: "gap" }> }) {
  return (
    <div
      style={{
        padding: "0.625rem 1rem",
        marginBottom: "0.5rem",
        borderRadius: "0.5rem",
        border: "1px dashed var(--display-muted, #94A3B8)44",
        backgroundColor: "var(--display-muted, #94A3B8)0A",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        opacity: 0.55,
      }}
    >
      <span
        style={{
          fontSize: "0.8125rem",
          fontStyle: "italic",
          color: "var(--display-muted, #94A3B8)",
        }}
      >
        {item.label}
      </span>
      {item.subLabel && (
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--display-muted, #94A3B8)",
            opacity: 0.7,
          }}
        >
          {item.subLabel}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hook: midnight rollover
// ---------------------------------------------------------------------------

/**
 * Returns a date-string (YYYY-MM-DD) that updates at midnight.
 * The returned value changing will cause the parent to re-derive filtered
 * events for the new day.
 */
function useDateKey(): string {
  const toKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const [dateKey, setDateKey] = useState(() => toKey(new Date()));

  useEffect(() => {
    const interval = setInterval(() => {
      const current = toKey(new Date());
      setDateKey((prev) => (prev !== current ? current : prev));
    }, 60_000); // check every 60 seconds
    return () => clearInterval(interval);
  }, []);

  return dateKey;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AgendaView({ events, config, locale: localeProp }: AgendaViewProps) {
  const locale = localeProp || "de-DE";
  const now = useCurrentTime(30_000);
  const dateKey = useDateKey();

  // Filter events to today's time range. `dateKey` is included so that the
  // memo re-runs after a midnight rollover even if `now` hasn't ticked yet.
  const filteredEvents = useMemo(() => {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(today);
    start.setHours(config.timeRangeStart);
    const end = new Date(today);
    end.setHours(config.timeRangeEnd);
    return events
      .filter((e) => new Date(e.endTime) > start && new Date(e.startTime) < end)
      .slice(0, config.maxEvents);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, now, config, dateKey]);

  // Build the agenda items list (events + gap placeholders)
  const agendaItems = useMemo(
    () => buildAgendaItems(filteredEvents, now, config.timeRangeEnd, locale),
    [filteredEvents, now, config.timeRangeEnd, locale],
  );

  // Build hour labels for the gutter
  const hours = useMemo(() => {
    const h: number[] = [];
    for (let i = config.timeRangeStart; i < config.timeRangeEnd; i++) h.push(i);
    return h;
  }, [config.timeRangeStart, config.timeRangeEnd]);

  return (
    <div style={{ display: "flex", height: "100%", padding: "1.5rem", overflow: "hidden" }}>
      {/* Hour gutter */}
      <div style={{ width: "4rem", flexShrink: 0, paddingTop: "0.25rem" }}>
        {hours.map((h) => (
          <div
            key={h}
            style={{
              height: `${100 / hours.length}%`,
              fontSize: "0.75rem",
              opacity: 0.5,
              display: "flex",
              alignItems: "flex-start",
            }}
          >
            {String(h).padStart(2, "0")}:00
          </div>
        ))}
      </div>

      {/* Event list with auto-scroll */}
      <div
        style={{
          flex: 1,
          borderLeft: "1px solid var(--display-muted)33",
          paddingLeft: "1rem",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <AutoScroller
          enabled={config.autoScroll}
          speed={config.autoScrollSpeed * 30}
          pauseAtBottomMs={3000}
        >
          {filteredEvents.length === 0 && (
            <div
              style={{
                display: "flex",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0.4,
              }}
            >
              No events today
            </div>
          )}

          {agendaItems.map((item, idx) =>
            item.kind === "event" ? (
              <EventCard key={item.event.id} item={item} config={config} locale={locale} />
            ) : (
              <GapPlaceholder key={`gap-${idx}`} item={item} />
            ),
          )}
        </AutoScroller>
      </div>
    </div>
  );
}
