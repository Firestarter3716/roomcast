"use client";

interface TickerTapeProps {
  messages: string[];
  speed?: number;
  separator?: string;
  color?: string;
}

export function TickerTape({ messages, speed = 50, separator = " \u2022\u2022\u2022 ", color }: TickerTapeProps) {
  if (!messages.length) return null;
  const text = messages.join(separator) + separator;
  const fullText = text + text;
  const duration = (text.length * 16) / speed;

  return (
    <div style={{ overflow: "hidden", whiteSpace: "nowrap", width: "100%", padding: "0.5rem 0", fontSize: "0.875rem", color: color || "var(--display-muted)", borderTop: `1px solid ${color || "var(--display-muted)"}33` }}>
      <div style={{ display: "inline-block", animation: `ticker ${duration}s linear infinite` }}>{fullText}</div>
      <style>{`@keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
    </div>
  );
}
