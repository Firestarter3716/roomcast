"use client";

import { useState } from "react";
import { RoomCard } from "./RoomCard";
import { deleteRoom } from "../actions";
import { toast } from "sonner";

interface RoomItem {
  id: string;
  name: string;
  location: string | null;
  capacity: number | null;
  equipment: string[];
  calendar: { id: string; name: string; color: string };
  hasDisplay: boolean;
  displayId: string | null;
}

interface RoomListProps {
  rooms: RoomItem[];
}

export function RoomList({ rooms }: RoomListProps) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (pendingDelete === id) {
      try {
        await deleteRoom(id);
        toast.success("Room deleted");
        setPendingDelete(null);
      } catch {
        toast.error("Failed to delete room");
      }
    } else {
      setPendingDelete(id);
      toast.info("Click again to confirm deletion");
      setTimeout(() => setPendingDelete(null), 3000);
    }
  }

  if (rooms.length === 0) {
    return (
      <div className="mt-8 flex items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] p-12">
        <p className="text-[var(--color-muted-foreground)]">
          No rooms created yet. Create your first room.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rooms.map((room) => (
        <RoomCard key={room.id} {...room} onDelete={handleDelete} />
      ))}
    </div>
  );
}
