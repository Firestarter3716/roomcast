"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  Clock,
  User,
  Globe,
} from "lucide-react";
import { exportAuditLogsCsv } from "../actions";

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entityName: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
}

interface AuditLogTableProps {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

const ENTITY_TYPE_KEYS = ["", "Calendar", "Room", "Display", "User", "SystemSettings"] as const;
const ACTION_KEYS = ["", "CREATE", "UPDATE", "DELETE", "SYNC", "LOGIN", "TOKEN_REGENERATE"] as const;

const ACTION_BADGE_STYLES: Record<string, string> = {
  CREATE:
    "bg-[var(--color-success)]/10 text-[var(--color-success)]",
  UPDATE:
    "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
  DELETE:
    "bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]",
  SYNC:
    "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  LOGIN:
    "bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]",
  TOKEN_REGENERATE:
    "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
};

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function formatExactTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function AuditLogTable({ logs, total, page, totalPages }: AuditLogTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("admin.audit");
  const [isPending, startTransition] = useTransition();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  const currentFilters = {
    entityType: searchParams.get("entityType") ?? "",
    action: searchParams.get("action") ?? "",
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
  };

  const updateFilters = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      // Reset to page 1 when filters change
      if (!("page" in updates)) {
        params.delete("page");
      }
      startTransition(() => {
        router.push(`?${params.toString()}`);
      });
    },
    [router, searchParams, startTransition]
  );

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const csv = await exportAuditLogsCsv({
        entityType: currentFilters.entityType || undefined,
        action: currentFilters.action || undefined,
        from: currentFilters.from || undefined,
        to: currentFilters.to || undefined,
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }

  function getEntityTypeLabel(value: string): string {
    if (!value) return t("allEntities");
    return t(`entityTypes.${value}` as Parameters<typeof t>[0]);
  }

  function getActionLabel(value: string): string {
    if (!value) return t("allActions");
    return t(`actions.${value}` as Parameters<typeof t>[0]);
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-muted-foreground)]">
          <Filter className="h-4 w-4" />
          {t("filters")}
        </div>

        <div className="flex flex-1 flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--color-muted-foreground)]">{t("entityType")}</span>
            <select
              value={currentFilters.entityType}
              onChange={(e) => updateFilters({ entityType: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-sm text-[var(--color-foreground)] outline-none focus:border-[var(--color-ring)]"
            >
              {ENTITY_TYPE_KEYS.map((et) => (
                <option key={et} value={et}>
                  {getEntityTypeLabel(et)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--color-muted-foreground)]">{t("action")}</span>
            <select
              value={currentFilters.action}
              onChange={(e) => updateFilters({ action: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-sm text-[var(--color-foreground)] outline-none focus:border-[var(--color-ring)]"
            >
              {ACTION_KEYS.map((a) => (
                <option key={a} value={a}>
                  {getActionLabel(a)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--color-muted-foreground)]">{t("from")}</span>
            <input
              type="date"
              value={currentFilters.from}
              onChange={(e) => updateFilters({ from: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-sm text-[var(--color-foreground)] outline-none focus:border-[var(--color-ring)]"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--color-muted-foreground)]">{t("to")}</span>
            <input
              type="date"
              value={currentFilters.to}
              onChange={(e) => updateFilters({ to: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-sm text-[var(--color-foreground)] outline-none focus:border-[var(--color-ring)]"
            />
          </label>
        </div>

        <button
          onClick={handleExport}
          disabled={isExporting}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)] hover:border-[var(--color-border-hover)] disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          {isExporting ? t("exporting") : t("export")}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">
                {t("timestamp")}
              </th>
              <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">
                {t("user")}
              </th>
              <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">
                {t("action")}
              </th>
              <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">
                {t("entity")}
              </th>
              <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">
                {t("details")}
              </th>
              <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">
                {t("ip")}
              </th>
            </tr>
          </thead>
          <tbody className={isPending ? "opacity-50 transition-opacity" : ""}>
            {logs.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-[var(--color-muted-foreground)]"
                >
                  {t("noLogs")}
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const isExpanded = expandedRows.has(log.id);
                const hasDetails =
                  log.details && Object.keys(log.details).length > 0;

                return (
                  <tr
                    key={log.id}
                    className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface)]"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="flex items-center gap-1.5 text-[var(--color-foreground)]"
                        title={formatExactTime(log.createdAt)}
                      >
                        <Clock className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                        {formatRelativeTime(log.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.userName || log.userEmail ? (
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                          <span className="text-[var(--color-foreground)]">
                            {log.userName ?? log.userEmail}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[var(--color-muted-foreground)]">
                          {t("system")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          ACTION_BADGE_STYLES[log.action] ??
                          "bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[var(--color-foreground)]">
                        {log.entityName ?? log.entityId ?? "-"}
                      </div>
                      <div className="text-xs text-[var(--color-muted-foreground)]">
                        {log.entityType}
                        {log.entityId && log.entityName ? (
                          <span> &middot; {log.entityId.slice(0, 8)}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {hasDetails ? (
                        <div>
                          <button
                            onClick={() => toggleRow(log.id)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)] transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                            {isExpanded ? t("hide") : t("show")}
                          </button>
                          {isExpanded && (
                            <pre className="mt-2 max-w-xs overflow-auto rounded-md bg-[var(--color-surface)] p-2 text-xs text-[var(--color-foreground)] font-mono">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      ) : (
                        <span className="text-[var(--color-muted-foreground)]">
                          -
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.ipAddress ? (
                        <span className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                          <Globe className="h-3 w-3" />
                          {log.ipAddress}
                        </span>
                      ) : (
                        <span className="text-[var(--color-muted-foreground)]">
                          -
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
          <span className="text-sm text-[var(--color-muted-foreground)]">
            {t("showing", {
              start: (page - 1) * 50 + 1,
              end: Math.min(page * 50, total),
              total,
            })}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateFilters({ page: String(page - 1) })}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)] disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="h-4 w-4" />
              {t("previous")}
            </button>
            <span className="text-sm text-[var(--color-muted-foreground)]">
              {t("page", { page, totalPages })}
            </span>
            <button
              onClick={() => updateFilters({ page: String(page + 1) })}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)] disabled:opacity-40 disabled:pointer-events-none"
            >
              {t("next")}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
