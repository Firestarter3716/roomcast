"use client";

import { DoorOpen, Pencil, Trash2, Monitor, Users, Clock, CalendarClock } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Badge } from "@/shared/components/ui/badge";
import type { RoomStatus } from "../actions";

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface RoomCardProps {
  id: string;
  name: string;
  location: string | null;
  capacity: number | null;
  equipment: string[];
  calendar: { id: string; name: string; color: string };
  hasDisplay: boolean;
  displayId: string | null;
  status: RoomStatus;
  onDelete: (id: string) => void;
}

export function RoomCard({
  id,
  name,
  location,
  capacity,
  equipment,
  calendar,
  hasDisplay,
  displayId,
  status,
  onDelete,
}: RoomCardProps) {
  const t = useTranslations("rooms");

  return (
    <div className="group relative rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 transition-shadow hover:shadow-[var(--shadow-md)]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-secondary)]">
            <DoorOpen className="h-5 w-5 text-[var(--color-foreground)]" />
          </div>
          <div>
            <h3 className="font-medium text-[var(--color-foreground)]">{name}</h3>
            {location && (
              <p className="text-xs text-[var(--color-muted-foreground)]">{location}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Link
            href={`/admin/rooms/${id}`}
            className="rounded-md p-1.5 text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)] transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <button
            onClick={() => onDelete(id)}
            className="rounded-md p-1.5 text-[var(--color-muted-foreground)] hover:bg-[var(--color-destructive)]/10 hover:text-[var(--color-destructive)] transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Status section */}
      <div className="mt-3">
        {status.isFree ? (
          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/25">
            {t("status.free")}
          </Badge>
        ) : status.isEndingSoon ? (
          <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/25">
            {t("status.endingSoon")}
          </Badge>
        ) : (
          <Badge className="bg-red-500/15 text-red-600 border-red-500/25">
            {t("status.busy")}
          </Badge>
        )}

        {/* Current event info + progress bar */}
        {status.currentEvent && (
          <div className="mt-2">
            <p className="text-xs font-medium text-[var(--color-foreground)] truncate">
              {status.currentEvent.title}
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {formatTime(status.currentEvent.startTime)} &ndash; {formatTime(status.currentEvent.endTime)}
            </p>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-[var(--color-secondary)]">
              <div
                className={`h-full rounded-full transition-all ${
                  status.isEndingSoon ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${status.progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Next event */}
        {status.nextEvent && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
            <CalendarClock className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {t("nextEvent", {
                title: status.nextEvent.title,
                time: formatTime(status.nextEvent.startTime),
              })}
            </span>
          </div>
        )}

        {/* Free with no upcoming events */}
        {status.isFree && !status.nextEvent && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
            <Clock className="h-3 w-3 shrink-0" />
            <span>{t("noUpcomingBookings")}</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {capacity && (
          <span className="inline-flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
            <Users className="h-3 w-3" /> {capacity}
          </span>
        )}
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
          style={{ backgroundColor: calendar.color + "20", color: calendar.color }}
        >
          {calendar.name}
        </span>
      </div>

      {equipment.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {equipment.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-[var(--color-secondary)] px-2 py-0.5 text-xs text-[var(--color-muted-foreground)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 border-t border-[var(--color-border)] pt-3">
        {hasDisplay ? (
          <Link
            href={`/admin/displays/${displayId}`}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--color-primary)] hover:underline"
          >
            <Monitor className="h-3 w-3" />
            {t("viewDisplay")}
          </Link>
        ) : (
          <Link
            href={`/admin/displays/new?roomId=${id}`}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)]"
          >
            <Monitor className="h-3 w-3" />
            {t("createDisplay")}
          </Link>
        )}
      </div>
    </div>
  );
}
