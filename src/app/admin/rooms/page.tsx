import Link from "next/link";
import { Plus } from "lucide-react";
import { getRoomsWithStatus } from "@/features/rooms/actions";
import { RoomList } from "@/features/rooms/components";

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const rooms = await getRoomsWithStatus();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">
            Rooms
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Manage your conference rooms and resources
          </p>
        </div>
        <Link
          href="/admin/rooms/new"
          className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Room
        </Link>
      </div>
      <RoomList rooms={rooms} />
    </div>
  );
}
