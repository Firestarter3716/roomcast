"use client";

import { type CalendarProvider, type SyncStatus } from "@prisma/client";
import { Calendar, MoreHorizontal, RefreshCw, Pencil, Trash2 } from "lucide-react";
import { SyncStatusIndicator } from "./SyncStatusIndicator";
import { PROVIDER_LABELS } from "../types";
import Link from "next/link";

interface CalendarCardProps {
  id: string;
  name: string;
  provider: CalendarProvider;
  color: string;
  syncStatus: SyncStatus;
  lastSyncAt: Date | null;
  lastSyncError: string | null;
  syncIntervalSeconds: number;
  enabled: boolean;
  eventCount: number;
  onSync: (id: string) => void;
  onDelete: (id: string) => void;
}

export function CalendarCard({
  id,
  name,
  provider,
  color,
  syncStatus,
  lastSyncAt,
  lastSyncError,
  enabled,
  eventCount,
  onSync,
  onDelete,
}: CalendarCardProps) {
  return (
    <div className="group relative rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 transition-shadow hover:shadow-[var(--shadow-md)]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: color + "20", color }}
          >
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium text-[var(--color-foreground)]">{name}</h3>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {PROVIDER_LABELS[provider]}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onSync(id)}
            className="rounded-md p-1.5 text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)] transition-colors"
            title="Sync now"
          >
            <RefreshCw className={`h-4 w-4 ${syncStatus === "SYNCING" ? "animate-spin" : ""}`} />
          </button>
          <Link
            href={`/admin/calendars/${id}`}
            className="rounded-md p-1.5 text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)] transition-colors"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <button
            onClick={() => onDelete(id)}
            className="rounded-md p-1.5 text-[var(--color-muted-foreground)] hover:bg-[var(--color-destructive)]/10 hover:text-[var(--color-destructive)] transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <SyncStatusIndicator status={syncStatus} lastSyncAt={lastSyncAt} error={lastSyncError} />
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {eventCount} events
        </span>
      </div>

      {!enabled && (
        <div className="mt-2 text-xs text-[var(--color-warning)]">Disabled</div>
      )}

      {syncStatus === "ERROR" && lastSyncError && (
        <div className="mt-2 rounded-md bg-[var(--color-destructive)]/5 px-2 py-1 text-xs text-[var(--color-destructive)]">
          {lastSyncError}
        </div>
      )}
    </div>
  );
}
