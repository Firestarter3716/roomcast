"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createDisplaySchema, type CreateDisplayInput } from "../schemas";
import { LAYOUT_OPTIONS, ORIENTATION_OPTIONS } from "../types";
import { createDisplay } from "../actions";
import { toast } from "sonner";
import { DisplayQRCode } from "./DisplayQRCode";
import {
  Loader2,
  Monitor,
  Layout,
  ChevronRight,
  ChevronLeft,
  Check,
  Copy,
  ExternalLink,
} from "lucide-react";

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

const ORIENTATION_HINTS: Record<string, string> = {
  ROOM_BOOKING: "Recommended for Portrait",
  AGENDA: "Works in any orientation",
  DAY_GRID: "Recommended for Landscape",
  WEEK_GRID: "Recommended for Landscape",
  INFO_DISPLAY: "Works in any orientation",
};

interface CreatedDisplay {
  id: string;
  name: string;
  token: string;
  layoutType: string;
  orientation: string;
}

export function DisplayWizard({ calendars, rooms }: DisplayWizardProps) {
  return (
    <Suspense fallback={<div className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">Loading...</div>}>
      <DisplayWizardInner calendars={calendars} rooms={rooms} />
    </Suspense>
  );
}

function DisplayWizardInner({ calendars, rooms }: DisplayWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedRoomId = searchParams.get("roomId") || "";

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [createdDisplay, setCreatedDisplay] = useState<CreatedDisplay | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<CreateDisplayInput>({
    resolver: zodResolver(createDisplaySchema),
    defaultValues: {
      name: "",
      orientation: "LANDSCAPE",
      layoutType: "ROOM_BOOKING",
      roomId: preselectedRoomId,
      calendarIds: [],
    },
  });

  const selectedLayout = form.watch("layoutType");
  const selectedOrientation = form.watch("orientation");
  const selectedRoomId = form.watch("roomId");

  async function onSubmit(data: CreateDisplayInput) {
    setSaving(true);
    try {
      const display = await createDisplay(data);
      setCreatedDisplay({
        id: display.id,
        name: display.name,
        token: display.token,
        layoutType: data.layoutType,
        orientation: data.orientation,
      });
      toast.success("Display created successfully");
      setStep(3);
    } catch {
      toast.error("Failed to create display");
    } finally {
      setSaving(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const displayUrl = typeof window !== "undefined" && createdDisplay
    ? `${window.location.origin}/display/${createdDisplay.token}`
    : createdDisplay ? `/display/${createdDisplay.token}` : "";

  const stepLabels = ["Setup", "Layout", "Confirmation"];

  const inputClass =
    "w-full rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-ring)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]/20";
  const labelClass = "mb-1.5 block text-sm font-medium text-[var(--color-foreground)]";

  return (
    <div className="space-y-8">
      {/* Step indicator */}
      <div className="flex items-center gap-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                step > s
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                  : step === s
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                    : "bg-[var(--color-muted)]/20 text-[var(--color-muted-foreground)]"
              }`}
            >
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            <span
              className={`text-sm ${
                step >= s
                  ? "text-[var(--color-foreground)]"
                  : "text-[var(--color-muted-foreground)]"
              }`}
            >
              {stepLabels[s - 1]}
            </span>
            {s < 3 && (
              <ChevronRight className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Name + Orientation + Room/Calendar */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className={labelClass}>Display Name</label>
            <input
              {...form.register("name")}
              className={inputClass}
              placeholder="Lobby Display"
            />
            {form.formState.errors.name && (
              <p className="mt-1 text-xs text-[var(--color-destructive)]">
                {form.formState.errors.name.message}
              </p>
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
                    selectedOrientation === opt.value
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-[var(--color-border-hover)]"
                  }`}
                >
                  <Monitor
                    className={`mx-auto h-8 w-8 mb-2 ${
                      opt.value === "PORTRAIT" ? "rotate-90" : ""
                    }`}
                  />
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Assign to Room</label>
            <select
              {...form.register("roomId")}
              className={inputClass}
            >
              <option value="">No room (standalone)</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              For Room Booking layout, exactly one room is required.
            </p>
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
                          form.setValue(
                            "calendarIds",
                            current.filter((id) => id !== cal.id)
                          );
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
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: cal.color }}
                      />
                      <span className="text-sm text-[var(--color-foreground)]">
                        {cal.name}
                      </span>
                      <span className="text-xs text-[var(--color-muted-foreground)]">
                        ({cal.provider})
                      </span>
                    </button>
                  );
                })}
                {calendars.length === 0 && (
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    No calendars available.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Layout selection with orientation hints */}
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
                <Layout
                  className={`h-6 w-6 mb-2 ${
                    selectedLayout === opt.value
                      ? "text-[var(--color-primary)]"
                      : "text-[var(--color-muted-foreground)]"
                  }`}
                />
                <h3
                  className={`font-medium ${
                    selectedLayout === opt.value
                      ? "text-[var(--color-primary)]"
                      : "text-[var(--color-foreground)]"
                  }`}
                >
                  {opt.label}
                </h3>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  {opt.description}
                </p>
                <p className="mt-2 text-[10px] font-medium text-[var(--color-muted-foreground)] italic">
                  {ORIENTATION_HINTS[opt.value]}
                </p>
              </button>
            ))}
          </div>

          {selectedLayout === "ROOM_BOOKING" && !selectedRoomId && (
            <p className="text-xs text-[var(--color-destructive)]">
              Room Booking layout requires a room. Go back and assign a room first.
            </p>
          )}
        </div>
      )}

      {/* Step 3: Confirmation / Summary */}
      {step === 3 && createdDisplay && (
        <div className="space-y-6">
          <div className="rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-6 text-center">
            <Check className="mx-auto h-12 w-12 text-[var(--color-primary)] mb-3" />
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              Display Created Successfully
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              &quot;{createdDisplay.name}&quot; is ready to use
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-[var(--color-border)] p-4 space-y-3">
              <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
                Display Token
              </h3>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md bg-[var(--color-muted)]/10 px-3 py-2 text-xs font-mono text-[var(--color-foreground)] break-all">
                  {createdDisplay.token}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(createdDisplay.token)}
                  className="shrink-0 rounded-md border border-[var(--color-border)] p-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
                  title="Copy token"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--color-border)] p-4 space-y-3">
              <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
                Display URL
              </h3>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md bg-[var(--color-muted)]/10 px-3 py-2 text-xs font-mono text-[var(--color-foreground)] break-all">
                  {displayUrl}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(displayUrl)}
                  className="shrink-0 rounded-md border border-[var(--color-border)] p-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
                  title="Copy URL"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="rounded-lg border border-[var(--color-border)] p-6">
              <h3 className="text-sm font-semibold text-[var(--color-foreground)] text-center mb-4">
                QR Code
              </h3>
              <DisplayQRCode
                token={createdDisplay.token}
                displayName={createdDisplay.name}
                size={200}
              />
            </div>
          </div>

          <div className="rounded-lg border border-[var(--color-border)] p-4">
            <h3 className="text-sm font-semibold text-[var(--color-foreground)] mb-3">
              Summary
            </h3>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-[var(--color-muted-foreground)]">Name</dt>
              <dd className="text-[var(--color-foreground)]">{createdDisplay.name}</dd>
              <dt className="text-[var(--color-muted-foreground)]">Layout</dt>
              <dd className="text-[var(--color-foreground)]">
                {LAYOUT_OPTIONS.find((l) => l.value === createdDisplay.layoutType)?.label || createdDisplay.layoutType}
              </dd>
              <dt className="text-[var(--color-muted-foreground)]">Orientation</dt>
              <dd className="text-[var(--color-foreground)]">
                {ORIENTATION_OPTIONS.find((o) => o.value === createdDisplay.orientation)?.label || createdDisplay.orientation}
              </dd>
            </dl>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center gap-3 border-t border-[var(--color-border)] pt-6">
        {step > 1 && step < 3 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="inline-flex items-center gap-1 rounded-md px-4 py-2.5 text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
        )}
        {step === 1 && (
          <button
            type="button"
            onClick={() => {
              if (!form.getValues("name")) {
                form.setError("name", { message: "Name is required" });
                return;
              }
              setStep(2);
            }}
            className="inline-flex items-center gap-1 rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        )}
        {step === 2 && (
          <button
            type="button"
            disabled={saving || (selectedLayout === "ROOM_BOOKING" && !selectedRoomId)}
            onClick={() => form.handleSubmit(onSubmit)()}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create Display
          </button>
        )}
        {step === 3 && (
          <>
            <button
              type="button"
              onClick={() => router.push(`/admin/displays/${createdDisplay?.id}`)}
              className="inline-flex items-center gap-1 rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Open Display Settings
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/displays")}
              className="rounded-md px-4 py-2.5 text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            >
              Back to Displays
            </button>
          </>
        )}
        {step < 3 && (
          <button
            type="button"
            onClick={() => router.push("/admin/displays")}
            className="rounded-md px-4 py-2.5 text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
