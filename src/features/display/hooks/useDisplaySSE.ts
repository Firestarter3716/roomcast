"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface DisplayEvent {
  id: string;
  calendarId: string;
  calendarColor: string;
  calendarName: string;
  title: string;
  description: string | null;
  location: string | null;
  organizer: string | null;
  attendeeCount: number | null;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  isRecurring: boolean;
}

interface SSEMessage {
  type: "init" | "calendar_update" | "config_update";
  displayId?: string;
  config?: unknown;
  events?: DisplayEvent[];
  calendarId?: string;
}

export function useDisplaySSE({ token, enabled = true }: { token: string; enabled?: boolean }) {
  const [events, setEvents] = useState<DisplayEvent[]>([]);
  const [config, setConfig] = useState<unknown>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;
    if (eventSourceRef.current) eventSourceRef.current.close();

    const es = new EventSource(`/api/display/${token}/events`);
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setError(null);
      retryCountRef.current = 0;
      if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
      heartbeatTimerRef.current = setTimeout(() => { es.close(); setConnected(false); }, 60000);
    };

    es.onmessage = (event) => {
      if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
      heartbeatTimerRef.current = setTimeout(() => { es.close(); setConnected(false); retryCountRef.current++; connect(); }, 60000);
      try {
        const data: SSEMessage = JSON.parse(event.data);
        if (data.type === "init") {
          if (data.events) setEvents(data.events);
          if (data.config) setConfig(data.config);
        } else if (data.type === "calendar_update" && data.events) {
          setEvents((prev) => {
            const filtered = prev.filter((e) => e.calendarId !== data.calendarId);
            return [...filtered, ...(data.events || [])].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
          });
        } else if (data.type === "config_update" && data.config) {
          setConfig(data.config);
        }
      } catch { /* heartbeat comment */ }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      const delays = [5000, 10000, 20000, 60000];
      const delay = delays[Math.min(retryCountRef.current, delays.length - 1)];
      retryCountRef.current++;
      if (retryCountRef.current > 10) { setError("Connection lost. Please refresh."); return; }
      retryTimerRef.current = setTimeout(connect, delay);
    };
  }, [token, enabled]);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
    };
  }, [connect]);

  return { events, config, connected, error };
}
