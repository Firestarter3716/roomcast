"use client";

import { useState } from "react";
import { DisplayCard } from "./DisplayCard";
import { deleteDisplay, regenerateDisplayToken } from "../actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";

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
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [regenTarget, setRegenTarget] = useState<{ id: string; name: string } | null>(null);

  function handleDeleteClick(id: string) {
    const display = displays.find((d) => d.id === id);
    if (display) setDeleteTarget({ id: display.id, name: display.name });
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      await deleteDisplay(deleteTarget.id);
      toast.success("Display deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete display");
    }
    setDeleteTarget(null);
  }

  function handleRegenerateTokenClick(id: string) {
    const display = displays.find((d) => d.id === id);
    if (display) setRegenTarget({ id: display.id, name: display.name });
  }

  async function handleRegenerateTokenConfirm() {
    if (!regenTarget) return;
    try {
      await regenerateDisplayToken(regenTarget.id);
      toast.success("Token regenerated - old URL is now invalid");
      router.refresh();
    } catch {
      toast.error("Failed to regenerate token");
    }
    setRegenTarget(null);
  }

  if (displays.length === 0) {
    return (
      <div className="mt-8 flex items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] p-12">
        <p className="text-[var(--color-muted-foreground)]">No displays yet. Create your first display.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displays.map((display) => (
          <DisplayCard key={display.id} display={display} onDelete={handleDeleteClick} onRegenerateToken={handleRegenerateTokenClick} />
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Display"
        description={`This will permanently delete the display '${deleteTarget?.name ?? ""}'. The display URL will stop working immediately.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />

      <ConfirmDialog
        open={!!regenTarget}
        onOpenChange={(open) => { if (!open) setRegenTarget(null); }}
        title="Regenerate Token"
        description="This will generate a new token. The current display URL will stop working immediately."
        confirmLabel="Regenerate"
        variant="destructive"
        onConfirm={handleRegenerateTokenConfirm}
      />
    </>
  );
}
