"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Calendar,
  DoorOpen,
  Monitor,
  Settings,
  LogOut,
} from "lucide-react";
import { useTranslations } from "next-intl";

export function AdminNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const t = useTranslations("nav");

  const navItems = [
    { href: "/admin/calendars", label: t("calendars"), icon: Calendar },
    { href: "/admin/rooms", label: t("rooms"), icon: DoorOpen },
    { href: "/admin/displays", label: t("displays"), icon: Monitor },
    { href: "/admin/settings", label: t("admin"), icon: Settings },
  ];

  const userInitial = session?.user?.name?.[0]?.toUpperCase()
    ?? session?.user?.email?.[0]?.toUpperCase()
    ?? "?";

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <Link href="/admin" className="mr-8 flex items-center gap-2">
          <Monitor className="h-6 w-6 text-[var(--color-primary)]" />
          <span className="text-lg font-semibold text-[var(--color-foreground)]">
            RoomCast
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-[var(--duration-micro)] ${
                  isActive
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                    : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {session?.user && (
            <span className="hidden text-sm text-[var(--color-muted-foreground)] sm:block">
              {session.user.email}
            </span>
          )}
          <div className="h-8 w-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-xs font-medium text-[var(--color-primary-foreground)]">
            {userInitial}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)]"
            title={t("logout")}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
