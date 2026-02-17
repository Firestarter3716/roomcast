import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RoomForm } from "@/features/rooms/components";
import { getCalendarsForSelect } from "@/features/calendars/queries";

export const dynamic = "force-dynamic";

export default async function NewRoomPage() {
  const calendars = await getCalendarsForSelect();

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/rooms"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Rooms
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--color-foreground)]">
          Create Room
        </h1>
      </div>
      <div className="mx-auto max-w-2xl">
        <RoomForm mode="create" calendars={calendars} />
      </div>
    </div>
  );
}
