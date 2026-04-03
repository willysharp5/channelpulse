"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useDebouncedUrlSearch, useSyncEffectivePage } from "@/hooks/use-debounced-url-search";
import { format, parseISO } from "date-fns";
import { Search, X, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAuditDetails, formatAuditActionFilterLabel } from "@/lib/admin/audit-log-format";
import { Input } from "@/components/ui/input";
import { ResultPendingShell } from "@/components/ui/result-pending-shell";
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
import { TableDateRangeFilter } from "@/components/layout/table-date-range-filter";
import { parseTableDateRangeSearchParams, isTableDateRangeActive } from "@/lib/table-date-range";
import type { AuditLogEntry } from "@/types/admin";

function searchParamsToRecord(sp: URLSearchParams): Record<string, string> {
  const r: Record<string, string> = {};
  sp.forEach((v, k) => {
    if (!(k in r)) r[k] = v;
  });
  return r;
}

function normalizeAuditQuery(pathname: string, cur: URLSearchParams): string {
  const n = new URLSearchParams(cur.toString());
  if (!n.get("search")) n.delete("search");
  if (!n.get("details")) n.delete("details");
  if (!n.get("page") || n.get("page") === "1") n.delete("page");
  if (!n.get("action") || n.get("action") === "all") n.delete("action");
  const parsed = parseTableDateRangeSearchParams(searchParamsToRecord(n));
  if (!isTableDateRangeActive(parsed)) {
    n.delete("range");
    n.delete("from");
    n.delete("to");
    n.delete("date");
  }
  const qs = n.toString();
  return `${pathname}${qs ? `?${qs}` : ""}`;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  impersonate_start: { label: "Impersonated", color: "bg-blue-100 text-blue-800" },
  impersonate_end: { label: "Impersonate End", color: "bg-slate-100 text-slate-800" },
  ban_user: { label: "Ban User", color: "bg-red-100 text-red-800" },
  unban_user: { label: "Unban User", color: "bg-emerald-100 text-emerald-800" },
  change_plan: { label: "Change Plan", color: "bg-amber-100 text-amber-800" },
  update_plan: { label: "Update Plan", color: "bg-amber-100 text-amber-800" },
  manual_sync: { label: "Manual Sync", color: "bg-zinc-100 text-zinc-800" },
  dashboard_tour_flag: { label: "Dashboard Tour", color: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200" },
};

function asAuditDetails(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return {};
}

function highlightQuery(text: string, q: string): ReactNode {
  const trim = q.trim();
  if (!trim) return text;
  const lower = text.toLowerCase();
  const qi = lower.indexOf(trim.toLowerCase());
  if (qi === -1) return text;
  return (
    <>
      {text.slice(0, qi)}
      <mark className="rounded-sm bg-amber-200 px-0.5 text-inherit dark:bg-amber-800/90">
        {text.slice(qi, qi + trim.length)}
      </mark>
      {text.slice(qi + trim.length)}
    </>
  );
}

interface Props {
  entries: AuditLogEntry[];
  currentPage: number;
  totalPages: number;
  total: number;
  effectivePage: number;
}

export function AuditLogClient({
  entries,
  currentPage,
  totalPages,
  total,
  effectivePage,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const searchFromUrl = searchParams.get("search") ?? "";
  const detailsFromUrl = searchParams.get("details") ?? "";
  const [searchDraft, setSearchDraft] = useState(searchFromUrl);
  const [detailsDraft, setDetailsDraft] = useState(detailsFromUrl);

  useEffect(() => {
    setSearchDraft(searchFromUrl);
  }, [searchFromUrl]);
  useEffect(() => {
    setDetailsDraft(detailsFromUrl);
  }, [detailsFromUrl]);

  useDebouncedUrlSearch(
    searchDraft,
    searchFromUrl,
    pathname,
    searchParams,
    router,
    normalizeAuditQuery,
    400,
    startTransition
  );
  useSyncEffectivePage(
    effectivePage,
    currentPage,
    pathname,
    searchParams,
    router,
    normalizeAuditQuery,
    startTransition
  );

  const latestRef = useRef({ router, pathname, sp: searchParams.toString() });
  latestRef.current = { router, pathname, sp: searchParams.toString() };

  useEffect(() => {
    if (detailsDraft === detailsFromUrl) return;
    const t = setTimeout(() => {
      const { router: r, pathname: p, sp } = latestRef.current;
      const n = new URLSearchParams(sp);
      if (detailsDraft.trim()) n.set("details", detailsDraft.trim());
      else n.delete("details");
      n.set("page", "1");
      startTransition(() => {
        r.replace(normalizeAuditQuery(p, n), { scroll: false });
      });
    }, 400);
    return () => clearTimeout(t);
  }, [detailsDraft, detailsFromUrl, startTransition]);

  const replaceQuery = useCallback(
    (mutate: (n: URLSearchParams) => void) => {
      const n = new URLSearchParams(searchParams.toString());
      mutate(n);
      startTransition(() => {
        router.replace(normalizeAuditQuery(pathname, n), { scroll: false });
      });
    },
    [pathname, router, searchParams, startTransition]
  );

  const actionFromUrl = searchParams.get("action") ?? "all";
  const pageFromUrl = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const safePage = Math.min(pageFromUrl, totalPages);

  const tableDateParsed = useMemo(
    () => parseTableDateRangeSearchParams(searchParamsToRecord(searchParams)),
    [searchParams]
  );
  const hasEmailSearch = searchDraft.trim().length > 0 || searchFromUrl.length > 0;
  const hasDetailsSearch = detailsDraft.trim().length > 0 || detailsFromUrl.length > 0;
  const hasFilterParams =
    isTableDateRangeActive(tableDateParsed) || actionFromUrl !== "all";

  const searchTypingPending = searchDraft !== searchFromUrl;
  const detailsTypingPending = detailsDraft !== detailsFromUrl;
  const showEmailSearchLoader = searchTypingPending || (isPending && searchFromUrl.trim().length > 0);
  const showDetailsSearchLoader = detailsTypingPending || (isPending && detailsFromUrl.trim().length > 0);

  function clearEmailSearch() {
    setSearchDraft("");
    replaceQuery((n) => {
      n.delete("search");
      n.set("page", "1");
    });
  }

  function clearDetailsSearch() {
    setDetailsDraft("");
    replaceQuery((n) => {
      n.delete("details");
      n.set("page", "1");
    });
  }

  function clearFilterParams() {
    replaceQuery((n) => {
      n.delete("page");
      n.delete("action");
      n.delete("range");
      n.delete("from");
      n.delete("to");
      n.delete("date");
    });
  }

  return (
    <>
      <Card>
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="text-base">Search</CardTitle>
          <CardDescription>Filter rows by admin or target email, and by words that appear in the details column.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 px-4 pb-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="audit-search-email">
              Admin or target email
            </label>
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="audit-search-email"
                placeholder="Email address…"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                className="h-12 w-full min-w-0 pl-11 pr-[4.5rem] text-base shadow-none sm:pr-24"
                autoComplete="off"
              />
              <div className="pointer-events-auto absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                {hasEmailSearch ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => clearEmailSearch()}
                    aria-label="Clear email search"
                  >
                    <X className="size-5" />
                  </Button>
                ) : null}
                {showEmailSearchLoader ? (
                  <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" aria-label="Searching" />
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="audit-search-details">
              Details
            </label>
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-5 -translate-y-1/2 text-muted-foreground opacity-70" aria-hidden />
              <Input
                id="audit-search-details"
                placeholder="e.g. plan name, reset, reason…"
                value={detailsDraft}
                onChange={(e) => setDetailsDraft(e.target.value)}
                className="h-12 w-full min-w-0 pl-11 pr-[4.5rem] text-base shadow-none sm:pr-24"
                autoComplete="off"
              />
              <div className="pointer-events-auto absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                {hasDetailsSearch ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => clearDetailsSearch()}
                    aria-label="Clear details search"
                  >
                    <X className="size-5" />
                  </Button>
                ) : null}
                {showDetailsSearchLoader ? (
                  <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" aria-label="Searching" />
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Filters</CardTitle>
              <CardDescription>Time range and action type.</CardDescription>
            </div>
            {hasFilterParams ? (
              <Button type="button" variant="outline" size="sm" className="h-9 w-fit shrink-0" onClick={clearFilterParams}>
                <X className="mr-1.5 size-4" />
                Reset filters
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
            <TableDateRangeFilter
              label="Timestamp"
              searchParams={searchParams}
              replaceQuery={replaceQuery}
              allowAllTime
              className="w-full max-w-none"
            />
            <div className="w-full space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Action</span>
              <Select
                value={actionFromUrl}
                onValueChange={(v) =>
                  replaceQuery((n) => {
                    n.set("action", v ?? "all");
                    n.set("page", "1");
                  })
                }
              >
                <SelectTrigger className="h-9 w-full font-normal shadow-none">
                  <SelectValue placeholder="All Actions">
                    {(value) => formatAuditActionFilterLabel(value as string | null | undefined)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="impersonate_start">Impersonated</SelectItem>
                  <SelectItem value="impersonate_end">Impersonate End</SelectItem>
                  <SelectItem value="ban_user">Ban User</SelectItem>
                  <SelectItem value="unban_user">Unban User</SelectItem>
                  <SelectItem value="change_plan">Change Plan</SelectItem>
                  <SelectItem value="update_plan">Update Plan</SelectItem>
                  <SelectItem value="manual_sync">Manual Sync</SelectItem>
                  <SelectItem value="dashboard_tour_flag">Dashboard Tour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasEmailSearch && hasFilterParams ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Email search and filters combine. Use <span className="font-medium text-foreground">×</span> on each search field to clear it only.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="border-b p-4">
            <p className="text-sm font-medium">Events ({total})</p>
          </div>
          <ResultPendingShell pending={isPending} label="Loading audit log…">
            {entries.length === 0 ? (
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
                  {entries.map((entry) => {
                    const actionInfo = ACTION_LABELS[entry.action] ?? {
                      label: formatAuditActionFilterLabel(entry.action),
                      color: "bg-zinc-100 text-zinc-800",
                    };
                    const adminDisplay = entry.admin_email ?? entry.admin_id.slice(0, 8);
                    const targetDisplay = entry.target_email ?? (entry.target_user_id ? entry.target_user_id.slice(0, 8) : "—");
                    const detailsText = formatAuditDetails(entry.action, asAuditDetails(entry.details));
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {format(parseISO(entry.created_at), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${actionInfo.color} hover:${actionInfo.color}`}>{actionInfo.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{highlightQuery(adminDisplay, searchFromUrl)}</TableCell>
                        <TableCell className="text-sm">{highlightQuery(targetDisplay, searchFromUrl)}</TableCell>
                        <TableCell className="max-w-[280px] text-xs text-muted-foreground">
                          {highlightQuery(detailsText, detailsFromUrl)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ResultPendingShell>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t p-4">
              <p className="text-xs text-muted-foreground">
                Page {safePage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1 || isPending}
                  onClick={() => replaceQuery((n) => n.set("page", String(safePage - 1)))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages || isPending}
                  onClick={() => replaceQuery((n) => n.set("page", String(safePage + 1)))}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
