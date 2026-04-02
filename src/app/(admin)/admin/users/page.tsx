import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAdminUsers } from "@/lib/admin/queries";
import { AdminUsersClient } from "@/components/admin/users-table";

export default async function AdminUsersPage() {
  const users = await getAdminUsers();

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
        <p className="text-muted-foreground">
          View and manage all user accounts
        </p>
      </div>
      <AdminUsersClient users={users} />
    </div>
  );
}
