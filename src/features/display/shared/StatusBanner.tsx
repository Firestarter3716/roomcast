interface StatusBannerProps {
  isFree: boolean;
  freeColor?: string;
  busyColor?: string;
}

export function StatusBanner({ isFree, freeColor, busyColor }: StatusBannerProps) {
  return (
    <div style={{ padding: "1rem 2rem", fontSize: "clamp(2rem, 5vw, 4rem)", fontWeight: 700, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.1em", color: isFree ? (freeColor || "var(--display-free)") : (busyColor || "var(--display-busy)") }}>
      {isFree ? "Free" : "Busy"}
    </div>
  );
}
