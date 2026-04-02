"use client";

import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AuditLogEntry } from "@/types/admin";

interface Props {
  entries: AuditLogEntry[];
  currentPage: number;
  totalPages: number;
  total: number;
  initialAction?: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  impersonate_start: { label: "Impersonated", color: "bg-blue-100 text-blue-800" },
  ban_user: { label: "Ban User", color: "bg-red-100 text-red-800" },
  unban_user: { label: "Unban User", color: "bg-emerald-100 text-emerald-800" },
  change_plan: { label: "Change Plan", color: "bg-amber-100 text-amber-800" },
  manual_sync: { label: "Manual Sync", color: "bg-zinc-100 text-zinc-800" },
};

export function AuditLogClient({
  entries,
  currentPage,
  totalPages,
  total,
  initialAction,
}: Props) {
  const router = useRouter();

  function navigate(action?: string | null, page = 1) {
    const params = new URLSearchParams();
    if (action && action !== "all") params.set("action", action);
    if (page > 1) params.set("page", String(page));
    router.push(`/admin/audit-log?${params.toString()}`);
  }

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <Select
            defaultValue={initialAction ?? "all"}
            onValueChange={(v) => navigate(v)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="impersonate_start">Impersonated</SelectItem>
              <SelectItem value="ban_user">Ban User</SelectItem>
              <SelectItem value="unban_user">Unban User</SelectItem>
              <SelectItem value="change_plan">Change Plan</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <p className="text-sm font-medium">
              Events ({total})
            </p>
          </div>
          {entries.filter((e) => e.action !== "impersonate_end").length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">No audit log entries</p>
              <p className="text-xs">Admin actions will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Target User</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.filter((e) => e.action !== "impersonate_end").map((entry) => {
                  const actionInfo = ACTION_LABELS[entry.action] ?? {
                    label: entry.action,
                    color: "bg-zinc-100 text-zinc-800",
                  };
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {format(parseISO(entry.created_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${actionInfo.color} hover:${actionInfo.color}`}>
                          {actionInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.admin_email ?? entry.admin_id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.target_email ?? (entry.target_user_id ? entry.target_user_id.slice(0, 8) : "—")}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {Object.keys(entry.details).length > 0
                          ? JSON.stringify(entry.details)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t p-4">
              <p className="text-xs text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => navigate(initialAction, currentPage - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => navigate(initialAction, currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
