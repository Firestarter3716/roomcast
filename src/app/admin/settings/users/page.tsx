import Link from "next/link";
import { Plus } from "lucide-react";
import { getUsers } from "@/features/users/actions";
import { UserList } from "@/features/users/components";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Users</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Manage user accounts and roles
          </p>
        </div>
        <Link
          href="/admin/settings/users/new"
          className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add User
        </Link>
      </div>
      <UserList users={users} />
    </div>
  );
}
