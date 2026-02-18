"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Calendar,
  DoorOpen,
  Monitor,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/shared/components/ui/sheet";
import { ThemeToggle } from "@/shared/components/ThemeToggle";

export function AdminNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const t = useTranslations("nav");
  const [mobileOpen, setMobileOpen] = useState(false);

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
        {/* Mobile hamburger button */}
        <button
          onClick={() => setMobileOpen(true)}
          className="mr-2 flex items-center justify-center rounded-md p-2 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)] md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/admin" className="mr-8 flex items-center gap-2">
          <Monitor className="h-6 w-6 text-[var(--color-primary)]" />
          <span className="text-lg font-semibold text-[var(--color-foreground)]">
            RoomCast
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
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

        {/* Desktop user section */}
        <div className="ml-auto flex items-center gap-3">
          {session?.user && (
            <span className="hidden text-sm text-[var(--color-muted-foreground)] sm:block">
              {session.user.email}
            </span>
          )}
          <ThemeToggle />
          <div className="h-8 w-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-xs font-medium text-[var(--color-primary-foreground)]">
            {userInitial}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="hidden items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)] md:flex"
            title={t("logout")}
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b border-[var(--color-border)] px-4 py-4">
            <SheetTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-[var(--color-primary)]" />
              <span className="text-lg font-semibold text-[var(--color-foreground)]">
                RoomCast
              </span>
            </SheetTitle>
          </SheetHeader>

          <nav className="flex flex-col gap-1 px-3 py-4" aria-label="Main navigation">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;

              return (
                <SheetClose key={item.href} asChild>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                        : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)]"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                </SheetClose>
              );
            })}
          </nav>

          <SheetFooter className="border-t border-[var(--color-border)] px-4 py-4">
            {session?.user && (
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 shrink-0 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-xs font-medium text-[var(--color-primary-foreground)]">
                  {userInitial}
                </div>
                <span className="truncate text-sm text-[var(--color-muted-foreground)]">
                  {session.user.email}
                </span>
              </div>
            )}
            <div className="mb-2 flex items-center">
              <ThemeToggle />
            </div>
            <SheetClose asChild>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)]"
              >
                <LogOut className="h-5 w-5" />
                {t("logout")}
              </button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </header>
  );
}
