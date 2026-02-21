"use client";

import { type SyncStatus } from "@prisma/client";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  lastSyncAt?: Date | null;
  error?: string | null;
}

const STATUS_CONFIG: Record<SyncStatus, { className: string; icon: typeof CheckCircle2 }> = {
  IDLE: {
    className: "bg-[var(--color-success)]/10 text-[var(--color-success)]",
    icon: CheckCircle2,
  },
  SYNCING: {
    className: "bg-[var(--color-info)]/10 text-[var(--color-info)]",
    icon: Loader2,
  },
  ERROR: {
    className: "bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]",
    icon: AlertCircle,
  },
};

export function SyncStatusIndicator({ status, lastSyncAt, error }: SyncStatusIndicatorProps) {
  const t = useTranslations("calendars");
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
      >
        <Icon className={`h-3 w-3 ${status === "SYNCING" ? "animate-spin" : ""}`} />
        {t(`syncStatus.${status}`)}
      </span>
      {lastSyncAt && (
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {new Date(lastSyncAt).toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin" })}
        </span>
      )}
    </div>
  );
}
