"use client";

import { useState } from "react";
import { CalendarCard } from "./CalendarCard";
import { deleteCalendar, triggerCalendarSync } from "../actions";
import { toast } from "sonner";
import { type CalendarProvider, type SyncStatus } from "@prisma/client";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";

interface CalendarItem {
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
}

interface CalendarListProps {
  calendars: CalendarItem[];
}

export function CalendarList({ calendars }: CalendarListProps) {
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  async function handleSync(id: string) {
    try {
      await triggerCalendarSync(id);
      toast.success("Sync triggered");
    } catch {
      toast.error("Failed to trigger sync");
    }
  }

  function handleDeleteClick(id: string) {
    const cal = calendars.find((c) => c.id === id);
    if (cal) setDeleteTarget({ id: cal.id, name: cal.name });
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      await deleteCalendar(deleteTarget.id);
      toast.success("Calendar deleted");
    } catch {
      toast.error("Failed to delete calendar");
    }
    setDeleteTarget(null);
  }

  if (calendars.length === 0) {
    return (
      <div className="mt-8 flex items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] p-12">
        <p className="text-[var(--color-muted-foreground)]">
          No calendars connected yet. Add your first calendar.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {calendars.map((cal) => (
          <CalendarCard
            key={cal.id}
            {...cal}
            onSync={handleSync}
            onDelete={handleDeleteClick}
          />
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Calendar"
        description={`This will permanently delete the calendar '${deleteTarget?.name ?? ""}' and all cached events.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
