import { getSystemSettings } from "@/features/settings/actions";
import { GeneralSettingsForm } from "@/features/settings/components";

export const dynamic = "force-dynamic";

export default async function GeneralSettingsPage() {
  const settings = await getSystemSettings();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">
        General Settings
      </h1>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        Configure global system settings
      </p>
      <div className="mt-6 max-w-2xl">
        <GeneralSettingsForm initialSettings={settings} />
      </div>
    </div>
  );
}
