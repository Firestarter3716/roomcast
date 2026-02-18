"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useCurrentTime } from "../hooks/useCurrentTime";
import { DisplayClock } from "../shared/DisplayClock";
import { ProgressBar } from "../shared/ProgressBar";
import { StatusBanner } from "../shared/StatusBanner";
import { getDisplayTranslations } from "../shared/translations";
import { type DisplayEvent } from "../hooks/useDisplaySSE";
import { type RoomBookingConfig } from "@/features/displays/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface RoomBookingViewProps {
  events: DisplayEvent[];
  config: RoomBookingConfig;
  roomName?: string;
  roomLocation?: string;
  locale?: string;
  orientation?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function RoomBookingView({
  events,
  config,
  roomName,
  roomLocation,
  locale,
  orientation,
}: RoomBookingViewProps) {
  const now = useCurrentTime(10000);
  const isPortrait = orientation === "PORTRAIT";
  const t = getDisplayTranslations(locale || "de-DE");

  // --------------------------------------------------
  // Derive current / upcoming events
  // --------------------------------------------------
  type UpcomingItem = { type: "event"; event: DisplayEvent } | { type: "free"; startTime: string; endTime: string; durationMin: number };

  const { currentEvent, nextEvents, nextItems, isFree, isEndingSoon, freeFromTime } = useMemo(() => {
    const nowMs = now.getTime();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();

    // Filter to today's events only (RoomBookingView is a single-day view)
    const todayEvents = events.filter((e) => {
      if (e.isAllDay) {
        // All-day events: check if they overlap today
        const eStart = new Date(e.startTime).getTime();
        const eEnd = new Date(e.endTime).getTime();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        return eStart < todayEnd && eEnd > todayStart;
      }
      // Timed events: starts before end of today AND ends after start of today
      const eStart = new Date(e.startTime).getTime();
      return eStart < todayEnd;
    });

    const current = todayEvents.find(
      (e) =>
        !e.isAllDay &&
        new Date(e.startTime).getTime() <= nowMs &&
        new Date(e.endTime).getTime() > nowMs,
    );
    const allDay = todayEvents.find((e) => e.isAllDay);
    const upcoming = todayEvents
      .filter((e) => !e.isAllDay && new Date(e.startTime).getTime() > nowMs)
      .slice(0, config.futureEventCount);
    const endingSoon = current
      ? new Date(current.endTime).getTime() - nowMs <= 15 * 60 * 1000
      : false;

    // Calculate "free from" time: when the current meeting ends
    let freeFrom: string | null = null;
    if (current && !current.isAllDay) {
      freeFrom = new Date(current.endTime).toLocaleTimeString(locale || "de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    // Build upcoming items list, interleaving free slots if enabled
    const items: UpcomingItem[] = [];

    function addHourlyFreeSlots(target: UpcomingItem[], from: number, to: number) {
      let slotStart = from;
      while (slotStart < to) {
        const d = new Date(slotStart);
        const nextHour = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours() + 1).getTime();
        const slotEnd = Math.min(nextHour, to);
        const slotMin = Math.round((slotEnd - slotStart) / 60_000);
        if (slotMin >= 5) {
          target.push({
            type: "free",
            startTime: new Date(slotStart).toISOString(),
            endTime: new Date(slotEnd).toISOString(),
            durationMin: slotMin,
          });
        }
        slotStart = slotEnd;
      }
    }

    if (config.showFreeSlots) {
      // Use ALL today's future events (not just the display limit) for accurate free slot calculation
      const allTodayUpcoming = todayEvents
        .filter((e) => !e.isAllDay && new Date(e.startTime).getTime() > nowMs)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

      // Starting point: end of current event or now
      let cursor = current ? new Date(current.endTime).getTime() : nowMs;

      for (const event of allTodayUpcoming) {
        const eventStart = new Date(event.startTime).getTime();
        // Only insert free slots in gaps not covered by other events
        if (eventStart > cursor) {
          addHourlyFreeSlots(items, cursor, eventStart);
        }
        items.push({ type: "event", event });
        // Advance cursor past this event's end (handles overlapping events)
        cursor = Math.max(cursor, new Date(event.endTime).getTime());
      }

      // Add free slots for the rest of the day after the last event
      if (cursor < todayEnd) {
        // Cap at a reasonable end-of-day (e.g. 22:00) to avoid showing midnight slots
        const eodCap = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22).getTime();
        if (cursor < eodCap) {
          addHourlyFreeSlots(items, cursor, Math.min(todayEnd, eodCap));
        }
      }
    } else {
      for (const event of upcoming) {
        items.push({ type: "event", event });
      }
    }

    // Next N upcoming events (for left-side cards in landscape, max 5)
    const cardCount = Math.min(Math.max(config.nextEventCards ?? 2, 0), 5);
    const next2 = upcoming.slice(0, cardCount);

    return {
      currentEvent: current || allDay || null,
      nextEvents: next2,
      nextItems: items,
      isFree: !current && !allDay,
      isEndingSoon: endingSoon,
      freeFromTime: freeFrom,
    };
  }, [events, now, config.futureEventCount, config.nextEventCards, config.showFreeSlots, locale]);

  // --------------------------------------------------
  // Fade transition: track previous event id
  // --------------------------------------------------
  const currentEventId = currentEvent?.id ?? null;
  const prevEventIdRef = useRef<string | null>(currentEventId);
  const [fadeKey, setFadeKey] = useState(0);

  useEffect(() => {
    if (currentEventId !== prevEventIdRef.current) {
      prevEventIdRef.current = currentEventId;
      setFadeKey((k) => k + 1);
    }
  }, [currentEventId]);

  // --------------------------------------------------
  // Shared sub-components
  // --------------------------------------------------
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale || "de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const dateString = now.toLocaleDateString(locale || "de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  /** Large status banner spanning full width */
  const statusBanner = (
    <StatusBanner isFree={isFree} locale={locale} />
  );

  /** Current meeting detail block — highlighted card */
  const meetingDetail = currentEvent ? (
    <div
      key={fadeKey}
      style={{
        padding: "1.5rem",
        borderRadius: "0.75rem",
        backgroundColor: "color-mix(in srgb, var(--display-busy) 12%, transparent)",
        borderLeft: "4px solid var(--display-busy)",
        animation: "display-fade-in 0.5s ease-out",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
        <div style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", backgroundColor: "var(--display-busy)", animation: "display-pulse 2s ease-in-out infinite" }} />
        <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.6, fontWeight: 600 }}>{t.status.busy}</span>
      </div>
      <div
        style={{
          fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)",
          fontWeight: 700,
          lineHeight: 1.2,
        }}
      >
        {currentEvent.title}
      </div>

      {config.showOrganizer && currentEvent.organizer && (
        <div style={{ marginTop: "0.5rem", opacity: 0.7 }}>
          {currentEvent.organizer}
        </div>
      )}

      {config.showAttendeeCount && currentEvent.attendeeCount != null && (
        <div
          style={{ marginTop: "0.25rem", opacity: 0.6, fontSize: "0.875rem" }}
        >
          {currentEvent.attendeeCount} {t.attendees}
        </div>
      )}

      {isEndingSoon && (
        <div
          style={{
            marginTop: "0.5rem",
            color: "var(--display-busy)",
            fontSize: "0.875rem",
            fontWeight: 600,
          }}
        >
          {t.status.endingSoon}
        </div>
      )}

      {currentEvent.isAllDay ? (
        <div
          style={{
            marginTop: "1rem",
            fontSize: "1rem",
            fontWeight: 500,
            opacity: 0.8,
          }}
        >
          {t.status.allDay}
        </div>
      ) : (
        <>
          {config.showProgressBar && (
            <div style={{ marginTop: "1rem" }}>
              <ProgressBar
                startTime={new Date(currentEvent.startTime)}
                endTime={new Date(currentEvent.endTime)}
                color="var(--display-busy)"
              />
            </div>
          )}
          <div
            style={{ marginTop: "0.5rem", fontSize: "1rem", opacity: 0.7, fontWeight: 500 }}
          >
            {formatTime(currentEvent.startTime)} – {formatTime(currentEvent.endTime)}
          </div>
        </>
      )}
    </div>
  ) : null;

  /** Next event card (smaller, muted style) */
  const nextEventCard = (event: DisplayEvent) => (
    <div
      key={event.id}
      style={{
        padding: "1rem 1.25rem",
        borderRadius: "0.75rem",
        backgroundColor: "color-mix(in srgb, var(--display-muted) 6%, transparent)",
        borderLeft: "3px solid color-mix(in srgb, var(--display-muted) 30%, transparent)",
      }}
    >
      <div style={{ fontSize: "clamp(0.875rem, 1.5vw, 1.125rem)", fontWeight: 600 }}>
        {event.title}
      </div>
      <div style={{ marginTop: "0.25rem", fontSize: "0.8rem", opacity: 0.55, fontWeight: 500 }}>
        {formatTime(event.startTime)} – {formatTime(event.endTime)}
      </div>
    </div>
  );

  /** "Free from HH:MM" indicator shown when room is busy */
  const freeFromIndicator = !isFree && freeFromTime ? (
    <div
      style={{
        marginTop: "0.75rem",
        fontSize: "clamp(0.875rem, 1.5vw, 1.125rem)",
        opacity: 0.6,
        textAlign: "center",
      }}
    >
      {t.status.freeFrom.replace("{time}", freeFromTime)}
    </div>
  ) : null;

  /** Upcoming events / free slots list */
  const upcomingList =
    nextItems.length > 0 ? (
      <div>
        <div
          style={{
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            opacity: 0.5,
            marginBottom: "0.75rem",
          }}
        >
          {t.comingUp}
        </div>
        {nextItems.map((item, i) =>
          item.type === "event" ? (
            <div
              key={item.event.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "0.75rem 0",
                borderTop: "1px solid color-mix(in srgb, var(--display-muted) 13%, transparent)",
              }}
            >
              <div
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  opacity: 0.7,
                  width: "5rem",
                  flexShrink: 0,
                }}
              >
                {formatTime(item.event.startTime)}
              </div>
              <div style={{ fontSize: "0.875rem" }}>{item.event.title}</div>
            </div>
          ) : (
            <div
              key={`free-${i}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "0.75rem 0",
                borderTop: "1px solid color-mix(in srgb, var(--display-muted) 13%, transparent)",
              }}
            >
              <div
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  opacity: 0.7,
                  width: "5rem",
                  flexShrink: 0,
                }}
              >
                {formatTime(item.startTime)}
              </div>
              <div style={{ fontSize: "0.875rem", color: "var(--display-free)", opacity: 0.8 }}>
                {t.free} {formatTime(item.startTime)} – {formatTime(item.endTime)}
              </div>
            </div>
          ),
        )}
      </div>
    ) : null;

  // --------------------------------------------------
  // Portrait layout (vertical stack)
  // --------------------------------------------------
  if (isPortrait) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          padding: "2rem",
          overflow: "hidden",
        }}
      >
        {/* Top: Large status banner spanning full width */}
        <div style={{ marginBottom: "1rem", flexShrink: 0 }}>{statusBanner}</div>

        {/* Room name and location */}
        {roomName && (
          <div style={{ textAlign: "center", marginBottom: "0.5rem", flexShrink: 0 }}>
            <div
              style={{
                fontSize: "clamp(1rem, 2vw, 1.5rem)",
                opacity: 0.7,
              }}
            >
              {roomName}
            </div>
            {roomLocation && (
              <div
                style={{
                  fontSize: "clamp(0.75rem, 1.2vw, 1rem)",
                  opacity: 0.45,
                  marginTop: "0.25rem",
                }}
              >
                {roomLocation}
              </div>
            )}
          </div>
        )}

        {/* Free from indicator */}
        {freeFromIndicator && <div style={{ flexShrink: 0 }}>{freeFromIndicator}</div>}

        {/* Middle: Current meeting info */}
        {meetingDetail && (
          <div style={{ marginTop: "1rem", flexShrink: 0 }}>{meetingDetail}</div>
        )}

        {/* Upcoming events: takes remaining space, clips overflow */}
        {upcomingList && (
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", paddingTop: "1.5rem" }}>
            {upcomingList}
          </div>
        )}

        {/* Bottom: Date + Clock — always visible */}
        <div
          style={{
            marginTop: upcomingList ? "1rem" : "auto",
            textAlign: "center",
            paddingTop: "1rem",
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: "0.875rem", opacity: 0.5, marginBottom: "0.5rem" }}>
            {dateString}
          </div>
          <DisplayClock
            format={config.clockFormat}
            className="text-4xl font-light opacity-70"
            locale={locale}
          />
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // Landscape: measure which next-event cards fit without clipping
  // --------------------------------------------------
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const [visibleCardCount, setVisibleCardCount] = useState(nextEvents.length);

  useEffect(() => {
    const container = cardsContainerRef.current;
    if (!container || nextEvents.length === 0) {
      setVisibleCardCount(nextEvents.length);
      return;
    }
    function measure() {
      if (!container) return;
      const containerH = container.clientHeight;
      const children = Array.from(container.children) as HTMLElement[];
      // First child is the "Coming up" label
      let used = children[0]?.offsetHeight ?? 0;
      let fits = 0;
      for (let i = 1; i < children.length; i++) {
        const gap = 8; // 0.5rem gap
        const childH = children[i].offsetHeight + (i > 1 ? gap : gap);
        if (used + childH <= containerH) {
          used += childH;
          fits++;
        } else {
          break;
        }
      }
      setVisibleCardCount(fits);
    }
    // Measure after render
    const frame = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => { cancelAnimationFrame(frame); ro.disconnect(); };
  }, [nextEvents.length, currentEvent, isFree]);

  const visibleNextEvents = nextEvents.slice(0, visibleCardCount);
  const leftCardIds = new Set(visibleNextEvents.map((e) => e.id));
  const rightItems = nextItems.filter(
    (item) => item.type === "free" || !leftCardIds.has(item.event.id),
  );

  // --------------------------------------------------
  // Landscape layout (side by side)
  // --------------------------------------------------
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        height: "100%",
        padding: "2rem",
        gap: "2rem",
        overflow: "hidden",
      }}
    >
      {/* Left 60%: Status + current meeting + next 2 cards */}
      <div
        style={{
          flex: "0 0 60%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header row: room name + clock */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
            flexShrink: 0,
          }}
        >
          <div>
            {roomName && (
              <div
                style={{
                  fontSize: "clamp(1rem, 2vw, 1.5rem)",
                  opacity: 0.7,
                }}
              >
                {roomName}
              </div>
            )}
            {roomLocation && (
              <div
                style={{
                  fontSize: "clamp(0.75rem, 1.2vw, 1rem)",
                  opacity: 0.45,
                  marginTop: "0.125rem",
                }}
              >
                {roomLocation}
              </div>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <DisplayClock
              format={config.clockFormat}
              className="text-3xl font-light opacity-70"
              locale={locale}
            />
            <div style={{ fontSize: "0.75rem", opacity: 0.45, marginTop: "0.25rem" }}>
              {dateString}
            </div>
          </div>
        </div>

        {/* Status banner */}
        <div style={{ flexShrink: 0 }}>{statusBanner}</div>

        {/* Free from indicator */}
        {freeFromIndicator && <div style={{ flexShrink: 0 }}>{freeFromIndicator}</div>}

        {/* Current meeting detail — highlighted card */}
        {meetingDetail && (
          <div style={{ marginTop: "1.5rem", flexShrink: 0 }}>{meetingDetail}</div>
        )}

        {/* Next upcoming meetings as cards — only show cards that fully fit */}
        {nextEvents.length > 0 && (
          <div ref={cardsContainerRef} style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1, minHeight: 0, overflow: "hidden" }}>
            <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.4, fontWeight: 600, flexShrink: 0 }}>
              {t.comingUp}
            </div>
            {nextEvents.map((e, i) => (
              <div key={e.id} style={{ flexShrink: 0, visibility: i < visibleCardCount ? "visible" : "hidden" }}>
                {nextEventCard(e)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right 40%: Remaining upcoming events / free slots */}
      <div
        style={{
          flex: "0 0 calc(40% - 2rem)",
          display: "flex",
          flexDirection: "column",
          paddingTop: "4rem",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {rightItems.length > 0 ? (
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                opacity: 0.5,
                marginBottom: "0.75rem",
              }}
            >
              {t.comingUp}
            </div>
            {rightItems.map((item, i) =>
              item.type === "event" ? (
                <div
                  key={item.event.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "0.75rem 0",
                    borderTop: "1px solid color-mix(in srgb, var(--display-muted) 13%, transparent)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      opacity: 0.7,
                      width: "5rem",
                      flexShrink: 0,
                    }}
                  >
                    {formatTime(item.event.startTime)}
                  </div>
                  <div style={{ fontSize: "0.875rem" }}>{item.event.title}</div>
                </div>
              ) : (
                <div
                  key={`free-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "0.75rem 0",
                    borderTop: "1px solid color-mix(in srgb, var(--display-muted) 13%, transparent)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      opacity: 0.7,
                      width: "5rem",
                      flexShrink: 0,
                    }}
                  >
                    {formatTime(item.startTime)}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "var(--display-free)", opacity: 0.8 }}>
                    {t.free} {formatTime(item.startTime)} – {formatTime(item.endTime)}
                  </div>
                </div>
              ),
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
