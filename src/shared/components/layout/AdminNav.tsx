"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  DoorOpen,
  Monitor,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/admin/calendars", label: "Calendars", icon: Calendar },
  { href: "/admin/rooms", label: "Rooms", icon: DoorOpen },
  { href: "/admin/displays", label: "Displays", icon: Monitor },
  { href: "/admin/settings", label: "Admin", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();

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

        <div className="ml-auto flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-xs font-medium text-[var(--color-primary-foreground)]">
            A
          </div>
        </div>
      </div>
    </header>
  );
}
