"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useCurrentTime } from "../hooks/useCurrentTime";
import { DisplayClock } from "../shared/DisplayClock";
import { TickerTape } from "../shared/TickerTape";
import { getDisplayTranslations } from "../shared/translations";
import { type DisplayEvent } from "../hooks/useDisplaySSE";
import { type InfoDisplayConfig } from "@/features/displays/types";

interface InfoDisplayViewProps { events: DisplayEvent[]; config: InfoDisplayConfig; locale?: string; }

export function InfoDisplayView({ events, config, locale }: InfoDisplayViewProps) {
  const showSeconds = config.showSeconds ?? false;
  const clockPosition = config.clockPosition ?? "top-right";
  const tickerSeparator = config.tickerSeparator ?? " \u2022\u2022\u2022 ";
  const now = useCurrentTime(showSeconds ? 1000 : 30000);
  const t = getDisplayTranslations(locale || "de-DE");

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
  const todayEvents = useMemo(() => {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    return events.filter((e) => { const s = new Date(e.startTime); return s >= today && s < tomorrow && new Date(e.endTime) > now; }).slice(0, 5);
  }, [events, now]);

  const upcomingEvents = useMemo(() => {
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const futureEnd = new Date(tomorrow); futureEnd.setDate(futureEnd.getDate() + config.upcomingDaysCount);
    return events.filter((e) => { const s = new Date(e.startTime); return s >= tomorrow && s < futureEnd; }).slice(0, 10);
  }, [events, now, config.upcomingDaysCount]);

  const dateString = now.toLocaleDateString(locale || "de-DE", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div key={fadeKey} style={{ display: "flex", flexDirection: "column", height: "100%", padding: "2rem", animation: "display-fade-in-subtle 0.5s ease-in-out" }}>
      <div style={{ display: "flex", justifyContent: clockPosition === "center" ? "center" : "space-between", alignItems: clockPosition === "center" ? "center" : "flex-start", marginBottom: "2rem", flexDirection: clockPosition === "center" ? "column" : "row", gap: clockPosition === "center" ? "0.5rem" : undefined }}>
        {clockPosition === "center" ? (
          <>
            {config.showClock && <DisplayClock format={config.clockFormat} showSeconds={showSeconds} className="text-5xl font-light" locale={locale} />}
            {config.showDate && <div style={{ fontSize: "clamp(0.875rem, 1.5vw, 1.25rem)", opacity: 0.7 }}>{dateString}</div>}
          </>
        ) : (
          <>
            <div>{config.showDate && <div style={{ fontSize: "clamp(0.875rem, 1.5vw, 1.25rem)", opacity: 0.7 }}>{dateString}</div>}</div>
            {config.showClock && <DisplayClock format={config.clockFormat} showSeconds={showSeconds} className="text-5xl font-light" locale={locale} />}
          </>
        )}
      </div>
      <div style={{ flex: 1, display: "flex", gap: "2rem", minHeight: 0 }}>
        {config.showTodayEvents && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "var(--display-text-xs, 0.75rem)", textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.5, marginBottom: "1rem" }}>{t.today}</div>
            {todayEvents.length === 0 ? <div style={{ opacity: 0.4, fontSize: "var(--display-text-base, 0.875rem)" }}>{t.noEvents}</div> : todayEvents.map((event) => (
              <div key={event.id} style={{ padding: "0.75rem", marginBottom: "0.5rem", borderRadius: "0.5rem", borderLeft: `3px solid ${event.calendarColor || "var(--display-primary)"}`, backgroundColor: `color-mix(in srgb, ${event.calendarColor || "var(--display-primary)"} 8%, transparent)` }}>
                <div style={{ fontWeight: 600, fontSize: "var(--display-text-base, 0.9375rem)" }}>{event.title}</div>
                <div style={{ fontSize: "var(--display-text-sm, 0.8125rem)", opacity: 0.7, marginTop: "0.25rem" }}>
                  {new Date(event.startTime).toLocaleTimeString(locale || "de-DE", { hour: "2-digit", minute: "2-digit" })} - {new Date(event.endTime).toLocaleTimeString(locale || "de-DE", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "var(--display-text-xs, 0.75rem)", textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.5, marginBottom: "1rem" }}>{t.upcoming}</div>
          {upcomingEvents.length === 0 ? <div style={{ opacity: 0.4, fontSize: "var(--display-text-base, 0.875rem)" }}>{t.noUpcomingEvents}</div> : upcomingEvents.map((event) => (
            <div key={event.id} style={{ display: "flex", gap: "1rem", padding: "0.5rem 0", borderBottom: "1px solid color-mix(in srgb, var(--display-muted) 8%, transparent)" }}>
              <div style={{ fontSize: "var(--display-text-xs, 0.75rem)", opacity: 0.6, width: "5rem", flexShrink: 0 }}>{new Date(event.startTime).toLocaleDateString(locale || "de-DE", { weekday: "short", day: "numeric", month: "short" })}</div>
              <div><div style={{ fontSize: "var(--display-text-sm, 0.875rem)", fontWeight: 500 }}>{event.title}</div><div style={{ fontSize: "var(--display-text-xs, 0.75rem)", opacity: 0.6 }}>{new Date(event.startTime).toLocaleTimeString(locale || "de-DE", { hour: "2-digit", minute: "2-digit" })}</div></div>
            </div>
          ))}
        </div>
      </div>
      {config.tickerEnabled && config.tickerMessages.length > 0 && <TickerTape messages={config.tickerMessages} speed={config.tickerSpeed} separator={tickerSeparator} />}
    </div>
  );
}
