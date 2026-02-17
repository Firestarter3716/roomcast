"use client";

import { useEffect } from "react";
import { Monitor } from "lucide-react";

export default function DisplayError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Auto-retry after 30 seconds
    const timer = setTimeout(() => reset(), 30000);
    return () => clearTimeout(timer);
  }, [error, reset]);

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
        Retrying automatically...
      </div>
    </div>
  );
}
