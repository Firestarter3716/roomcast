"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { createRoomSchema, type CreateRoomInput } from "../schemas";
import { createRoom, updateRoom } from "../actions";
import { EQUIPMENT_OPTIONS } from "../types";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface CalendarOption {
  id: string;
  name: string;
  provider: string;
  color: string;
}

interface RoomFormProps {
  mode: "create" | "edit";
  calendars: CalendarOption[];
  initialData?: {
    id: string;
    name: string;
    location: string | null;
    capacity: number | null;
    equipment: string[];
    calendarId: string;
    resourceEmail: string | null;
    resourceId: string | null;
  };
}

export function RoomForm({ mode, calendars, initialData }: RoomFormProps) {
  const router = useRouter();
  const t = useTranslations("rooms");
  const tc = useTranslations("common");
  const [saving, setSaving] = useState(false);

  const form = useForm<CreateRoomInput>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      location: initialData?.location ?? "",
      capacity: initialData?.capacity ?? undefined,
      equipment: initialData?.equipment ?? [],
      calendarId: initialData?.calendarId ?? "",
      resourceEmail: initialData?.resourceEmail ?? "",
      resourceId: initialData?.resourceId ?? "",
    },
  });

  const selectedEquipment = form.watch("equipment") ?? [];

  function toggleEquipment(value: string) {
    const current = form.getValues("equipment") ?? [];
    if (current.includes(value)) {
      form.setValue("equipment", current.filter((v) => v !== value));
    } else {
      form.setValue("equipment", [...current, value]);
    }
  }

  async function onSubmit(data: CreateRoomInput) {
    setSaving(true);
    try {
      if (mode === "create") {
        await createRoom(data);
        toast.success(t("created"));
      } else if (initialData) {
        await updateRoom(initialData.id, data);
        toast.success(t("updated"));
      }
      router.push("/admin/rooms");
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-ring)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]/20";
  const labelClass = "mb-1.5 block text-sm font-medium text-[var(--color-foreground)]";

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className={labelClass}>{t("name")}</label>
        <input {...form.register("name")} className={inputClass} placeholder="Conference Room A" />
        {form.formState.errors.name && (
          <p className="mt-1 text-xs text-[var(--color-destructive)]">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>{t("location")}</label>
          <input {...form.register("location")} className={inputClass} placeholder="Floor 3, Building A" />
        </div>
        <div>
          <label className={labelClass}>{t("capacity")}</label>
          <input {...form.register("capacity", { valueAsNumber: true })} type="number" min="1" className={inputClass} placeholder="10" />
        </div>
      </div>

      <div>
        <label className={labelClass}>{t("equipment")}</label>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleEquipment(opt.value)}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                selectedEquipment.includes(opt.value)
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                  : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-[var(--color-border-hover)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass}>{t("calendar")}</label>
        <select {...form.register("calendarId")} className={inputClass}>
          <option value="">{t("selectCalendar")}</option>
          {calendars.map((cal) => (
            <option key={cal.id} value={cal.id}>
              {cal.name} ({cal.provider})
            </option>
          ))}
        </select>
        {form.formState.errors.calendarId && (
          <p className="mt-1 text-xs text-[var(--color-destructive)]">{form.formState.errors.calendarId.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>{t("resourceEmail")} <span className="text-[var(--color-muted-foreground)]">(Exchange)</span></label>
          <input {...form.register("resourceEmail")} type="email" className={inputClass} placeholder="room@company.com" />
        </div>
        <div>
          <label className={labelClass}>{t("resourceId")} <span className="text-[var(--color-muted-foreground)]">(Google)</span></label>
          <input {...form.register("resourceId")} className={inputClass} />
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-[var(--color-border)] pt-6">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === "create" ? t("createRoom") : t("saveChanges")}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/rooms")}
          className="rounded-md px-4 py-2.5 text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
        >
          {tc("cancel")}
        </button>
      </div>
    </form>
  );
}
