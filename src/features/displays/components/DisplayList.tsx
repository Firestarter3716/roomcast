"use client";

import { useState } from "react";
import { DisplayCard } from "./DisplayCard";
import { deleteDisplay, regenerateDisplayToken } from "../actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("displays");
  const tc = useTranslations("common");

  function handleDeleteClick(id: string) {
    const display = displays.find((d) => d.id === id);
    if (display) setDeleteTarget({ id: display.id, name: display.name });
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      await deleteDisplay(deleteTarget.id);
      toast.success(tc("success"));
      router.refresh();
    } catch {
      toast.error(tc("error"));
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
      toast.success(t("regenerateToken"));
      router.refresh();
    } catch {
      toast.error(tc("error"));
    }
    setRegenTarget(null);
  }

  if (displays.length === 0) {
    return (
      <div role="status" className="mt-8 flex items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] p-12">
        <p className="text-[var(--color-muted-foreground)]">{t("noDisplays")}</p>
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
        title={t("deleteDisplay")}
        description={t("deleteConfirm")}
        confirmLabel={tc("delete")}
        cancelLabel={tc("cancel")}
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />

      <ConfirmDialog
        open={!!regenTarget}
        onOpenChange={(open) => { if (!open) setRegenTarget(null); }}
        title={t("regenerateToken")}
        description={t("regenerateConfirm")}
        confirmLabel={t("regenerateToken")}
        cancelLabel={tc("cancel")}
        variant="destructive"
        onConfirm={handleRegenerateTokenConfirm}
      />
    </>
  );
}
