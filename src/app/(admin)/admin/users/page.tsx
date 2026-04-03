import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAdminUsersList } from "@/lib/admin/queries";
import { AdminUsersClient } from "@/components/admin/users-table";
import { parseTableDateRangeSearchParams } from "@/lib/table-date-range";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
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

  const { users, total, effectivePage } = await getAdminUsersList({
    search: first("search"),
    status: first("status"),
    plan: first("plan"),
    channel: first("channel"),
    range: tableDate.range,
    dateFrom: tableDate.dateFrom,
    dateTo: tableDate.dateTo,
    page,
  });

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">View and manage all user accounts</p>
      </div>
      <AdminUsersClient
        users={users}
        total={total}
        effectivePage={effectivePage}
        requestedPage={page}
      />
    </div>
  );
}
