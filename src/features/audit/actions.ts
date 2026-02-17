"use server";

import prisma from "@/server/db/prisma";
import { requireActionAuth } from "@/server/auth/require-auth";

export async function getAuditLogs(filters?: {
  entityType?: string;
  action?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  perPage?: number;
}) {
  await requireActionAuth("ADMIN");
  const page = filters?.page ?? 1;
  const perPage = filters?.perPage ?? 50;

  const where: Record<string, unknown> = {};
  if (filters?.entityType) where.entityType = filters.entityType;
  if (filters?.action) where.action = filters.action;
  if (filters?.userId) where.userId = filters.userId;
  if (filters?.from || filters?.to) {
    where.createdAt = {
      ...(filters?.from ? { gte: new Date(filters.from) } : {}),
      ...(filters?.to ? { lte: new Date(filters.to) } : {}),
    };
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      entityName: l.entityName,
      details: l.details as Record<string, unknown> | null,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt.toISOString(),
      userName: l.user?.name ?? null,
      userEmail: l.user?.email ?? null,
    })),
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

export async function exportAuditLogsCsv(filters?: {
  entityType?: string;
  action?: string;
  userId?: string;
  from?: string;
  to?: string;
}) {
  await requireActionAuth("ADMIN");
  const where: Record<string, unknown> = {};
  if (filters?.entityType) where.entityType = filters.entityType;
  if (filters?.action) where.action = filters.action;
  if (filters?.userId) where.userId = filters.userId;
  if (filters?.from || filters?.to) {
    where.createdAt = {
      ...(filters?.from ? { gte: new Date(filters.from) } : {}),
      ...(filters?.to ? { lte: new Date(filters.to) } : {}),
    };
  }

  const logs = await prisma.auditLog.findMany({
    where,
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 10000,
  });

  const header = "Timestamp,User,Email,Action,Entity Type,Entity ID,Entity Name,IP Address,Details";
  const rows = logs.map((l) => {
    const details = l.details ? JSON.stringify(l.details).replace(/"/g, '""') : "";
    return [
      l.createdAt.toISOString(),
      l.user?.name ?? "",
      l.user?.email ?? "",
      l.action,
      l.entityType,
      l.entityId ?? "",
      l.entityName ?? "",
      l.ipAddress ?? "",
      `"${details}"`,
    ].join(",");
  });

  return [header, ...rows].join("\n");
}
