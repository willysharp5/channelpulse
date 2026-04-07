"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw, Search, Trash2, CheckCircle2, Clock, AlertTriangle, ChevronDown, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatDate } from "@/lib/formatters";

interface DeletionRequest {
  id: string;
  user_id: string;
  org_id: string | null;
  email: string;
  business_name: string | null;
  stripe_customer_id: string | null;
  status: "pending" | "cancelled_by_user" | "cancelled_by_admin" | "completed";
  requested_at: string;
  purge_after_at: string;
  completed_at: string | null;
  admin_notes: string | null;
}

const STATUS_FILTERS = [
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled_by_user" },
  { label: "All", value: "all" },
] as const;

function statusBadge(status: string) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
          <Clock className="mr-1 h-3 w-3" /> Pending
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          <Trash2 className="mr-1 h-3 w-3" /> Deleted
        </Badge>
      );
    case "cancelled_by_user":
    case "cancelled_by_admin":
      return (
        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Recovered
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function DeletionRequestsClient() {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [purgingId, setPurgingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: filter, limit: "100" });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/admin/deletion-requests?${params}`);
      const data = await res.json();
      setRequests(data.requests ?? []);
      setPendingCount(data.pendingCount ?? 0);
    } catch {
      toast.error("Failed to load deletion requests");
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handlePurge(req: DeletionRequest) {
    setPurgingId(req.id);
    try {
      const res = await fetch(`/api/admin/deletion-requests/${req.id}/purge`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error("Purge failed", { description: data.error ?? "Unknown error" });
        return;
      }
      toast.success(`Account ${req.email} permanently deleted`);
      void load();
    } catch {
      toast.error("Network error during purge");
    } finally {
      setPurgingId(null);
    }
  }

  const isOverdue = (r: DeletionRequest) =>
    r.status === "pending" && new Date(r.purge_after_at) < new Date();

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deletion Requests</h1>
          <p className="text-sm text-muted-foreground">
            Review and manage account deletion requests
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email, name, or Stripe ID..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void load()}
          />
        </div>
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base">Pending Requests</CardTitle>
        </CardHeader>
        <CardContent className="pb-2">
          <p className="text-3xl font-bold">{pendingCount}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle2 className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">No deletion requests found</p>
              <p className="text-xs text-muted-foreground/60">All requests have been reviewed</p>
            </div>
          ) : (
            <div className="divide-y">
              {requests.map((req) => (
                <div key={req.id} className="px-6 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{req.email}</p>
                        {statusBadge(req.status)}
                        {isOverdue(req) && (
                          <Badge variant="outline" className="border-red-300 text-red-600">
                            <AlertTriangle className="mr-1 h-3 w-3" /> Overdue
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {req.business_name && <span className="font-medium">{req.business_name} &middot; </span>}
                        Requested {formatDate(req.requested_at, "d MMM yyyy, h:mm a")}
                        {req.status === "pending" && (
                          <> &middot; Purge after {formatDate(req.purge_after_at, "d MMM yyyy")}</>
                        )}
                      </p>
                      {req.stripe_customer_id && (
                        <p className="font-mono text-[10px] text-muted-foreground/60">
                          Stripe: {req.stripe_customer_id}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {req.status === "pending" && (
                        <PurgeConfirmDialog
                          req={req}
                          purging={purgingId === req.id}
                          onConfirm={() => void handlePurge(req)}
                        />
                      )}
                    </div>
                  </div>
                  <DataSummaryToggle requestId={req.id} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DataSummaryToggle({ requestId }: { requestId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ summary: { table: string; count: number }[]; total: number } | null>(null);

  async function handleToggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (data) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/deletion-requests/${requestId}/data-summary`);
      if (res.ok) setData(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <Database className="h-3 w-3" />
        Data to be deleted
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 rounded-lg border bg-muted/30 p-3">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading data summary…
            </div>
          ) : data && data.summary.length > 0 ? (
            <div className="space-y-1.5">
              {data.summary.map((row) => (
                <div key={row.table} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-muted-foreground">{row.table}</span>
                  <span className="font-semibold tabular-nums">{row.count.toLocaleString()} {row.count === 1 ? "row" : "rows"}</span>
                </div>
              ))}
              <div className="mt-2 flex items-center justify-between border-t pt-2 text-xs font-medium">
                <span>Total records</span>
                <span className="tabular-nums">{data.total.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No data found for this account</p>
          )}
        </div>
      )}
    </div>
  );
}

function PurgeConfirmDialog({
  req,
  purging,
  onConfirm,
}: {
  req: DeletionRequest;
  purging: boolean;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="destructive" size="sm" disabled={purging}>
            {purging ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-3.5 w-3.5" />
            )}
            Permanent delete
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Permanently delete account?</DialogTitle>
          <DialogDescription>
            This will permanently delete <strong>{req.email}</strong>&apos;s
            account, organization, all orders, products, channels, and analytics
            data. This action <strong>cannot be undone</strong>.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose
            render={
              <Button variant="outline">
                Cancel
              </Button>
            }
          />
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
            disabled={purging}
          >
            {purging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Yes, permanently delete everything
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
