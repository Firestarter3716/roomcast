"use client";

import { useCurrentTime } from "../hooks/useCurrentTime";

interface ProgressBarProps {
  startTime: Date;
  endTime: Date;
  color?: string;
  height?: number;
}

export function ProgressBar({ startTime, endTime, color, height = 4 }: ProgressBarProps) {
  const now = useCurrentTime(10000);
  const total = endTime.getTime() - startTime.getTime();
  const elapsed = now.getTime() - startTime.getTime();
  const percent = Math.max(0, Math.min(100, (elapsed / total) * 100));

  return (
    <div style={{ width: "100%", height: `${height}px`, borderRadius: `${height / 2}px`, backgroundColor: `${color || "var(--display-muted)"}33`, overflow: "hidden" }}>
      <div style={{ width: `${percent}%`, height: "100%", borderRadius: `${height / 2}px`, backgroundColor: color || "var(--display-primary)", transition: "width 10s linear" }} />
    </div>
  );
}
