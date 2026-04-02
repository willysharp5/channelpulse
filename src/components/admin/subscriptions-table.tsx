"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Button } from "@/components/ui/button";
import type { Subscription } from "@/types/admin";

interface Props {
  subscriptions: Subscription[];
  initialSearch?: string;
  initialStatus?: string;
  initialPlan?: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  cancelled: "bg-zinc-100 text-zinc-800 hover:bg-zinc-100",
  past_due: "bg-red-100 text-red-800 hover:bg-red-100",
  trialing: "bg-blue-100 text-blue-800 hover:bg-blue-100",
};

export function SubscriptionsClient({
  subscriptions,
  initialSearch,
  initialStatus,
  initialPlan,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch ?? "");

  function applyFilters(overrides: Record<string, string | null> = {}) {
    const params = new URLSearchParams();
    const s = overrides.search ?? search;
    const st = overrides.status ?? initialStatus;
    const pl = overrides.plan ?? initialPlan;
    if (s) params.set("search", s);
    if (st && st !== "all") params.set("status", st);
    if (pl && pl !== "all") params.set("plan", pl);
    router.push(`/admin/subscriptions?${params.toString()}`);
  }

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <form
              className="flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                applyFilters();
              }}
            >
              <Input
                placeholder="Search by email, name, or Stripe ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>
            <Select
              defaultValue={initialStatus ?? "all"}
              onValueChange={(v) => applyFilters({ status: v })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
                <SelectItem value="trialing">Trialing</SelectItem>
              </SelectContent>
            </Select>
            <Select
              defaultValue={initialPlan ?? "all"}
              onValueChange={(v) => applyFilters({ plan: v })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
                <SelectItem value="scale">Scale</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <p className="text-sm font-medium">
              Subscriptions ({subscriptions.length})
            </p>
          </div>
          {subscriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">No subscriptions found</p>
              <p className="text-xs">Try adjusting your filters</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{sub.user_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {sub.user_email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {sub.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="default"
                        className={STATUS_COLORS[sub.status] ?? ""}
                      >
                        {sub.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      ${(sub.amount / 100).toFixed(2)}/mo
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(parseISO(sub.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/admin/users/${sub.user_id}`)
                        }
                      >
                        View User
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
