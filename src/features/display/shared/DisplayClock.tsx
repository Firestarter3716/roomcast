"use client";

import { useCurrentTime } from "../hooks/useCurrentTime";

interface DisplayClockProps {
  format?: "12h" | "24h";
  showSeconds?: boolean;
  className?: string;
}

export function DisplayClock({ format = "24h", showSeconds = false, className }: DisplayClockProps) {
  const now = useCurrentTime(1000);
  const timeString = now.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: showSeconds ? "2-digit" : undefined,
    hour12: format === "12h",
  });
  return <span className={className}>{timeString}</span>;
}
