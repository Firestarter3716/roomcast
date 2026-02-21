import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CalendarForm } from "@/features/calendars/components";

export default async function NewCalendarPage() {
  const t = await getTranslations();

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/calendars"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("common.backToCalendars")}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--color-foreground)]">
          {t("calendars.addCalendar")}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {t("calendars.connectProvider")}
        </p>
      </div>
      <div className="mx-auto max-w-2xl">
        <CalendarForm mode="create" />
      </div>
    </div>
  );
}
