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
// CSS keyframes injected once for the fade transition
// ---------------------------------------------------------------------------
const FADE_KEYFRAMES = `
@keyframes rbv-fade-in {
  from { opacity: 0; }
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

  // Inject keyframes on mount
  useEffect(() => {
    ensureKeyframes();
  }, []);

  // --------------------------------------------------
  // Derive current / upcoming events
  // --------------------------------------------------
  const { currentEvent, nextEvents, isFree, isEndingSoon, freeFromTime } = useMemo(() => {
    const nowMs = now.getTime();
    const current = events.find(
      (e) =>
        !e.isAllDay &&
        new Date(e.startTime).getTime() <= nowMs &&
        new Date(e.endTime).getTime() > nowMs,
    );
    const allDay = events.find((e) => e.isAllDay);
    const upcoming = events
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

    return {
      currentEvent: current || allDay || null,
      nextEvents: upcoming,
      isFree: !current && !allDay,
      isEndingSoon: endingSoon,
      freeFromTime: freeFrom,
    };
  }, [events, now, config.futureEventCount, locale]);

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

  /** Current meeting detail block */
  const meetingDetail = currentEvent ? (
    <div
      key={fadeKey}
      style={{
        padding: "1.5rem",
        borderRadius: "0.75rem",
        backgroundColor: "var(--display-busy)15",
        animation: "rbv-fade-in 0.5s ease-in-out",
      }}
    >
      <div
        style={{
          fontSize: "clamp(1.25rem, 3vw, 2rem)",
          fontWeight: 600,
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
            fontWeight: 500,
          }}
        >
          {t.status.endingSoon}
        </div>
      )}

      {/* All-day event: show "Occupied all day" instead of progress + time */}
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
            style={{ marginTop: "0.5rem", fontSize: "0.875rem", opacity: 0.6 }}
          >
            {formatTime(currentEvent.startTime)} -{" "}
            {formatTime(currentEvent.endTime)}
          </div>
        </>
      )}
    </div>
  ) : null;

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

  /** Upcoming events list */
  const upcomingList =
    nextEvents.length > 0 ? (
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
        {nextEvents.map((event) => (
          <div
            key={event.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              padding: "0.75rem 0",
              borderTop: "1px solid var(--display-muted)22",
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
              {formatTime(event.startTime)}
            </div>
            <div style={{ fontSize: "0.875rem" }}>{event.title}</div>
          </div>
        ))}
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
        }}
      >
        {/* Top: Large status banner spanning full width */}
        <div style={{ marginBottom: "1rem" }}>{statusBanner}</div>

        {/* Room name and location */}
        {roomName && (
          <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
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
        {freeFromIndicator}

        {/* Middle: Current meeting info */}
        {meetingDetail && (
          <div style={{ marginTop: "1rem", marginBottom: "1.5rem" }}>{meetingDetail}</div>
        )}

        {/* Below: Upcoming events (compact), pushed toward bottom */}
        {upcomingList && (
          <div style={{ marginTop: "auto", paddingTop: "1.5rem" }}>
            {upcomingList}
          </div>
        )}

        {/* Bottom: Date + Clock */}
        <div
          style={{
            marginTop: upcomingList ? "1.5rem" : "auto",
            textAlign: "center",
            paddingTop: "1rem",
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
      }}
    >
      {/* Left 60%: Status + meeting details */}
      <div
        style={{
          flex: "0 0 60%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header row: room name + clock */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
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
        {statusBanner}

        {/* Free from indicator */}
        {freeFromIndicator}

        {/* Current meeting detail */}
        {meetingDetail && (
          <div style={{ marginTop: "1.5rem" }}>{meetingDetail}</div>
        )}
      </div>

      {/* Right 40%: Upcoming events */}
      <div
        style={{
          flex: "0 0 calc(40% - 2rem)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          paddingTop: "4rem",
          overflowY: "auto",
        }}
      >
        {upcomingList}
      </div>
    </div>
  );
}
