"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useCurrentTime } from "../hooks/useCurrentTime";
import { DisplayClock } from "../shared/DisplayClock";
import { ProgressBar } from "../shared/ProgressBar";
import { StatusBanner } from "../shared/StatusBanner";
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
  locale,
  orientation,
}: RoomBookingViewProps) {
  const now = useCurrentTime(10000);
  const isPortrait = orientation === "PORTRAIT";

  // Inject keyframes on mount
  useEffect(() => {
    ensureKeyframes();
  }, []);

  // --------------------------------------------------
  // Derive current / upcoming events
  // --------------------------------------------------
  const { currentEvent, nextEvents, isFree, isEndingSoon } = useMemo(() => {
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
    return {
      currentEvent: current || allDay || null,
      nextEvents: upcoming,
      isFree: !current && !allDay,
      isEndingSoon: endingSoon,
    };
  }, [events, now, config.futureEventCount]);

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

  /** Large status banner spanning full width */
  const statusBanner = (
    <StatusBanner isFree={isFree} />
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
          {currentEvent.attendeeCount} attendees
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
          Ending soon
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
          Occupied all day
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
          Coming up
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
        <div style={{ marginBottom: "1.5rem" }}>{statusBanner}</div>

        {/* Room name */}
        {roomName && (
          <div
            style={{
              fontSize: "clamp(1rem, 2vw, 1.5rem)",
              opacity: 0.7,
              marginBottom: "1rem",
              textAlign: "center",
            }}
          >
            {roomName}
          </div>
        )}

        {/* Middle: Current meeting info */}
        {meetingDetail && (
          <div style={{ marginBottom: "1.5rem" }}>{meetingDetail}</div>
        )}

        {/* Below: Upcoming events (compact), pushed toward bottom */}
        {upcomingList && (
          <div style={{ marginTop: "auto", paddingTop: "1.5rem" }}>
            {upcomingList}
          </div>
        )}

        {/* Bottom: Clock */}
        <div
          style={{
            marginTop: upcomingList ? "1.5rem" : "auto",
            textAlign: "center",
            paddingTop: "1rem",
          }}
        >
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
          </div>
          <DisplayClock
            format={config.clockFormat}
            className="text-3xl font-light opacity-70"
            locale={locale}
          />
        </div>

        {/* Status banner */}
        {statusBanner}

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
