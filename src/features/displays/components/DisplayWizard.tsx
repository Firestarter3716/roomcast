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

/* ------------------------------------------------------------------ */
/*  LayoutPreviewMini - small visual thumbnail for each layout type   */
/* ------------------------------------------------------------------ */

function LayoutPreviewMini({
  layout,
  orientation,
  isSelected,
}: {
  layout: string;
  orientation: string;
  isSelected: boolean;
}) {
  const isPortrait = orientation === "PORTRAIT";
  const w = isPortrait ? 80 : 140;
  const h = isPortrait ? 120 : 90;

  const bg = "#0F172A";
  const fg = isSelected ? "rgba(59,130,246,0.6)" : "rgba(148,163,184,0.35)";
  const accent = isSelected ? "#3B82F6" : "#64748B";
  const green = isSelected ? "#22C55E" : "#4ADE80";
  const muted = "rgba(148,163,184,0.25)";
  const textMuted = "rgba(148,163,184,0.55)";

  const base: React.CSSProperties = {
    width: w,
    height: h,
    borderRadius: 6,
    background: bg,
    overflow: "hidden",
    position: "relative",
    fontSize: 6,
    fontFamily: "system-ui, sans-serif",
    color: "#CBD5E1",
    margin: "0 auto",
    border: `1px solid ${isSelected ? "rgba(59,130,246,0.4)" : "rgba(148,163,184,0.15)"}`,
  };

  if (layout === "ROOM_BOOKING") {
    return (
      <div style={base}>
        {/* Status banner */}
        <div
          style={{
            background: green,
            color: "#fff",
            textAlign: "center",
            fontWeight: 700,
            fontSize: 7,
            padding: "3px 0",
            letterSpacing: 1,
          }}
        >
          FREE
        </div>
        {/* Room name */}
        <div
          style={{
            textAlign: "center",
            fontWeight: 600,
            fontSize: 7,
            padding: "4px 0 2px",
            color: "#E2E8F0",
          }}
        >
          Room 101
        </div>
        {/* Upcoming slot */}
        <div style={{ padding: "0 6px" }}>
          <div
            style={{
              background: fg,
              borderRadius: 3,
              padding: "3px 4px",
              marginTop: 3,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ color: textMuted, fontSize: 5 }}>10:00</span>
            <div
              style={{
                background: accent,
                borderRadius: 2,
                width: "55%",
                height: 4,
              }}
            />
          </div>
          <div
            style={{
              background: fg,
              borderRadius: 3,
              padding: "3px 4px",
              marginTop: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ color: textMuted, fontSize: 5 }}>11:30</span>
            <div
              style={{
                background: muted,
                borderRadius: 2,
                width: "40%",
                height: 4,
              }}
            />
          </div>
        </div>
        {/* Clock */}
        <div
          style={{
            position: "absolute",
            bottom: 3,
            width: "100%",
            textAlign: "center",
            fontSize: 7,
            color: textMuted,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          14:30
        </div>
      </div>
    );
  }

  if (layout === "AGENDA") {
    const bars = [
      { time: "09:00", width: "60%", color: accent },
      { time: "10:30", width: "45%", color: fg },
      { time: "12:00", width: "70%", color: accent },
      { time: "14:00", width: "35%", color: fg },
    ];
    return (
      <div style={base}>
        {/* Header */}
        <div
          style={{
            background: accent,
            height: 10,
            display: "flex",
            alignItems: "center",
            padding: "0 5px",
          }}
        >
          <span style={{ color: "#fff", fontSize: 5, fontWeight: 600 }}>
            Today
          </span>
        </div>
        {/* Event bars */}
        <div style={{ padding: "4px 5px" }}>
          {bars.map((b, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                marginTop: i === 0 ? 0 : 3,
              }}
            >
              <span
                style={{
                  fontSize: 5,
                  color: textMuted,
                  width: 16,
                  flexShrink: 0,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {b.time}
              </span>
              <div
                style={{
                  background: b.color,
                  borderRadius: 2,
                  height: 5,
                  width: b.width,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (layout === "DAY_GRID") {
    const hours = ["08", "09", "10", "11", "12", "13"];
    return (
      <div style={base}>
        <div style={{ display: "flex", height: "100%" }}>
          {/* Hour labels */}
          <div
            style={{
              width: 16,
              flexShrink: 0,
              borderRight: `1px solid ${muted}`,
              paddingTop: 4,
            }}
          >
            {hours.map((hr) => (
              <div
                key={hr}
                style={{
                  fontSize: 5,
                  color: textMuted,
                  height: h / hours.length,
                  lineHeight: `${h / hours.length}px`,
                  textAlign: "right",
                  paddingRight: 2,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {hr}
              </div>
            ))}
          </div>
          {/* Grid area with event blocks */}
          <div style={{ flex: 1, position: "relative", padding: "4px 3px" }}>
            {/* Event 1 */}
            <div
              style={{
                position: "absolute",
                top: `${(1 / hours.length) * 100}%`,
                left: 3,
                right: 3,
                height: `${(1.5 / hours.length) * 100}%`,
                background: accent,
                borderRadius: 2,
                opacity: 0.8,
              }}
            />
            {/* Event 2 */}
            <div
              style={{
                position: "absolute",
                top: `${(3.5 / hours.length) * 100}%`,
                left: 3,
                right: "40%",
                height: `${(1 / hours.length) * 100}%`,
                background: fg,
                borderRadius: 2,
              }}
            />
            {/* Event 3 */}
            <div
              style={{
                position: "absolute",
                top: `${(3.5 / hours.length) * 100}%`,
                left: "55%",
                right: 3,
                height: `${(0.8 / hours.length) * 100}%`,
                background: green,
                borderRadius: 2,
                opacity: 0.6,
              }}
            />
            {/* Hour grid lines */}
            {hours.map((_, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: `${((i + 0.3) / hours.length) * 100}%`,
                  left: 0,
                  right: 0,
                  height: 1,
                  background: muted,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (layout === "WEEK_GRID") {
    const days = isPortrait ? ["M", "T", "W", "T", "F"] : ["Mon", "Tue", "Wed", "Thu", "Fri"];
    return (
      <div style={base}>
        {/* Day column headers */}
        <div
          style={{
            display: "flex",
            borderBottom: `1px solid ${muted}`,
          }}
        >
          {/* Spacer for hour labels */}
          <div style={{ width: 12, flexShrink: 0 }} />
          {days.map((d) => (
            <div
              key={d}
              style={{
                flex: 1,
                textAlign: "center",
                fontSize: 5,
                fontWeight: 600,
                color: textMuted,
                padding: "3px 0",
                borderLeft: `1px solid ${muted}`,
              }}
            >
              {d}
            </div>
          ))}
        </div>
        {/* Grid body */}
        <div style={{ display: "flex", flex: 1, height: h - 16 }}>
          {/* Hour labels */}
          <div style={{ width: 12, flexShrink: 0 }}>
            {[9, 11, 13, 15].map((hr) => (
              <div
                key={hr}
                style={{
                  fontSize: 4,
                  color: textMuted,
                  height: (h - 16) / 4,
                  lineHeight: `${(h - 16) / 4}px`,
                  textAlign: "right",
                  paddingRight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {hr}
              </div>
            ))}
          </div>
          {/* Day columns */}
          {days.map((d, col) => (
            <div
              key={d}
              style={{
                flex: 1,
                position: "relative",
                borderLeft: `1px solid ${muted}`,
              }}
            >
              {/* Scattered event dots / blocks */}
              {col === 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "10%",
                    left: 1,
                    right: 1,
                    height: "18%",
                    background: accent,
                    borderRadius: 1,
                    opacity: 0.7,
                  }}
                />
              )}
              {col === 1 && (
                <div
                  style={{
                    position: "absolute",
                    top: "45%",
                    left: 1,
                    right: 1,
                    height: "12%",
                    background: fg,
                    borderRadius: 1,
                  }}
                />
              )}
              {col === 2 && (
                <>
                  <div
                    style={{
                      position: "absolute",
                      top: "20%",
                      left: 1,
                      right: 1,
                      height: "14%",
                      background: accent,
                      borderRadius: 1,
                      opacity: 0.7,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "60%",
                      left: 1,
                      right: 1,
                      height: "10%",
                      background: green,
                      borderRadius: 1,
                      opacity: 0.5,
                    }}
                  />
                </>
              )}
              {col === 3 && (
                <div
                  style={{
                    position: "absolute",
                    top: "70%",
                    left: 1,
                    right: 1,
                    height: "16%",
                    background: fg,
                    borderRadius: 1,
                  }}
                />
              )}
              {col === 4 && (
                <div
                  style={{
                    position: "absolute",
                    top: "5%",
                    left: 1,
                    right: 1,
                    height: "22%",
                    background: accent,
                    borderRadius: 1,
                    opacity: 0.6,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (layout === "INFO_DISPLAY") {
    return (
      <div style={base}>
        <div style={{ display: "flex", height: "100%", flexDirection: "column" }}>
          {/* Top area: events left, clock right */}
          <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
            {/* Event list (left) */}
            <div
              style={{
                flex: 1,
                padding: "4px 4px 2px",
                borderRight: `1px solid ${muted}`,
              }}
            >
              <div
                style={{
                  fontSize: 5,
                  fontWeight: 600,
                  color: textMuted,
                  marginBottom: 3,
                }}
              >
                Today
              </div>
              {[accent, fg, accent].map((c, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    marginTop: i === 0 ? 0 : 2,
                  }}
                >
                  <div
                    style={{
                      width: 3,
                      height: 3,
                      borderRadius: "50%",
                      background: c,
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{
                      background: c,
                      height: 3,
                      borderRadius: 1,
                      width: `${50 + i * 12}%`,
                      opacity: 0.6,
                    }}
                  />
                </div>
              ))}
            </div>
            {/* Right side: clock + upcoming */}
            <div
              style={{
                width: isPortrait ? "45%" : "38%",
                padding: "4px 4px 2px",
              }}
            >
              {/* Clock */}
              <div
                style={{
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: isPortrait ? 10 : 11,
                  color: "#E2E8F0",
                  fontVariantNumeric: "tabular-nums",
                  marginBottom: 3,
                }}
              >
                14:30
              </div>
              {/* Upcoming */}
              <div
                style={{ fontSize: 4, color: textMuted, marginBottom: 2 }}
              >
                Upcoming
              </div>
              {[fg, muted].map((c, i) => (
                <div
                  key={i}
                  style={{
                    background: c,
                    height: 3,
                    borderRadius: 1,
                    marginTop: 2,
                    width: `${70 + i * 15}%`,
                  }}
                />
              ))}
            </div>
          </div>
          {/* Ticker bar at bottom */}
          <div
            style={{
              height: 9,
              background: accent,
              display: "flex",
              alignItems: "center",
              padding: "0 4px",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 4, color: "#fff", whiteSpace: "nowrap" }}>
              Welcome to RoomCast
            </span>
            <span style={{ fontSize: 4, color: "rgba(255,255,255,0.5)" }}>
              &#x2022;&#x2022;&#x2022;
            </span>
            <span style={{ fontSize: 4, color: "#fff", whiteSpace: "nowrap" }}>
              Next: Team Standup
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return <div style={base} />;
}

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
    "w-full rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-ring)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]/40";
  const labelClass = "mb-1.5 block text-sm font-medium text-[var(--color-foreground)]";

  return (
    <div className="space-y-8">
      {/* Step indicator */}
      <div className="flex items-center gap-4" role="list" aria-label="Wizard steps">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2" role="listitem" aria-current={step === s ? "step" : undefined}>
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
            <label htmlFor="wizard-name" className={labelClass}>Display Name</label>
            <input
              id="wizard-name"
              {...form.register("name")}
              className={inputClass}
              placeholder="Lobby Display"
              aria-invalid={!!form.formState.errors.name}
            />
            {form.formState.errors.name && (
              <p role="alert" className="mt-1 text-xs text-[var(--color-destructive)]">
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
                  aria-pressed={selectedOrientation === opt.value}
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
            <label htmlFor="wizard-room" className={labelClass}>Assign to Room</label>
            <select
              id="wizard-room"
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
                aria-pressed={selectedLayout === opt.value}
                onClick={() => form.setValue("layoutType", opt.value)}
                className={`rounded-lg border p-5 text-left transition-colors ${
                  selectedLayout === opt.value
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                    : "border-[var(--color-border)] hover:border-[var(--color-border-hover)]"
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <Layout
                    className={`h-5 w-5 shrink-0 mt-0.5 ${
                      selectedLayout === opt.value
                        ? "text-[var(--color-primary)]"
                        : "text-[var(--color-muted-foreground)]"
                    }`}
                  />
                  <div>
                    <h3
                      className={`font-medium leading-tight ${
                        selectedLayout === opt.value
                          ? "text-[var(--color-primary)]"
                          : "text-[var(--color-foreground)]"
                      }`}
                    >
                      {opt.label}
                    </h3>
                    <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                      {opt.description}
                    </p>
                  </div>
                </div>
                <div className="py-2">
                  <LayoutPreviewMini
                    layout={opt.value}
                    orientation={selectedOrientation}
                    isSelected={selectedLayout === opt.value}
                  />
                </div>
                <p className="mt-2 text-xs font-medium text-[var(--color-muted-foreground)] italic text-center">
                  {ORIENTATION_HINTS[opt.value]}
                </p>
              </button>
            ))}
          </div>

          {selectedLayout === "ROOM_BOOKING" && !selectedRoomId && (
            <p role="alert" className="text-xs text-[var(--color-destructive)]">
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
