"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createDisplaySchema, type CreateDisplayInput } from "../schemas";
import { LAYOUT_OPTIONS, ORIENTATION_OPTIONS } from "../types";
import { createDisplay } from "../actions";
import { toast } from "sonner";
import { Loader2, Monitor, Layout, ChevronRight, ChevronLeft } from "lucide-react";

interface CalendarOption {
  id: string;
  name: string;
  provider: string;
  color: string;
}

interface RoomOption {
  id: string;
  name: string;
  calendarId: string;
}

interface DisplayWizardProps {
  calendars: CalendarOption[];
  rooms: RoomOption[];
}

export function DisplayWizard({ calendars, rooms }: DisplayWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const form = useForm<CreateDisplayInput>({
    resolver: zodResolver(createDisplaySchema),
    defaultValues: {
      name: "",
      orientation: "LANDSCAPE",
      layoutType: "ROOM_BOOKING",
      roomId: "",
      calendarIds: [],
    },
  });

  const selectedLayout = form.watch("layoutType");

  async function onSubmit(data: CreateDisplayInput) {
    setSaving(true);
    try {
      const display = await createDisplay(data);
      toast.success("Display created");
      router.push(`/admin/displays/${display.id}`);
    } catch {
      toast.error("Failed to create display");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-ring)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]/20";
  const labelClass = "mb-1.5 block text-sm font-medium text-[var(--color-foreground)]";

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <div className="flex items-center gap-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
              step >= s
                ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                : "bg-[var(--color-muted)]/20 text-[var(--color-muted-foreground)]"
            }`}>
              {s}
            </div>
            <span className={`text-sm ${step >= s ? "text-[var(--color-foreground)]" : "text-[var(--color-muted-foreground)]"}`}>
              {s === 1 ? "Basics" : s === 2 ? "Layout" : "Assignment"}
            </span>
            {s < 3 && <ChevronRight className="h-4 w-4 text-[var(--color-muted-foreground)]" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className={labelClass}>Display Name</label>
            <input {...form.register("name")} className={inputClass} placeholder="Lobby Display" />
            {form.formState.errors.name && (
              <p className="mt-1 text-xs text-[var(--color-destructive)]">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Orientation</label>
            <div className="grid grid-cols-3 gap-3">
              {ORIENTATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => form.setValue("orientation", opt.value)}
                  className={`rounded-lg border p-4 text-center transition-colors ${
                    form.watch("orientation") === opt.value
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-[var(--color-border-hover)]"
                  }`}
                >
                  <Monitor className={`mx-auto h-8 w-8 mb-2 ${opt.value === "PORTRAIT" ? "rotate-90" : ""}`} />
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <label className={labelClass}>Choose a Layout</label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {LAYOUT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => form.setValue("layoutType", opt.value)}
                className={`rounded-lg border p-5 text-left transition-colors ${
                  selectedLayout === opt.value
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                    : "border-[var(--color-border)] hover:border-[var(--color-border-hover)]"
                }`}
              >
                <Layout className={`h-6 w-6 mb-2 ${selectedLayout === opt.value ? "text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)]"}`} />
                <h3 className={`font-medium ${selectedLayout === opt.value ? "text-[var(--color-primary)]" : "text-[var(--color-foreground)]"}`}>{opt.label}</h3>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div>
            <label className={labelClass}>Assign to Room</label>
            <select {...form.register("roomId")} className={inputClass}>
              <option value="">No room (standalone)</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>{room.name}</option>
              ))}
            </select>
          </div>
          {selectedLayout !== "ROOM_BOOKING" && (
            <div>
              <label className={labelClass}>Calendars to Display</label>
              <div className="space-y-2">
                {calendars.map((cal) => {
                  const calendarIds = form.watch("calendarIds") ?? [];
                  const isSelected = calendarIds.includes(cal.id);
                  return (
                    <button
                      key={cal.id}
                      type="button"
                      onClick={() => {
                        const current = form.getValues("calendarIds") ?? [];
                        if (isSelected) {
                          form.setValue("calendarIds", current.filter((id) => id !== cal.id));
                        } else {
                          form.setValue("calendarIds", [...current, cal.id]);
                        }
                      }}
                      className={`flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors ${
                        isSelected
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                          : "border-[var(--color-border)] hover:border-[var(--color-border-hover)]"
                      }`}
                    >
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cal.color }} />
                      <span className="text-sm text-[var(--color-foreground)]">{cal.name}</span>
                      <span className="text-xs text-[var(--color-muted-foreground)]">({cal.provider})</span>
                    </button>
                  );
                })}
                {calendars.length === 0 && (
                  <p className="text-sm text-[var(--color-muted-foreground)]">No calendars available.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-[var(--color-border)] pt-6">
        {step > 1 && (
          <button type="button" onClick={() => setStep(step - 1)} className="inline-flex items-center gap-1 rounded-md px-4 py-2.5 text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
        )}
        {step < 3 && (
          <button
            type="button"
            onClick={() => {
              if (step === 1 && !form.getValues("name")) {
                form.setError("name", { message: "Name is required" });
                return;
              }
              setStep(step + 1);
            }}
            className="inline-flex items-center gap-1 rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        )}
        {step === 3 && (
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create Display
          </button>
        )}
        <button type="button" onClick={() => router.push("/admin/displays")} className="rounded-md px-4 py-2.5 text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}
