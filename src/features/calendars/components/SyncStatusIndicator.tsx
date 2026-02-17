import { type SyncStatus } from "@prisma/client";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  lastSyncAt?: Date | null;
  error?: string | null;
}

const STATUS_CONFIG: Record<SyncStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  IDLE: {
    label: "Ready",
    className: "bg-[var(--color-success)]/10 text-[var(--color-success)]",
    icon: CheckCircle2,
  },
  SYNCING: {
    label: "Syncing...",
    className: "bg-[var(--color-info)]/10 text-[var(--color-info)]",
    icon: Loader2,
  },
  ERROR: {
    label: "Error",
    className: "bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]",
    icon: AlertCircle,
  },
};

export function SyncStatusIndicator({ status, lastSyncAt, error }: SyncStatusIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
      >
        <Icon className={`h-3 w-3 ${status === "SYNCING" ? "animate-spin" : ""}`} />
        {config.label}
      </span>
      {lastSyncAt && (
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {new Date(lastSyncAt).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
