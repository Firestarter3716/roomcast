import { getAuditLogs } from "@/features/audit/actions";
import { AuditLogTable } from "@/features/audit/components";

export const dynamic = "force-dynamic";

interface AuditPageProps {
  searchParams: Promise<{
    entityType?: string;
    action?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const params = await searchParams;

  const { logs, total, page, totalPages } = await getAuditLogs({
    entityType: params.entityType,
    action: params.action,
    from: params.from,
    to: params.to,
    page: params.page ? parseInt(params.page, 10) : 1,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">
        Audit Log
      </h1>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        Track all system changes and user actions
      </p>
      <div className="mt-6">
        <AuditLogTable
          logs={logs}
          total={total}
          page={page}
          totalPages={totalPages}
        />
      </div>
    </div>
  );
}
