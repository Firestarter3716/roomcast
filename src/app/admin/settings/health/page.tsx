import prisma from "@/server/db/prisma";
import { HealthDashboard } from "@/features/settings/components";
import { sseRegistry } from "@/server/sse/registry";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const [calendarCount, eventCount, displayCount, calendars] = await Promise.all([
    prisma.calendar.count(),
    prisma.calendarEvent.count(),
    prisma.display.count(),
    prisma.calendar.findMany({
      select: { name: true, syncStatus: true, lastSyncAt: true, lastSyncError: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const sseConnections = sseRegistry.getActiveCount();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">System Health</h1>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        Monitor system status and calendar sync health
      </p>
      <div className="mt-6">
        <HealthDashboard
          healthData={{
            calendarCount,
            eventCount,
            displayCount,
            sseConnections,
            syncStatuses: calendars.map((c) => ({
              name: c.name,
              status: c.syncStatus,
              lastSyncAt: c.lastSyncAt?.toISOString() ?? null,
              error: c.lastSyncError,
            })),
          }}
        />
      </div>
    </div>
  );
}
