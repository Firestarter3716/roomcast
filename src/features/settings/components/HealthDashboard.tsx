"use client";

import { useTranslations } from "next-intl";
import { Calendar, CalendarDays, Database, Monitor, Radio } from "lucide-react";

interface SyncStatus {
  name: string;
  status: string;
  lastSyncAt: string | null;
  error: string | null;
}

interface DbStatus {
  connected: boolean;
  responseTimeMs: number;
}

interface HealthData {
  calendarCount: number;
  eventCount: number;
  displayCount: number;
  sseConnections: number;
  dbStatus: DbStatus;
  syncStatuses: SyncStatus[];
}

interface HealthDashboardProps {
  healthData: HealthData;
}

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return "Never";
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string; animate?: boolean }> = {
    IDLE: { bg: "color-mix(in srgb, var(--color-success) 15%, transparent)", text: "var(--color-success)", label: "Idle" },
    SYNCING: { bg: "color-mix(in srgb, var(--color-primary) 15%, transparent)", text: "var(--color-primary)", label: "Syncing", animate: true },
    ERROR: { bg: "color-mix(in srgb, var(--color-destructive) 15%, transparent)", text: "var(--color-destructive)", label: "Error" },
  };

  const c = config[status] ?? { bg: "color-mix(in srgb, var(--color-muted-foreground) 15%, transparent)", text: "var(--color-muted-foreground)", label: status };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.animate ? "animate-pulse" : ""}`}
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {c.label}
    </span>
  );
}

const STAT_CARDS = [
  { key: "calendarCount" as const, labelKey: "calendars" as const, icon: Calendar },
  { key: "eventCount" as const, labelKey: "events" as const, icon: CalendarDays },
  { key: "displayCount" as const, labelKey: "displays" as const, icon: Monitor },
  { key: "sseConnections" as const, labelKey: "sseConnections" as const, icon: Radio },
];

export function HealthDashboard({ healthData }: HealthDashboardProps) {
  const t = useTranslations("admin.health");

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {/* Database Connection Status */}
        <div
          className="rounded-lg border p-5"
          style={{
            borderColor: healthData.dbStatus.connected
              ? "var(--color-success)"
              : "var(--color-destructive)",
            backgroundColor: "var(--color-surface)",
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              {t("database")}
            </p>
            <Database
              className="h-5 w-5"
              style={{
                color: healthData.dbStatus.connected
                  ? "var(--color-success)"
                  : "var(--color-destructive)",
              }}
            />
          </div>
          <p
            className="mt-2 text-xl font-semibold"
            style={{
              color: healthData.dbStatus.connected
                ? "var(--color-success)"
                : "var(--color-destructive)",
            }}
          >
            {healthData.dbStatus.connected ? t("connected") : t("disconnected")}
          </p>
          {healthData.dbStatus.connected && (
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              {t("responseTime", { ms: healthData.dbStatus.responseTimeMs })}
            </p>
          )}
        </div>

        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  {t(card.labelKey)}
                </p>
                <Icon className="h-5 w-5 text-[var(--color-muted-foreground)]" />
              </div>
              <p className="mt-2 text-3xl font-semibold text-[var(--color-foreground)]">
                {healthData[card.key]}
              </p>
            </div>
          );
        })}
      </div>

      {/* Calendar Sync Status Table */}
      {healthData.syncStatuses.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">
            {t("calendarSyncStatus")}
          </h2>
          <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/30">
                  <th scope="col" className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">
                    {t("syncName")}
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">
                    {t("syncStatus")}
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">
                    {t("lastSync")}
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">
                    {t("syncError")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {healthData.syncStatuses.map((sync) => (
                  <tr
                    key={sync.name}
                    className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-muted)]/20 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--color-foreground)]">
                      {sync.name}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={sync.status} />
                    </td>
                    <td className="px-4 py-3 text-[var(--color-muted-foreground)]">
                      {formatRelativeTime(sync.lastSyncAt)}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-destructive)]">
                      {sync.error ?? "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {healthData.syncStatuses.length === 0 && (
        <div role="status" className="flex items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] p-12">
          <p className="text-[var(--color-muted-foreground)]">
            {t("noCalendars")}
          </p>
        </div>
      )}
    </div>
  );
}
