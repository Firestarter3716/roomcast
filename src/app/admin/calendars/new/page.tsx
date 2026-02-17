import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CalendarForm } from "@/features/calendars/components";

export default function NewCalendarPage() {
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/calendars"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Calendars
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--color-foreground)]">
          Add Calendar
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Connect an external calendar provider
        </p>
      </div>
      <div className="mx-auto max-w-2xl">
        <CalendarForm mode="create" />
      </div>
    </div>
  );
}
