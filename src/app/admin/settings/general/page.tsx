import { getTranslations } from "next-intl/server";
import { getSystemSettings } from "@/features/settings/actions";
import { GeneralSettingsForm } from "@/features/settings/components";

export const dynamic = "force-dynamic";

export default async function GeneralSettingsPage() {
  const t = await getTranslations("admin.settings");
  const settings = await getSystemSettings();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">
        {t("generalTitle")}
      </h1>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        {t("generalDescription")}
      </p>
      <div className="mt-6 max-w-2xl">
        <GeneralSettingsForm initialSettings={settings} />
      </div>
    </div>
  );
}
