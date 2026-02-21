import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCalendar } from "@/features/calendars/actions";
import { CalendarForm } from "@/features/calendars/components";

export const dynamic = "force-dynamic";

interface EditCalendarPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCalendarPage({ params }: EditCalendarPageProps) {
  const { id } = await params;
  const t = await getTranslations();
  const calendar = await getCalendar(id);

  if (!calendar) {
    notFound();
  }

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
          {t("calendars.editCalendar")}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {calendar.name}
        </p>
      </div>
      <div className="mx-auto max-w-2xl">
        <CalendarForm
          mode="edit"
          initialData={{
            id: calendar.id,
            name: calendar.name,
            provider: calendar.provider,
            color: calendar.color,
            syncIntervalSeconds: calendar.syncIntervalSeconds,
            credentials: calendar.credentials as Record<string, string>,
          }}
        />
      </div>
    </div>
  );
}
