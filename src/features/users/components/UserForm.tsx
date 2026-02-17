"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema, type CreateUserInput } from "../schemas";
import { createUser, updateUser } from "../actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { type Role } from "@prisma/client";

interface UserFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
}

const ROLE_KEYS: Role[] = ["ADMIN", "EDITOR", "VIEWER"];

export function UserForm({ mode, initialData }: UserFormProps) {
  const router = useRouter();
  const t = useTranslations("admin.users");
  const tr = useTranslations("admin.roles");
  const tc = useTranslations("common");
  const [saving, setSaving] = useState(false);

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      email: initialData?.email ?? "",
      password: "",
      role: initialData?.role ?? "VIEWER",
    },
  });

  async function onSubmit(data: CreateUserInput) {
    setSaving(true);
    try {
      if (mode === "create") {
        await createUser(data);
        toast.success(t("created"));
      } else if (initialData) {
        await updateUser(initialData.id, {
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role,
        });
        toast.success(t("updated"));
      }
      router.push("/admin/settings/users");
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-ring)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]/20";
  const labelClass =
    "mb-1.5 block text-sm font-medium text-[var(--color-foreground)]";

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className={labelClass}>{t("name")}</label>
        <input
          {...form.register("name")}
          className={inputClass}
          placeholder="John Doe"
        />
        {form.formState.errors.name && (
          <p className="mt-1 text-xs text-[var(--color-destructive)]">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div>
        <label className={labelClass}>{t("email")}</label>
        <input
          {...form.register("email")}
          type="email"
          className={inputClass}
          placeholder="john@example.com"
        />
        {form.formState.errors.email && (
          <p className="mt-1 text-xs text-[var(--color-destructive)]">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label className={labelClass}>
          {t("password")}
          {mode === "edit" && (
            <span className="ml-1.5 font-normal text-[var(--color-muted-foreground)]">
              ({t("passwordHint")})
            </span>
          )}
        </label>
        <input
          {...form.register("password")}
          type="password"
          className={inputClass}
          placeholder={
            mode === "edit" ? t("passwordPlaceholderEdit") : t("passwordPlaceholderNew")
          }
        />
        {form.formState.errors.password && (
          <p className="mt-1 text-xs text-[var(--color-destructive)]">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>

      <div>
        <label className={labelClass}>{t("role")}</label>
        <select {...form.register("role")} className={inputClass}>
          {ROLE_KEYS.map((role) => (
            <option key={role} value={role}>
              {tr(role)}
            </option>
          ))}
        </select>
        {form.formState.errors.role && (
          <p className="mt-1 text-xs text-[var(--color-destructive)]">
            {form.formState.errors.role.message}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-[var(--color-border)] pt-6">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === "create" ? t("createUser") : t("saveChanges")}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/settings/users")}
          className="rounded-md px-4 py-2.5 text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
        >
          {tc("cancel")}
        </button>
      </div>
    </form>
  );
}
