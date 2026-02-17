"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCalendarSchema, type CreateCalendarInput } from "../schemas";
import {
  createCalendar,
  updateCalendar,
  testCalendarConnection,
  listGoogleCalendars,
  discoverCalDavCalendars,
} from "../actions";
import { DEFAULT_CALENDAR_COLORS, SYNC_INTERVAL_OPTIONS } from "../types";
import { type CalendarProvider } from "@prisma/client";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, ExternalLink, RefreshCw, Search } from "lucide-react";

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

interface GoogleCalendarOption {
  id: string;
  summary: string;
}

interface CalDavCalendarOption {
  id: string;
  name: string;
  path: string;
}

const PROVIDER_KEYS: CalendarProvider[] = ["EXCHANGE", "GOOGLE", "CALDAV", "ICS"];

export function CalendarForm({ mode, initialData }: CalendarFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("calendars");
  const tc = useTranslations("common");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [saving, setSaving] = useState(false);

  // Google OAuth state
  const [googleAuthorizing, setGoogleAuthorizing] = useState(false);
  const [googleCalendars, setGoogleCalendars] = useState<GoogleCalendarOption[]>([]);
  const [loadingGoogleCalendars, setLoadingGoogleCalendars] = useState(false);

  // CalDAV discovery state
  const [caldavCalendars, setCaldavCalendars] = useState<CalDavCalendarOption[]>([]);
  const [discoveringCaldav, setDiscoveringCaldav] = useState(false);

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

  // Handle Google OAuth callback - pick up refresh token from URL params
  const handleOAuthReturn = useCallback(() => {
    const refreshToken = searchParams.get("google_refresh_token");
    const googleError = searchParams.get("google_error");

    if (googleError) {
      toast.error(`Google OAuth: ${googleError}`);
      // Clean URL params
      const url = new URL(window.location.href);
      url.searchParams.delete("google_error");
      window.history.replaceState({}, "", url.toString());
    }

    if (refreshToken) {
      // Set the provider to Google and fill the refresh token
      form.setValue("credentials.provider", "GOOGLE", { shouldValidate: true });
      form.setValue("credentials.refreshToken", refreshToken, { shouldValidate: true });
      toast.success(t("google.authSuccess"));

      // Clean URL params
      const url = new URL(window.location.href);
      url.searchParams.delete("google_refresh_token");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, form, t]);

  useEffect(() => {
    handleOAuthReturn();
  }, [handleOAuthReturn]);

  // Google OAuth: redirect to Google consent screen
  function handleGoogleAuthorize() {
    const clientId = form.getValues("credentials.clientId" as "credentials.provider");
    const clientSecret = form.getValues("credentials.clientSecret" as "credentials.provider");

    if (!clientId || !clientSecret) {
      toast.error(t("google.enterCredentialsFirst"));
      return;
    }

    setGoogleAuthorizing(true);
    const params = new URLSearchParams({
      clientId: clientId as string,
      clientSecret: clientSecret as string,
    });
    window.location.href = `/api/auth/google-calendar?${params.toString()}`;
  }

  // Google: Load calendars using the refresh token
  async function handleLoadGoogleCalendars() {
    const clientId = form.getValues("credentials.clientId" as "credentials.provider") as string;
    const clientSecret = form.getValues("credentials.clientSecret" as "credentials.provider") as string;
    const refreshToken = form.getValues("credentials.refreshToken" as "credentials.provider") as string;

    if (!clientId || !clientSecret || !refreshToken) {
      toast.error(t("google.authorizeFirst"));
      return;
    }

    setLoadingGoogleCalendars(true);
    try {
      const calendars = await listGoogleCalendars({ clientId, clientSecret, refreshToken });
      setGoogleCalendars(calendars);
      if (calendars.length === 0) {
        toast.info(t("google.noCalendarsFound"));
      } else {
        toast.success(t("google.calendarsFound", { count: calendars.length }));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("google.loadFailed"));
    } finally {
      setLoadingGoogleCalendars(false);
    }
  }

  // CalDAV: Discover calendars
  async function handleDiscoverCaldav() {
    const serverUrl = form.getValues("credentials.serverUrl" as "credentials.provider") as string;
    const username = form.getValues("credentials.username" as "credentials.provider") as string;
    const password = form.getValues("credentials.password" as "credentials.provider") as string;

    if (!serverUrl || !username || !password) {
      toast.error(t("caldav.enterCredentialsFirst"));
      return;
    }

    setDiscoveringCaldav(true);
    try {
      const calendars = await discoverCalDavCalendars(serverUrl, username, password);
      setCaldavCalendars(calendars);
      if (calendars.length === 0) {
        toast.info(t("caldav.noCalendarsFound"));
      } else {
        toast.success(t("caldav.calendarsFound", { count: calendars.length }));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("caldav.discoveryFailed"));
    } finally {
      setDiscoveringCaldav(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const credentials = form.getValues("credentials");
      const { provider: p, ...creds } = credentials;
      const result = await testCalendarConnection(p as CalendarProvider, creds as unknown as Record<string, string>);
      setTestResult(result);
      if (result.success) {
        toast.success(t("connectionSuccess", { count: result.calendarCount }));
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(t("connectionTestFailed"));
      setTestResult({ success: false, error: t("testFailed") });
    } finally {
      setTesting(false);
    }
  }

  async function onSubmit(data: CreateCalendarInput) {
    setSaving(true);
    try {
      if (mode === "create") {
        await createCalendar(data);
        toast.success(t("created"));
      } else if (initialData) {
        await updateCalendar(initialData.id, data);
        toast.success(t("updated"));
      }
      router.push("/admin/calendars");
    } catch (error) {
      toast.error(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-ring)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]/20";
  const labelClass = "mb-1.5 block text-sm font-medium text-[var(--color-foreground)]";
  const secondaryBtnClass = "inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-secondary)] transition-colors disabled:opacity-50";

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Name */}
      <div>
        <label className={labelClass}>{t("name")}</label>
        <input {...form.register("name")} className={inputClass} placeholder="My Calendar" />
        {form.formState.errors.name && (
          <p className="mt-1 text-xs text-[var(--color-destructive)]">{form.formState.errors.name.message}</p>
        )}
      </div>

      {/* Provider Selection */}
      <div>
        <label className={labelClass}>{t("provider")}</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PROVIDER_KEYS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                form.setValue("credentials.provider", p as "EXCHANGE" | "GOOGLE" | "CALDAV" | "ICS", { shouldValidate: true });
                // Reset discovery state when switching providers
                setGoogleCalendars([]);
                setCaldavCalendars([]);
              }}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                provider === p
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                  : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-[var(--color-border-hover)]"
              }`}
            >
              {t(`providers.${p}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Provider-specific fields */}
      <div className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        {provider === "EXCHANGE" && (
          <>
            <div>
              <label className={labelClass}>{t("fields.tenantId")}</label>
              <input {...form.register("credentials.tenantId")} className={inputClass} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
            </div>
            <div>
              <label className={labelClass}>{t("fields.clientId")}</label>
              <input {...form.register("credentials.clientId")} className={inputClass} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
            </div>
            <div>
              <label className={labelClass}>{t("fields.clientSecret")}</label>
              <input {...form.register("credentials.clientSecret")} type="password" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t("fields.userEmail")}</label>
              <input {...form.register("credentials.userEmail")} type="email" className={inputClass} placeholder="user@company.com" />
            </div>
            <div>
              <label className={labelClass}>{t("fields.resourceEmail")} <span className="text-[var(--color-muted-foreground)]">({tc("optional")})</span></label>
              <input {...form.register("credentials.resourceEmail")} type="email" className={inputClass} placeholder="room@company.com" />
            </div>
          </>
        )}

        {provider === "GOOGLE" && (
          <>
            <div>
              <label className={labelClass}>{t("fields.clientId")}</label>
              <input {...form.register("credentials.clientId")} className={inputClass} placeholder="xxxx.apps.googleusercontent.com" />
            </div>
            <div>
              <label className={labelClass}>{t("fields.clientSecret")}</label>
              <input {...form.register("credentials.clientSecret")} type="password" className={inputClass} />
            </div>

            {/* OAuth Authorize Button */}
            <div className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-background)] p-3">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-foreground)]">{t("google.authorization")}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {t("google.authorizationHint")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleAuthorize}
                  disabled={googleAuthorizing}
                  className="inline-flex shrink-0 items-center gap-2 rounded-md bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
                >
                  {googleAuthorizing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  {t("google.authorizeButton")}
                </button>
              </div>
            </div>

            <div>
              <label className={labelClass}>{t("fields.refreshToken")}</label>
              <input
                {...form.register("credentials.refreshToken")}
                type="password"
                className={inputClass}
                placeholder={t("google.refreshTokenPlaceholder")}
              />
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                {t("google.refreshTokenHint")}
              </p>
            </div>

            {/* Calendar Selection */}
            <div>
              <label className={labelClass}>{t("google.calendar")}</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  {googleCalendars.length > 0 ? (
                    <select
                      className={inputClass}
                      value={form.watch("credentials.calendarId" as "credentials.provider") as string || ""}
                      onChange={(e) => { (form.setValue as (name: string, value: string, options?: { shouldValidate?: boolean }) => void)("credentials.calendarId", e.target.value, { shouldValidate: true }); }}
                    >
                      <option value="">{t("google.selectCalendar")}</option>
                      {googleCalendars.map((cal) => (
                        <option key={cal.id} value={cal.id}>
                          {cal.summary} ({cal.id})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      {...form.register("credentials.calendarId")}
                      className={inputClass}
                      placeholder="primary"
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleLoadGoogleCalendars}
                  disabled={loadingGoogleCalendars}
                  className={secondaryBtnClass}
                  title={t("google.loadCalendarsTitle")}
                >
                  {loadingGoogleCalendars ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {t("google.loadCalendars")}
                </button>
              </div>
              {googleCalendars.length > 0 && (
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  {t("google.calendarsAvailable", { count: googleCalendars.length })}
                </p>
              )}
            </div>
          </>
        )}

        {provider === "CALDAV" && (
          <>
            <div>
              <label className={labelClass}>{t("fields.serverUrl")}</label>
              <input {...form.register("credentials.serverUrl")} className={inputClass} placeholder="https://nextcloud.example.com/remote.php/dav" />
            </div>
            <div>
              <label className={labelClass}>{t("fields.username")}</label>
              <input {...form.register("credentials.username")} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t("fields.password")}</label>
              <input {...form.register("credentials.password")} type="password" className={inputClass} />
            </div>

            {/* CalDAV Calendar Discovery */}
            <div>
              <label className={labelClass}>{t("fields.calendarPath")} <span className="text-[var(--color-muted-foreground)]">({tc("optional")})</span></label>
              <div className="flex gap-2">
                <div className="flex-1">
                  {caldavCalendars.length > 0 ? (
                    <select
                      className={inputClass}
                      value={form.watch("credentials.calendarPath" as "credentials.provider") as string || ""}
                      onChange={(e) => { (form.setValue as (name: string, value: string, options?: { shouldValidate?: boolean }) => void)("credentials.calendarPath", e.target.value, { shouldValidate: true }); }}
                    >
                      <option value="">{t("caldav.selectCalendar")}</option>
                      {caldavCalendars.map((cal) => (
                        <option key={cal.id} value={cal.path}>
                          {cal.name} ({cal.path})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      {...form.register("credentials.calendarPath")}
                      className={inputClass}
                      placeholder="/calendars/user/default/"
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleDiscoverCaldav}
                  disabled={discoveringCaldav}
                  className={secondaryBtnClass}
                  title={t("caldav.discoverTitle")}
                >
                  {discoveringCaldav ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  {t("caldav.discover")}
                </button>
              </div>
              {caldavCalendars.length > 0 ? (
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  {t("caldav.calendarsAvailable", { count: caldavCalendars.length })}
                </p>
              ) : (
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  {t("caldav.discoverHint")}
                </p>
              )}
            </div>
          </>
        )}

        {provider === "ICS" && (
          <>
            <div>
              <label className={labelClass}>{t("fields.feedUrl")}</label>
              <input {...form.register("credentials.feedUrl")} className={inputClass} placeholder="https://example.com/calendar.ics" />
            </div>
            <div>
              <label className={labelClass}>{t("fields.authHeader")} <span className="text-[var(--color-muted-foreground)]">({tc("optional")})</span></label>
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
          {t("connectionTest")}
        </button>
        {testResult && (
          <span className={`inline-flex items-center gap-1.5 text-sm ${testResult.success ? "text-[var(--color-success)]" : "text-[var(--color-destructive)]"}`}>
            {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {testResult.success ? t("connectionOk", { count: testResult.calendarCount }) : testResult.error}
          </span>
        )}
      </div>

      {/* Color */}
      <div>
        <label className={labelClass}>{t("color")}</label>
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
        <label className={labelClass}>{t("syncInterval")}</label>
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
          {mode === "create" ? t("createCalendar") : t("saveChanges")}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/calendars")}
          className="rounded-md px-4 py-2.5 text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
        >
          {tc("cancel")}
        </button>
      </div>
    </form>
  );
}
