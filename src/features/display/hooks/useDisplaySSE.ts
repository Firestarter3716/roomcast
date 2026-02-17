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

type ConnectionMode = "sse" | "polling";

const SSE_MAX_RETRIES_BEFORE_POLLING = 3;
const POLLING_INTERVAL_MS = 30_000;
const SSE_BACKGROUND_RECONNECT_INTERVAL_MS = 5 * 60_000;

export function useDisplaySSE({ token, enabled = true }: { token: string; enabled?: boolean }) {
  const [events, setEvents] = useState<DisplayEvent[]>([]);
  const [config, setConfig] = useState<unknown>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>("sse");

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseReconnectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const modeRef = useRef<ConnectionMode>("sse");

  // Keep modeRef in sync with state so callbacks always see the latest value
  modeRef.current = connectionMode;

  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    if (sseReconnectTimerRef.current) {
      clearInterval(sseReconnectTimerRef.current);
      sseReconnectTimerRef.current = null;
    }
  }, []);

  const pollEvents = useCallback(async () => {
    try {
      const res = await fetch(`/api/display/${token}/events/poll`);
      if (!res.ok) {
        setError(`Polling failed: ${res.status}`);
        return;
      }
      const data: SSEMessage = await res.json();
      if (data.events) setEvents(data.events);
      if (data.config) setConfig(data.config);
      setError(null);
    } catch (err) {
      setError("Polling request failed. Retrying...");
    }
  }, [token]);

  const connect = useCallback(() => {
    if (!enabled) return;
    if (eventSourceRef.current) eventSourceRef.current.close();

    const es = new EventSource(`/api/display/${token}/events`);
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setError(null);
      retryCountRef.current = 0;

      // If we were in polling mode, SSE has recovered -- switch back
      if (modeRef.current === "polling") {
        stopPolling();
        setConnectionMode("sse");
      }

      if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
      heartbeatTimerRef.current = setTimeout(() => {
        es.close();
        setConnected(false);
      }, 60000);
    };

    es.onmessage = (event) => {
      if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
      heartbeatTimerRef.current = setTimeout(() => {
        es.close();
        setConnected(false);
        retryCountRef.current++;
        connect();
      }, 60000);

      try {
        const data: SSEMessage = JSON.parse(event.data);
        if (data.type === "init") {
          if (data.events) setEvents(data.events);
          if (data.config) setConfig(data.config);
        } else if (data.type === "calendar_update" && data.events) {
          setEvents((prev) => {
            const filtered = prev.filter((e) => e.calendarId !== data.calendarId);
            return [...filtered, ...(data.events || [])].sort(
              (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            );
          });
        } else if (data.type === "config_update" && data.config) {
          setConfig(data.config);
        }
      } catch {
        /* heartbeat comment */
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      eventSourceRef.current = null;
      retryCountRef.current++;

      // After 3 failed SSE attempts, fall back to polling mode
      if (retryCountRef.current >= SSE_MAX_RETRIES_BEFORE_POLLING && modeRef.current === "sse") {
        setConnectionMode("polling");
        setError(null);
        return; // Polling will be started by the effect that watches connectionMode
      }

      // Still in SSE mode -- keep retrying with backoff
      const delays = [5000, 10000, 20000, 60000];
      const delay = delays[Math.min(retryCountRef.current - 1, delays.length - 1)];
      if (retryCountRef.current > 10) {
        setError("Connection lost. Please refresh.");
        return;
      }
      retryTimerRef.current = setTimeout(connect, delay);
    };
  }, [token, enabled, stopPolling]);

  // Attempt an SSE reconnect from polling mode. This runs in the background
  // every 5 minutes. If it succeeds, the onopen handler switches back to SSE.
  const trySSEReconnect = useCallback(() => {
    if (!enabled) return;
    // Close any lingering EventSource before attempting reconnect
    if (eventSourceRef.current) eventSourceRef.current.close();

    const es = new EventSource(`/api/display/${token}/events`);
    eventSourceRef.current = es;

    // Give it 10 seconds to connect, otherwise close quietly
    const timeout = setTimeout(() => {
      es.close();
      eventSourceRef.current = null;
    }, 10_000);

    es.onopen = () => {
      clearTimeout(timeout);
      setConnected(true);
      setError(null);
      retryCountRef.current = 0;
      stopPolling();
      setConnectionMode("sse");

      if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
      heartbeatTimerRef.current = setTimeout(() => {
        es.close();
        setConnected(false);
      }, 60000);
    };

    es.onmessage = (event) => {
      if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
      heartbeatTimerRef.current = setTimeout(() => {
        es.close();
        setConnected(false);
        retryCountRef.current++;
        connect();
      }, 60000);

      try {
        const data: SSEMessage = JSON.parse(event.data);
        if (data.type === "init") {
          if (data.events) setEvents(data.events);
          if (data.config) setConfig(data.config);
        } else if (data.type === "calendar_update" && data.events) {
          setEvents((prev) => {
            const filtered = prev.filter((e) => e.calendarId !== data.calendarId);
            return [...filtered, ...(data.events || [])].sort(
              (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            );
          });
        } else if (data.type === "config_update" && data.config) {
          setConfig(data.config);
        }
      } catch {
        /* heartbeat comment */
      }
    };

    es.onerror = () => {
      clearTimeout(timeout);
      es.close();
      eventSourceRef.current = null;
      // Stay in polling mode -- the interval will try again later
    };
  }, [token, enabled, stopPolling, connect]);

  // Effect: start or stop polling based on connectionMode
  useEffect(() => {
    if (connectionMode === "polling" && enabled) {
      // Do an immediate poll, then set up the interval
      pollEvents();
      pollingTimerRef.current = setInterval(pollEvents, POLLING_INTERVAL_MS);

      // Set up background SSE reconnection attempts
      sseReconnectTimerRef.current = setInterval(
        trySSEReconnect,
        SSE_BACKGROUND_RECONNECT_INTERVAL_MS
      );

      return () => {
        stopPolling();
      };
    }
  }, [connectionMode, enabled, pollEvents, trySSEReconnect, stopPolling]);

  // Effect: initial SSE connection
  useEffect(() => {
    if (connectionMode === "sse") {
      connect();
    }
    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
    };
  }, [connect, connectionMode]);

  // Cleanup everything on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      eventSourceRef.current?.close();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
    };
  }, [stopPolling]);

  return { events, config, connected, error, connectionMode };
}
