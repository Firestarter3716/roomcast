import { getDisplayTranslations } from "./translations";

interface StatusBannerProps {
  isFree: boolean;
  isEndingSoon?: boolean;
  freeColor?: string;
  busyColor?: string;
  locale?: string;
}

export function StatusBanner({ isFree, isEndingSoon, freeColor, busyColor, locale }: StatusBannerProps) {
  const t = getDisplayTranslations(locale || "de-DE");

  const color = isFree
    ? (freeColor || "var(--display-free)")
    : isEndingSoon
      ? "var(--display-ending-soon)"
      : (busyColor || "var(--display-busy)");

  const text = isFree
    ? t.status.free
    : isEndingSoon
      ? t.status.endingSoon
      : t.status.busy;

  return (
    <div style={{ padding: "1rem 2rem", fontSize: "clamp(2rem, 5vw, 4rem)", fontWeight: 700, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.1em", color }}>
      {text}
    </div>
  );
}
