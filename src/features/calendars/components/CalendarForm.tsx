"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCalendarSchema, type CreateCalendarInput } from "../schemas";
import { createCalendar, updateCalendar, testCalendarConnection } from "../actions";
import { DEFAULT_CALENDAR_COLORS, SYNC_INTERVAL_OPTIONS } from "../types";
import { type CalendarProvider } from "@prisma/client";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

interface CalendarFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    name: string;
    provider: CalendarProvider;
    color: string;
    syncIntervalSeconds: number;
    credentials: Record<string, string>;
  };
}

type TestResult = { success: true; calendarCount: number } | { success: false; error: string };

const PROVIDERS: { value: CalendarProvider; label: string }[] = [
  { value: "EXCHANGE", label: "Microsoft Exchange" },
  { value: "GOOGLE", label: "Google Calendar" },
  { value: "CALDAV", label: "CalDAV" },
  { value: "ICS", label: "ICS Feed" },
];

export function CalendarForm({ mode, initialData }: CalendarFormProps) {
  const router = useRouter();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<CreateCalendarInput>({
    resolver: zodResolver(createCalendarSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      color: initialData?.color ?? DEFAULT_CALENDAR_COLORS[0],
      syncIntervalSeconds: initialData?.syncIntervalSeconds ?? 300,
      credentials: initialData
        ? { provider: initialData.provider, ...initialData.credentials } as CreateCalendarInput["credentials"]
        : { provider: "ICS" as const, feedUrl: "", authHeader: "" },
    },
  });

  const provider = form.watch("credentials.provider");

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const credentials = form.getValues("credentials");
      const { provider: p, ...creds } = credentials;
      const result = await testCalendarConnection(p as CalendarProvider, creds as unknown as Record<string, string>);
      setTestResult(result);
      if (result.success) {
        toast.success(`Connection OK — ${result.calendarCount} calendar(s) found`);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Connection test failed");
      setTestResult({ success: false, error: "Test failed" });
    } finally {
      setTesting(false);
    }
  }

  async function onSubmit(data: CreateCalendarInput) {
    setSaving(true);
    try {
      if (mode === "create") {
        await createCalendar(data);
        toast.success("Calendar created");
      } else if (initialData) {
        await updateCalendar(initialData.id, data);
        toast.success("Calendar updated");
      }
      router.push("/admin/calendars");
    } catch (error) {
      toast.error("Failed to save calendar");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-ring)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]/20";
  const labelClass = "mb-1.5 block text-sm font-medium text-[var(--color-foreground)]";

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Name */}
      <div>
        <label className={labelClass}>Name</label>
        <input {...form.register("name")} className={inputClass} placeholder="My Calendar" />
        {form.formState.errors.name && (
          <p className="mt-1 text-xs text-[var(--color-destructive)]">{form.formState.errors.name.message}</p>
        )}
      </div>

      {/* Provider Selection */}
      <div>
        <label className={labelClass}>Provider</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PROVIDERS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => form.setValue("credentials.provider", p.value as "EXCHANGE" | "GOOGLE" | "CALDAV" | "ICS", { shouldValidate: true })}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                provider === p.value
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                  : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-[var(--color-border-hover)]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Provider-specific fields */}
      <div className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        {provider === "EXCHANGE" && (
          <>
            <div>
              <label className={labelClass}>Tenant ID</label>
              <input {...form.register("credentials.tenantId")} className={inputClass} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
            </div>
            <div>
              <label className={labelClass}>Client ID</label>
              <input {...form.register("credentials.clientId")} className={inputClass} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
            </div>
            <div>
              <label className={labelClass}>Client Secret</label>
              <input {...form.register("credentials.clientSecret")} type="password" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>User Email (UPN)</label>
              <input {...form.register("credentials.userEmail")} type="email" className={inputClass} placeholder="user@company.com" />
            </div>
            <div>
              <label className={labelClass}>Resource Email <span className="text-[var(--color-muted-foreground)]">(optional)</span></label>
              <input {...form.register("credentials.resourceEmail")} type="email" className={inputClass} placeholder="room@company.com" />
            </div>
          </>
        )}

        {provider === "GOOGLE" && (
          <>
            <div>
              <label className={labelClass}>Client ID</label>
              <input {...form.register("credentials.clientId")} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Client Secret</label>
              <input {...form.register("credentials.clientSecret")} type="password" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Refresh Token</label>
              <input {...form.register("credentials.refreshToken")} type="password" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Calendar ID</label>
              <input {...form.register("credentials.calendarId")} className={inputClass} placeholder="primary" />
            </div>
          </>
        )}

        {provider === "CALDAV" && (
          <>
            <div>
              <label className={labelClass}>Server URL</label>
              <input {...form.register("credentials.serverUrl")} className={inputClass} placeholder="https://nextcloud.example.com/remote.php/dav" />
            </div>
            <div>
              <label className={labelClass}>Username</label>
              <input {...form.register("credentials.username")} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Password</label>
              <input {...form.register("credentials.password")} type="password" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Calendar Path <span className="text-[var(--color-muted-foreground)]">(optional)</span></label>
              <input {...form.register("credentials.calendarPath")} className={inputClass} placeholder="/calendars/user/default/" />
            </div>
          </>
        )}

        {provider === "ICS" && (
          <>
            <div>
              <label className={labelClass}>Feed URL</label>
              <input {...form.register("credentials.feedUrl")} className={inputClass} placeholder="https://example.com/calendar.ics" />
            </div>
            <div>
              <label className={labelClass}>Auth Header <span className="text-[var(--color-muted-foreground)]">(optional)</span></label>
              <input {...form.register("credentials.authHeader")} className={inputClass} placeholder="Bearer token..." />
            </div>
          </>
        )}
      </div>

      {/* Connection Test */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleTest}
          disabled={testing}
          className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-secondary)] transition-colors disabled:opacity-50"
        >
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Test Connection
        </button>
        {testResult && (
          <span className={`inline-flex items-center gap-1.5 text-sm ${testResult.success ? "text-[var(--color-success)]" : "text-[var(--color-destructive)]"}`}>
            {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {testResult.success ? `OK — ${testResult.calendarCount} calendar(s)` : testResult.error}
          </span>
        )}
      </div>

      {/* Color */}
      <div>
        <label className={labelClass}>Color</label>
        <div className="flex gap-2">
          {DEFAULT_CALENDAR_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => form.setValue("color", c)}
              className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                form.watch("color") === c ? "border-[var(--color-foreground)] scale-110" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Sync Interval */}
      <div>
        <label className={labelClass}>Sync Interval</label>
        <select
          {...form.register("syncIntervalSeconds", { valueAsNumber: true })}
          className={inputClass}
        >
          {SYNC_INTERVAL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 border-t border-[var(--color-border)] pt-6">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === "create" ? "Create Calendar" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/calendars")}
          className="rounded-md px-4 py-2.5 text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
