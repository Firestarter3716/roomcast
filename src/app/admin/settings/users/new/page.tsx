import { getTranslations } from "next-intl/server";
import { UserForm } from "@/features/users/components";

export default async function NewUserPage() {
  const t = await getTranslations("admin.users");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">
        {t("createUser")}
      </h1>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        {t("createDescription")}
      </p>
      <div className="mt-6 max-w-2xl">
        <UserForm mode="create" />
      </div>
    </div>
  );
}
