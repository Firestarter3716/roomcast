import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getRoom } from "@/features/rooms/actions";
import { getCalendarsForSelect } from "@/features/calendars/queries";
import { RoomForm } from "@/features/rooms/components";

export const dynamic = "force-dynamic";

interface EditRoomPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRoomPage({ params }: EditRoomPageProps) {
  const { id } = await params;
  const [room, calendars] = await Promise.all([
    getRoom(id),
    getCalendarsForSelect(),
  ]);

  if (!room) notFound();

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
          Edit Room
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{room.name}</p>
      </div>
      <div className="mx-auto max-w-2xl">
        <RoomForm
          mode="edit"
          calendars={calendars}
          initialData={room}
        />
      </div>
    </div>
  );
}
