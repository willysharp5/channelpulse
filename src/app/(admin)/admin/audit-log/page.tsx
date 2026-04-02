import { getAuditLog } from "@/lib/admin/queries";
import { AuditLogClient } from "@/components/admin/audit-log-table";

interface Props {
  searchParams: Promise<{ action?: string; page?: string }>;
}

export default async function AdminAuditLogPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10);
  const limit = 25;
  const offset = (page - 1) * limit;

  const { entries, total } = await getAuditLog(limit, offset, params.action);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">
          Track all admin actions and system events
        </p>
      </div>
      <AuditLogClient
        entries={entries}
        currentPage={page}
        totalPages={totalPages}
        total={total}
        initialAction={params.action}
      />
    </div>
  );
}
