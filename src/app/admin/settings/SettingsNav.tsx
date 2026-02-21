"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Users, Activity, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const ICONS: Record<string, LucideIcon> = {
  "/admin/settings/general": Settings,
  "/admin/settings/users": Users,
  "/admin/settings/health": Activity,
  "/admin/settings/audit": FileText,
};

interface SettingsNavProps {
  items: { href: string; label: string }[];
}

export function SettingsNav({ items }: SettingsNavProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = items.map((item) => ({
    ...item,
    icon: ICONS[item.href] ?? Settings,
  }));

  return (
    <nav className="w-full md:w-56 shrink-0">
      <div className="md:sticky md:top-24 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                  : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]/50 hover:text-[var(--color-foreground)]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
