import Link from "next/link";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getCalendars } from "@/features/calendars/actions";
import { CalendarList } from "@/features/calendars/components";

export const dynamic = "force-dynamic";

export default async function CalendarsPage() {
  const t = await getTranslations("calendars");
  const calendars = await getCalendars();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            {t("subtitle")}
          </p>
        </div>
        <Link
          href="/admin/calendars/new"
          className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t("addCalendar")}
        </Link>
      </div>
      <CalendarList calendars={calendars} />
    </div>
  );
}
