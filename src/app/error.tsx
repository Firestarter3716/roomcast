"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");
  const tc = useTranslations("common");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "2rem",
        backgroundColor: "var(--color-background)",
        color: "var(--color-foreground)",
        textAlign: "center",
      }}
    >
      <AlertTriangle
        size={48}
        style={{ color: "var(--color-destructive)", marginBottom: "1.5rem" }}
      />
      <h1
        style={{
          fontSize: "1.5rem",
          fontWeight: 600,
          margin: 0,
          color: "var(--color-foreground)",
        }}
      >
        {t("somethingWentWrong")}
      </h1>
      <p
        style={{
          fontSize: "0.875rem",
          color: "var(--color-muted-foreground)",
          marginTop: "0.5rem",
          marginBottom: "2rem",
          maxWidth: "24rem",
        }}
      >
        {t("unexpectedError")}
      </p>
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
        }}
      >
        <button
          onClick={reset}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "0.625rem 1.25rem",
            backgroundColor: "var(--color-primary)",
            color: "var(--color-primary-foreground)",
            border: "none",
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
            transition: "opacity 0.15s ease",
          }}
        >
          {tc("tryAgain")}
        </button>
        <Link
          href="/admin"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "0.625rem 1.25rem",
            backgroundColor: "transparent",
            color: "var(--color-muted-foreground)",
            border: "1px solid var(--color-border)",
            borderRadius: "0.5rem",
            textDecoration: "none",
            fontSize: "0.875rem",
            fontWeight: 500,
            transition: "opacity 0.15s ease",
          }}
        >
          {tc("backToDashboard")}
        </Link>
      </div>
    </div>
  );
}
