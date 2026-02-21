"use client";

import { useState, useEffect } from "react";
import { Monitor, ExternalLink, Copy, RotateCcw, Trash2 } from "lucide-react";
import { DisplayQRCode } from "./DisplayQRCode";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface DisplayCardProps {
  display: {
    id: string;
    name: string;
    token: string;
    orientation: string;
    layoutType: string;
    room: { id: string; name: string } | null;
    calendars: { id: string; name: string; color: string }[];
    enabled: boolean;
    createdAt: Date;
  };
  onDelete: (id: string) => void;
  onRegenerateToken: (id: string) => void;
}

export function DisplayCard({ display, onDelete, onRegenerateToken }: DisplayCardProps) {
  const t = useTranslations("displays");
  const tc = useTranslations("common");
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const displayUrl = `${origin}/display/${display.token}`;

  function copyUrl() {
    navigator.clipboard.writeText(displayUrl);
    toast.success(t("urlCopied"));
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5 transition-colors hover:border-[var(--color-border-hover)]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${display.enabled ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]" : "bg-[var(--color-muted)]/10 text-[var(--color-muted-foreground)]"}`}>
            <Monitor className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-medium text-[var(--color-foreground)]">{display.name}</h2>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {t(`layouts.${display.layoutType}`)} &middot; {display.orientation.toLowerCase()}
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${display.enabled ? "bg-[var(--color-success)]/10 text-[var(--color-success)]" : "bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]"}`}>
          {display.enabled ? t("active") : tc("disabled")}
        </span>
      </div>

      {display.room && (
        <div className="mt-3">
          <span className="inline-flex items-center rounded-md bg-[var(--color-secondary)]/10 px-2 py-1 text-xs text-[var(--color-secondary-foreground)]">
            {t("room")}: {display.room.name}
          </span>
        </div>
      )}

      {display.calendars.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {display.calendars.map((cal) => (
            <span key={cal.id} className="inline-flex items-center gap-1 rounded-md bg-[var(--color-muted)]/10 px-2 py-0.5 text-xs text-[var(--color-muted-foreground)]">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cal.color }} />
              {cal.name}
            </span>
          ))}
        </div>
      )}

      <details className="mt-3 group">
        <summary className="cursor-pointer text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
          {t("qrCode")}
        </summary>
        <div className="mt-2 flex justify-center">
          <DisplayQRCode token={display.token} displayName={display.name} size={160} />
        </div>
      </details>

      <div className="mt-4 flex items-center gap-2 border-t border-[var(--color-border)] pt-3">
        <a href={`/admin/displays/${display.id}`} className="inline-flex items-center gap-1 rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] transition-colors">
          {tc("edit")}
        </a>
        <button onClick={copyUrl} className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors" title={t("copyDisplayUrl")} aria-label={t("copyDisplayUrl")}>
          <Copy className="h-3 w-3" /> URL
        </button>
        <a href={displayUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors" title={t("openDisplayNewTab")} aria-label={t("openDisplayNewTab")}>
          <ExternalLink className="h-3 w-3" />
        </a>
        <button onClick={() => onRegenerateToken(display.id)} className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors" title={t("regenerateTokenAction")} aria-label={t("regenerateTokenAction")}>
          <RotateCcw className="h-3 w-3" />
        </button>
        <button onClick={() => onDelete(display.id)} className="ml-auto inline-flex items-center gap-1 rounded-md border border-[var(--color-destructive)]/20 px-3 py-1.5 text-xs text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10 transition-colors" title={tc("delete")} aria-label={tc("delete")}>
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
