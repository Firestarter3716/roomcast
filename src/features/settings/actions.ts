"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/server/db/prisma";
import { createAuditLog } from "@/server/middleware/audit";

export async function getSystemSettings() {
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

  revalidatePath("/admin/settings");
  return settings;
}
