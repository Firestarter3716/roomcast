import { type AuditAction, Prisma } from "@prisma/client";
import prisma from "@/server/db/prisma";
import { logger } from "@/server/lib/logger";

interface AuditEntry {
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  entityName?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export async function createAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        entityName: entry.entityName,
        details: entry.details
          ? (entry.details as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        ipAddress: entry.ipAddress,
      },
    });
  } catch (error) {
    logger.error("Failed to create audit log", {
      error: error instanceof Error ? error.message : String(error),
      entry: entry as unknown as Record<string, unknown>,
    });
  }
}
