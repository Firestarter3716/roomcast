import Link from "next/link";
import { Plus } from "lucide-react";
import { getCalendars } from "@/features/calendars/actions";
import { CalendarList } from "@/features/calendars/components";

export const dynamic = "force-dynamic";

export default async function CalendarsPage() {
  const calendars = await getCalendars();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">
            Calendars
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Manage your external calendar connections
          </p>
        </div>
        <Link
          href="/admin/calendars/new"
          className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Calendar
        </Link>
      </div>
      <CalendarList calendars={calendars} />
    </div>
  );
}
