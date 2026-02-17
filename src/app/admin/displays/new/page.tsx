import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCalendars } from "@/features/calendars/actions";
import { getRooms } from "@/features/rooms/actions";
import { DisplayWizard } from "@/features/displays/components";

export const dynamic = "force-dynamic";

export default async function NewDisplayPage() {
  const [calendars, rooms] = await Promise.all([getCalendars(), getRooms()]);

  const calendarOptions = calendars.map((c) => ({ id: c.id, name: c.name, provider: c.provider, color: c.color }));
  const roomOptions = rooms.map((r) => ({ id: r.id, name: r.name, calendarId: r.calendarId }));

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/displays" className="inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Displays
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--color-foreground)]">Create Display</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Set up a new digital signage display</p>
      </div>
      <div className="mx-auto max-w-3xl">
        <DisplayWizard calendars={calendarOptions} rooms={roomOptions} />
      </div>
    </div>
  );
}
