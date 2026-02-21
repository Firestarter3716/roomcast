import { getTranslations } from "next-intl/server";
import { SettingsNav } from "./SettingsNav";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations();

  const navItems = [
    { href: "/admin/settings/general", label: t("admin.settings.general") },
    { href: "/admin/settings/users", label: t("admin.users.title") },
    { href: "/admin/settings/health", label: t("admin.health.title") },
    { href: "/admin/settings/audit", label: t("admin.audit.title") },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-8">
      {/* Sidebar */}
      <SettingsNav items={navItems} />

      {/* Main Content */}
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
