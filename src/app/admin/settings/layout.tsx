"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Users, Activity, FileText } from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin/settings/general", label: "General", icon: Settings },
  { href: "/admin/settings/users", label: "Users", icon: Users },
  { href: "/admin/settings/health", label: "Health", icon: Activity },
  { href: "/admin/settings/audit", label: "Audit Log", icon: FileText },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex gap-8">
      {/* Sidebar */}
      <nav className="w-56 shrink-0">
        <div className="sticky top-24 space-y-1">
          {NAV_ITEMS.map((item) => {
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

      {/* Main Content */}
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
