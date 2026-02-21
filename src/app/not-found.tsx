import Link from "next/link";
import { Monitor } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("errors");
  const tc = await getTranslations("common");
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
      <Monitor
        size={48}
        style={{ color: "var(--color-muted-foreground)", marginBottom: "1.5rem" }}
      />
      <h1
        style={{
          fontSize: "6rem",
          fontWeight: 700,
          lineHeight: 1,
          margin: 0,
          color: "var(--color-foreground)",
        }}
      >
        404
      </h1>
      <p
        style={{
          fontSize: "1.25rem",
          color: "var(--color-muted-foreground)",
          marginTop: "0.75rem",
          marginBottom: "2rem",
        }}
      >
        {t("pageNotFound")}
      </p>
      <Link
        href="/admin"
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "0.625rem 1.25rem",
          backgroundColor: "var(--color-primary)",
          color: "var(--color-primary-foreground)",
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
  );
}
