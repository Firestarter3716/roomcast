"use client";

import { useRef, useEffect, useCallback, type ReactNode } from "react";

interface AutoScrollerProps {
  enabled: boolean;
  /** Scroll speed in pixels per second */
  speed: number;
  /** Milliseconds to pause at the bottom before resetting to top */
  pauseAtBottomMs?: number;
  children: ReactNode;
  style?: React.CSSProperties;
}

/**
 * A wrapper component that smoothly auto-scrolls its children using
 * requestAnimationFrame when content overflows the container.
 *
 * Scrolls down pixel-by-pixel at the given speed. When the bottom is
 * reached, pauses for `pauseAtBottomMs` then resets to the top.
 */
export function AutoScroller({
  enabled,
  speed,
  pauseAtBottomMs = 3000,
  children,
  style,
}: AutoScrollerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const pauseUntilRef = useRef<number>(0);

  const animate = useCallback(
    (timestamp: number) => {
      const container = containerRef.current;
      if (!container) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      // Check if content actually overflows
      const maxScroll = container.scrollHeight - container.clientHeight;
      if (maxScroll <= 0) {
        lastTimeRef.current = timestamp;
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      // Handle pause at bottom
      if (pauseUntilRef.current > 0) {
        if (timestamp < pauseUntilRef.current) {
          lastTimeRef.current = timestamp;
          rafRef.current = requestAnimationFrame(animate);
          return;
        }
        // Pause is over -- reset to top
        pauseUntilRef.current = 0;
        container.scrollTop = 0;
        lastTimeRef.current = timestamp;
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      // Calculate elapsed time and scroll distance
      const elapsed = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 0;
      lastTimeRef.current = timestamp;

      const delta = speed * elapsed;
      container.scrollTop += delta;

      // If we've reached (or passed) the bottom, start the pause
      if (container.scrollTop >= maxScroll) {
        container.scrollTop = maxScroll;
        pauseUntilRef.current = timestamp + pauseAtBottomMs;
      }

      rafRef.current = requestAnimationFrame(animate);
    },
    [speed, pauseAtBottomMs],
  );

  useEffect(() => {
    if (!enabled) {
      // If auto-scroll is disabled, reset position and stop
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      lastTimeRef.current = 0;
      pauseUntilRef.current = 0;
      return;
    }

    lastTimeRef.current = 0;
    pauseUntilRef.current = 0;
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [enabled, animate]);

  return (
    <div
      ref={containerRef}
      style={{
        overflow: "hidden",
        height: "100%",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
