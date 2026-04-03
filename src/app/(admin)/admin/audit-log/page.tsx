import { getAuditLogList } from "@/lib/admin/queries";
import { AuditLogClient } from "@/components/admin/audit-log-table";
import { parseTableDateRangeSearchParams } from "@/lib/table-date-range";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const first = (k: string) => {
    const v = raw[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const tableDate = parseTableDateRangeSearchParams(raw);
  const page = Math.max(1, parseInt(first("page") ?? "1", 10) || 1);

  const { entries, total, effectivePage } = await getAuditLogList({
    page,
    limit: 25,
    action: first("action"),
    range: tableDate.range,
    dateFrom: tableDate.dateFrom,
    dateTo: tableDate.dateTo,
    emailSearch: first("search"),
    detailsSearch: first("details"),
  });

  const totalPages = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">Track all admin actions and system events</p>
      </div>
      <AuditLogClient
        entries={entries}
        currentPage={page}
        totalPages={totalPages}
        total={total}
        effectivePage={effectivePage}
      />
    </div>
  );
}
