"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import prisma from "@/server/db/prisma";
import { createAuditLog } from "@/server/middleware/audit";
import { requireActionAuth } from "@/server/auth/require-auth";
import { isValidLocale } from "@/i18n/config";

export async function getSystemSettings() {
  await requireActionAuth("ADMIN");
  let settings = await prisma.systemSettings.findUnique({
    where: { id: "singleton" },
  });
  if (!settings) {
    settings = await prisma.systemSettings.create({
      data: { id: "singleton" },
    });
  }
  return {
    defaultLocale: settings.defaultLocale,
    defaultTimezone: settings.defaultTimezone,
    defaultFont: settings.defaultFont,
    defaultLogoUrl: settings.defaultLogoUrl,
    sessionTimeoutHours: settings.sessionTimeoutHours,
  };
}

export async function updateSystemSettings(data: {
  defaultLocale?: string;
  defaultTimezone?: string;
  defaultFont?: string;
  defaultLogoUrl?: string | null;
  sessionTimeoutHours?: number;
}) {
  await requireActionAuth("ADMIN");
  const settings = await prisma.systemSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data,
  });

  await createAuditLog({
    action: "UPDATE",
    entityType: "SystemSettings",
    entityId: "singleton",
    entityName: "System Settings",
  });

  if (data.defaultLocale && isValidLocale(data.defaultLocale)) {
    const cookieStore = await cookies();
    cookieStore.set("locale", data.defaultLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  revalidatePath("/", "layout");
  return settings;
}
