"use client";

import { useEffect, type ReactNode } from "react";
import { type DisplayConfig, DEFAULT_THEME, DEFAULT_BRANDING, DEFAULT_BACKGROUND } from "@/features/displays/types";
import { getFontFamily } from "@/shared/lib/fonts";

type ConnectionStatus = "connected" | "polling" | "disconnected";

interface DisplayShellProps {
  config: DisplayConfig;
  isPreview?: boolean;
  style?: React.CSSProperties;
  connectionStatus?: ConnectionStatus;
  children: ReactNode;
}

const STATUS_COLORS: Record<ConnectionStatus, string> = {
  connected: "var(--color-success)",
  polling: "var(--color-warning)",
  disconnected: "var(--color-destructive)",
};

export function DisplayShell({ config, isPreview = false, style, connectionStatus, children }: DisplayShellProps) {
  const theme = { ...DEFAULT_THEME, ...config?.theme };
  const branding = { ...DEFAULT_BRANDING, ...config?.branding };
  const background = { ...DEFAULT_BACKGROUND, ...config?.background };

  useEffect(() => {
    if (isPreview) return;
    let wakeLock: WakeLockSentinel | null = null;
    async function requestWakeLock() {
      try { if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); } catch {}
    }
    requestWakeLock();
    function handleVisibility() { if (document.visibilityState === "visible") requestWakeLock(); }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => { wakeLock?.release(); document.removeEventListener("visibilitychange", handleVisibility); };
  }, [isPreview]);

  useEffect(() => {
    if (isPreview) return;
    document.body.style.cursor = "none";
    document.body.style.userSelect = "none";
    document.body.style.overflow = "hidden";

    // Add a style element to hide scrollbars
    const style = document.createElement('style');
    style.textContent = `
      *::-webkit-scrollbar { display: none !important; }
      * { scrollbar-width: none !important; }
    `;
    document.head.appendChild(style);

    function preventContextMenu(e: MouseEvent) { e.preventDefault(); }
    document.addEventListener("contextmenu", preventContextMenu);
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.body.style.overflow = "";
      document.head.removeChild(style);
      document.removeEventListener("contextmenu", preventContextMenu);
    };
  }, [isPreview]);

  const bgStyle: React.CSSProperties =
    background.type === "gradient"
      ? { background: `linear-gradient(${background.gradientAngle}deg, ${background.gradientStart}, ${background.gradientEnd})` }
      : background.type === "solid"
      ? { backgroundColor: background.color }
      : { backgroundColor: theme.background };

  return (
    <div
      className="display-shell"
      style={{
        ...bgStyle,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        fontFamily: getFontFamily(theme.fontFamily),
        fontSize: `${theme.baseFontSize}px`,
        color: theme.foreground,
        position: "relative",
        "--display-bg": theme.background,
        "--display-fg": theme.foreground,
        "--display-primary": theme.primary,
        "--display-secondary": theme.secondary,
        "--display-free": theme.free,
        "--display-busy": theme.busy,
        "--display-muted": theme.muted,
        "--display-base-size": `${theme.baseFontSize}px`,
        ...style,
      } as React.CSSProperties}
    >
      {background.type === "image" && background.imageUrl && (
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${background.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center", opacity: background.imageOpacity, zIndex: 0 }} />
      )}
      <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
        {branding.logoUrl && (
          <div style={{ display: "flex", justifyContent: branding.logoPosition === "top-center" ? "center" : branding.logoPosition === "top-right" ? "flex-end" : "flex-start", padding: "1rem 1.5rem 0" }}>
            <img src={branding.logoUrl} alt="Display logo" style={{ height: branding.logoSize === "small" ? "1.5rem" : branding.logoSize === "large" ? "3rem" : "2rem" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
        )}
        <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
        {branding.showPoweredBy && (
          <div style={{ textAlign: "center", padding: "0.5rem", fontSize: "0.625rem", opacity: 0.4, color: theme.muted }}>Powered by RoomCast</div>
        )}
      </div>
      {connectionStatus && (
        <div
          aria-label={`Connection: ${connectionStatus}`}
          title={`Connection: ${connectionStatus}`}
          style={{
            position: "fixed",
            bottom: 12,
            right: 12,
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: STATUS_COLORS[connectionStatus],
            opacity: connectionStatus === "disconnected" ? 0.9 : 0.5,
            zIndex: 9999 /* --z-max */,
            transition: "background-color 0.3s ease, opacity 0.3s ease",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
