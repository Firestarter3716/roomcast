"use client";

import { useEffect, useState } from "react";
import { Monitor } from "lucide-react";

const RETRY_DELAYS = [5000, 10000, 30000, 60000];

export default function DisplayError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
        minHeight: "100vh",
        padding: "2rem",
        backgroundColor: "#0a0a0a",
        color: "#ffffff",
        textAlign: "center",
        cursor: "none",
        userSelect: "none",
      }}
    >
      <Monitor
        size={56}
        style={{ color: "#525252", marginBottom: "1.5rem" }}
      />
      <h1
        style={{
          fontSize: "1.5rem",
          fontWeight: 600,
          margin: 0,
          color: "#ffffff",
        }}
      >
        Maintenance
      </h1>
      <p
        style={{
          fontSize: "0.875rem",
          color: "#737373",
          marginTop: "0.75rem",
          maxWidth: "20rem",
          lineHeight: 1.5,
        }}
      >
        Please try again later
      </p>
      <div
        style={{
          marginTop: "2rem",
          fontSize: "0.75rem",
          color: "#525252",
        }}
      >
        Retrying in {countdown} second{countdown !== 1 ? "s" : ""}...
      </div>
    </div>
  );
}
