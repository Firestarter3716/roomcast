"use client";

import { useEffect, useState } from "react";
import { Monitor } from "lucide-react";

const ERROR_TEXT: Record<string, { title: string; message: string; retrying: (n: number) => string }> = {
  de: { title: "Wartung", message: "Bitte versuchen Sie es später erneut", retrying: (n) => `Erneuter Versuch in ${n} Sekunde${n !== 1 ? "n" : ""}...` },
  en: { title: "Maintenance", message: "Please try again later", retrying: (n) => `Retrying in ${n} second${n !== 1 ? "s" : ""}...` },
  fr: { title: "Maintenance", message: "Veuillez réessayer plus tard", retrying: (n) => `Nouvelle tentative dans ${n} seconde${n !== 1 ? "s" : ""}...` },
};

function getErrorText(): { title: string; message: string; retrying: (n: number) => string } {
  if (typeof navigator === "undefined") return ERROR_TEXT.en;
  const lang = navigator.language?.split("-")[0]?.toLowerCase() ?? "en";
  return ERROR_TEXT[lang] ?? ERROR_TEXT.en;
}

const RETRY_DELAYS = [5000, 10000, 30000, 60000];

export default function DisplayError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const text = getErrorText();
  const [retryCount, setRetryCount] = useState(0);
  const [countdown, setCountdown] = useState(() => RETRY_DELAYS[0] / 1000);

  const currentDelay = RETRY_DELAYS[Math.min(retryCount, RETRY_DELAYS.length - 1)];

  // Countdown display timer
  useEffect(() => {
    setCountdown(Math.ceil(currentDelay / 1000));
    const interval = setInterval(() => {
      setCountdown((c) => (c > 1 ? c - 1 : c));
    }, 1000);
    return () => clearInterval(interval);
  }, [retryCount, currentDelay]);

  // Retry timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setRetryCount((c) => c + 1);
      reset();
    }, currentDelay);
    return () => clearTimeout(timer);
  }, [retryCount, currentDelay, reset]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        padding: "2rem",
        backgroundColor: "#0f172a",
        color: "#f8fafc",
        textAlign: "center",
        cursor: "none",
        userSelect: "none",
      }}
    >
      <Monitor
        size={56}
        style={{ color: "#94a3b8", marginBottom: "1.5rem" }}
      />
      <h1
        style={{
          fontSize: "1.5rem",
          fontWeight: 600,
          margin: 0,
          color: "#f8fafc",
        }}
      >
        {text.title}
      </h1>
      <p
        style={{
          fontSize: "0.875rem",
          color: "#94a3b8",
          marginTop: "0.75rem",
          maxWidth: "20rem",
          lineHeight: 1.5,
        }}
      >
        {text.message}
      </p>
      <div
        style={{
          marginTop: "2rem",
          fontSize: "0.75rem",
          color: "#64748b",
        }}
      >
        {text.retrying(countdown)}
      </div>
    </div>
  );
}
