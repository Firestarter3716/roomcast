import { type Calendar, type CalendarProvider, type SyncStatus } from "@prisma/client";

export type { CalendarProvider, SyncStatus } from "@prisma/client";

export interface CalendarWithStats extends Calendar {
  _count?: {
    events: number;
    rooms: number;
  };
}

export interface CalendarListItem {
  id: string;
  name: string;
  provider: CalendarProvider;
  color: string;
  syncStatus: SyncStatus;
  lastSyncAt: Date | null;
  lastSyncError: string | null;
  syncIntervalSeconds: number;
  enabled: boolean;
  eventCount: number;
  roomCount: number;
}

export const PROVIDER_LABELS: Record<CalendarProvider, string> = {
  EXCHANGE: "Microsoft Exchange",
  GOOGLE: "Google Calendar",
  CALDAV: "CalDAV",
  ICS: "ICS Feed",
};

export const SYNC_INTERVAL_OPTIONS = [
  { value: 30, label: "30 seconds" },
  { value: 60, label: "1 minute" },
  { value: 300, label: "5 minutes" },
  { value: 600, label: "10 minutes" },
  { value: 1800, label: "30 minutes" },
  { value: 3600, label: "1 hour" },
  { value: 86400, label: "24 hours" },
] as const;

export const DEFAULT_CALENDAR_COLORS = [
  "#3B82F6", // blue
  "#EF4444", // red
  "#10B981", // emerald
  "#F59E0B", // amber
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
] as const;
