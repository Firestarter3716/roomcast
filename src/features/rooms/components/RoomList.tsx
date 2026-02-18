"use client";

import { useState } from "react";
import { RoomCard } from "./RoomCard";
import { deleteRoom } from "../actions";
import type { RoomStatus } from "../actions";
import { toast } from "sonner";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { useTranslations } from "next-intl";

interface RoomItem {
  id: string;
  name: string;
  location: string | null;
  capacity: number | null;
  equipment: string[];
  calendar: { id: string; name: string; color: string };
  hasDisplay: boolean;
  displayId: string | null;
  status: RoomStatus;
}

interface RoomListProps {
  rooms: RoomItem[];
}

export function RoomList({ rooms }: RoomListProps) {
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const t = useTranslations("rooms");
  const tc = useTranslations("common");

  function handleDeleteClick(id: string) {
    const room = rooms.find((r) => r.id === id);
    if (room) setDeleteTarget({ id: room.id, name: room.name });
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      await deleteRoom(deleteTarget.id);
      toast.success(tc("success"));
    } catch {
      toast.error(tc("error"));
    }
    setDeleteTarget(null);
  }

  if (rooms.length === 0) {
    return (
      <div role="status" className="mt-8 flex items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] p-12">
        <p className="text-[var(--color-muted-foreground)]">
          No rooms created yet. Create your first room.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <RoomCard key={room.id} {...room} onDelete={handleDeleteClick} />
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={t("deleteRoom")}
        description={t("deleteConfirm")}
        confirmLabel={tc("delete")}
        cancelLabel={tc("cancel")}
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
