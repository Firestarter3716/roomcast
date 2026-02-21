"use client";

import { useState } from "react";
import { CalendarCard } from "./CalendarCard";
import { deleteCalendar, triggerCalendarSync } from "../actions";
import { toast } from "sonner";
import { type CalendarProvider, type SyncStatus } from "@prisma/client";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("calendars");
  const tc = useTranslations("common");

  async function handleSync(id: string) {
    try {
      await triggerCalendarSync(id);
      toast.success(t("syncNow"));
    } catch {
      toast.error(t("saveFailed"));
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
      toast.success(tc("success"));
    } catch (error) {
      if (error instanceof Error && error.message === "CALENDAR_HAS_ROOMS") {
        toast.error(t("deleteHasRooms"));
      } else {
        toast.error(tc("error"));
      }
    }
    setDeleteTarget(null);
  }

  if (calendars.length === 0) {
    return (
      <div role="status" className="mt-8 flex items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] p-12">
        <p className="text-[var(--color-muted-foreground)]">
          {t("noCalendars")}
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
        title={t("deleteCalendar")}
        description={t("deleteConfirm")}
        confirmLabel={tc("delete")}
        cancelLabel={tc("cancel")}
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
