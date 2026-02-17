"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { updateSystemSettings } from "../actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { FONT_OPTIONS } from "@/shared/lib/fonts";

interface SettingsData {
  defaultLocale: string;
  defaultTimezone: string;
  defaultFont: string;
  defaultLogoUrl: string | null;
  sessionTimeoutHours: number;
}

interface GeneralSettingsFormProps {
  initialSettings: SettingsData;
}

const LANGUAGE_OPTIONS = [
  { value: "de", label: "Deutsch" },
  { value: "en", label: "English" },
];

export function GeneralSettingsForm({ initialSettings }: GeneralSettingsFormProps) {
  const [saving, setSaving] = useState(false);

  const form = useForm<SettingsData>({
    defaultValues: {
      defaultLocale: initialSettings.defaultLocale,
      defaultTimezone: initialSettings.defaultTimezone,
      defaultFont: initialSettings.defaultFont,
      defaultLogoUrl: initialSettings.defaultLogoUrl ?? "",
      sessionTimeoutHours: initialSettings.sessionTimeoutHours,
    },
  });

  async function onSubmit(data: SettingsData) {
    setSaving(true);
    try {
      await updateSystemSettings({
        defaultLocale: data.defaultLocale,
        defaultTimezone: data.defaultTimezone,
        defaultFont: data.defaultFont,
        defaultLogoUrl: data.defaultLogoUrl || null,
        sessionTimeoutHours: data.sessionTimeoutHours,
      });
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-ring)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]/20";
  const labelClass =
    "mb-1.5 block text-sm font-medium text-[var(--color-foreground)]";

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className={labelClass}>Default Language</label>
        <select {...form.register("defaultLocale")} className={inputClass}>
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Timezone</label>
        <input
          {...form.register("defaultTimezone")}
          className={inputClass}
          placeholder="Europe/Berlin"
        />
      </div>

      <div>
        <label className={labelClass}>Default Font</label>
        <select {...form.register("defaultFont")} className={inputClass}>
          {FONT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Default Logo URL</label>
        <input
          {...form.register("defaultLogoUrl")}
          className={inputClass}
          placeholder="https://example.com/logo.png"
        />
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          URL to the default logo displayed on room screens. Leave empty for no logo.
        </p>
      </div>

      <div>
        <label className={labelClass}>Session Timeout (Hours)</label>
        <input
          {...form.register("sessionTimeoutHours", { valueAsNumber: true })}
          type="number"
          min="1"
          max="720"
          className={inputClass}
          placeholder="24"
        />
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          How long admin sessions remain active before requiring re-authentication.
        </p>
      </div>

      <div className="flex items-center gap-3 border-t border-[var(--color-border)] pt-6">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save Settings
        </button>
      </div>
    </form>
  );
}
