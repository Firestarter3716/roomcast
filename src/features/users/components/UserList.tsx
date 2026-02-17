"use client";

import { useRouter } from "next/navigation";
import { deleteUser } from "../actions";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { type Role } from "@prisma/client";

interface UserItem {
  id: string;
  email: string;
  name: string;
  role: Role;
  lastLoginAt: Date | null;
  createdAt: Date;
}

interface UserListProps {
  users: UserItem[];
}

const roleBadgeColors: Record<Role, { bg: string; text: string }> = {
  ADMIN: {
    bg: "var(--color-primary)/15",
    text: "var(--color-primary)",
  },
  EDITOR: {
    bg: "var(--color-secondary)/15",
    text: "var(--color-secondary)",
  },
  VIEWER: {
    bg: "var(--color-muted)/50",
    text: "var(--color-muted-foreground)",
  },
};

function formatDate(date: Date | null): string {
  if (!date) return "Never";
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function UserList({ users }: UserListProps) {
  const router = useRouter();

  async function handleDelete(id: string, name: string) {
    const confirmed = window.confirm(
      `Are you sure you want to delete user "${name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deleteUser(id);
      toast.success("User deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete user");
    }
  }

  if (users.length === 0) {
    return (
      <div className="mt-8 flex items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] p-12">
        <p className="text-[var(--color-muted-foreground)]">
          No users created yet. Create your first user.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-[var(--color-border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/30">
            <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">
              Name
            </th>
            <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">
              Email
            </th>
            <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">
              Role
            </th>
            <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">
              Last Login
            </th>
            <th className="px-4 py-3 text-right font-medium text-[var(--color-muted-foreground)]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const badge = roleBadgeColors[user.role];
            return (
              <tr
                key={user.id}
                className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-muted)]/20 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-[var(--color-foreground)]">
                  {user.name}
                </td>
                <td className="px-4 py-3 text-[var(--color-muted-foreground)]">
                  {user.email}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: badge.bg,
                      color: badge.text,
                    }}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--color-muted-foreground)]">
                  {formatDate(user.lastLoginAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/settings/users/${user.id}/edit`}
                      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)]/50 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(user.id, user.name)}
                      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
