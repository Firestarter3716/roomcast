"use client";

import { useState } from "react";
import { DisplayCard } from "./DisplayCard";
import { deleteDisplay, regenerateDisplayToken } from "../actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DisplayListProps {
  displays: {
    id: string;
    name: string;
    token: string;
    orientation: string;
    layoutType: string;
    room: { id: string; name: string } | null;
    calendars: { id: string; name: string; color: string }[];
    enabled: boolean;
    createdAt: Date;
  }[];
}

export function DisplayList({ displays }: DisplayListProps) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      toast.info("Click again to confirm deletion");
      setTimeout(() => setConfirmDelete(null), 3000);
      return;
    }
    try {
      await deleteDisplay(id);
      toast.success("Display deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete display");
    }
    setConfirmDelete(null);
  }

  async function handleRegenerateToken(id: string) {
    try {
      await regenerateDisplayToken(id);
      toast.success("Token regenerated - old URL is now invalid");
      router.refresh();
    } catch {
      toast.error("Failed to regenerate token");
    }
  }

  if (displays.length === 0) {
    return (
      <div className="mt-8 flex items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] p-12">
        <p className="text-[var(--color-muted-foreground)]">No displays yet. Create your first display.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {displays.map((display) => (
        <DisplayCard key={display.id} display={display} onDelete={handleDelete} onRegenerateToken={handleRegenerateToken} />
      ))}
    </div>
  );
}
