"use client";

import { useCallback, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useDebouncedUrlSearch, useSyncEffectivePage } from "@/hooks/use-debounced-url-search";
import { format, parseISO } from "date-fns";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CHANNEL_CONFIG } from "@/lib/constants";
import { parseTableDateRangeSearchParams, isTableDateRangeActive } from "@/lib/table-date-range";
import type { AdminUser } from "@/types/admin";
import type { Platform } from "@/types";

function searchParamsToRecord(sp: URLSearchParams): Record<string, string> {
  const r: Record<string, string> = {};
  sp.forEach((v, k) => {
    if (!(k in r)) r[k] = v;
  });
  return r;
}

function normalizeAdminUsersQuery(pathname: string, cur: URLSearchParams): string {
  const n = new URLSearchParams(cur.toString());
  if (!n.get("search")) n.delete("search");
  if (!n.get("page") || n.get("page") === "1") n.delete("page");
  if (!n.get("status") || n.get("status") === "all") n.delete("status");
  if (!n.get("channel") || n.get("channel") === "all") n.delete("channel");
  if (!n.get("plan") || n.get("plan") === "all") n.delete("plan");
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

interface Props {
  users: AdminUser[];
  total: number;
  effectivePage: number;
  requestedPage: number;
}

export function AdminUsersClient({ users, total, effectivePage, requestedPage }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const searchFromUrl = searchParams.get("search") ?? "";
  const [searchDraft, setSearchDraft] = useState(searchFromUrl);

  useEffect(() => {
    setSearchDraft(searchFromUrl);
  }, [searchFromUrl]);

  useDebouncedUrlSearch(
    searchDraft,
    searchFromUrl,
    pathname,
    searchParams,
    router,
    normalizeAdminUsersQuery,
    400,
    startTransition
  );
  useSyncEffectivePage(
    effectivePage,
    requestedPage,
    pathname,
    searchParams,
    router,
    normalizeAdminUsersQuery,
    startTransition
  );

  const replaceQuery = useCallback(
    (mutate: (n: URLSearchParams) => void) => {
      const n = new URLSearchParams(searchParams.toString());
      mutate(n);
      startTransition(() => {
        router.replace(normalizeAdminUsersQuery(pathname, n), { scroll: false });
      });
    },
    [pathname, router, searchParams, startTransition]
  );

  const statusFromUrl = searchParams.get("status") ?? "all";
  const channelFromUrl = searchParams.get("channel") ?? "all";
  const planFromUrl = searchParams.get("plan") ?? "all";
  const pageFromUrl = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const totalPages = Math.max(1, Math.ceil(total / 25));
  const safePage = Math.min(pageFromUrl, totalPages);

  const searchTypingPending = searchDraft !== searchFromUrl;
  const showSearchLoader = searchTypingPending || (isPending && searchFromUrl.trim().length > 0);

  function highlightMatch(text: string): ReactNode {
    const q = searchFromUrl.trim();
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="rounded-sm bg-amber-200 px-0.5 text-inherit dark:bg-amber-800/90">
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  }

  const tableDateParsed = useMemo(
    () => parseTableDateRangeSearchParams(searchParamsToRecord(searchParams)),
    [searchParams]
  );
  const hasSearchActive = searchDraft.trim().length > 0 || searchFromUrl.length > 0;
  const hasFilterParams =
    isTableDateRangeActive(tableDateParsed) ||
    statusFromUrl !== "all" ||
    channelFromUrl !== "all" ||
    planFromUrl !== "all";

  function clearSearch() {
    setSearchDraft("");
    replaceQuery((n) => {
      n.delete("search");
      n.set("page", "1");
    });
  }

  function clearFilterParams() {
    replaceQuery((n) => {
      n.delete("page");
      n.delete("status");
      n.delete("channel");
      n.delete("plan");
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
          <CardTitle className="text-base">Search users</CardTitle>
          <CardDescription>Type an email or name. Results update after you pause typing.</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-4">
          <div className="relative w-full">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 z-10 size-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              placeholder="Email or display name…"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              className="h-12 w-full min-w-0 pl-11 pr-[4.5rem] text-base shadow-none sm:pr-24"
              autoComplete="off"
            />
            <div className="pointer-events-auto absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
              {hasSearchActive ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => clearSearch()}
                  aria-label="Clear search"
                >
                  <X className="size-5" />
                </Button>
              ) : null}
              {showSearchLoader ? (
                <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" aria-label="Searching" />
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Filters</CardTitle>
              <CardDescription>Joined date, status, channels, and plan.</CardDescription>
            </div>
            {hasFilterParams ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 w-fit shrink-0"
                onClick={clearFilterParams}
              >
                <X className="mr-1.5 size-4" />
                Reset filters
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <TableDateRangeFilter
              label="Joined"
              searchParams={searchParams}
              replaceQuery={replaceQuery}
              allowAllTime
              className="w-full max-w-none sm:col-span-2 lg:col-span-1"
            />
            <div className="w-full space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Status</span>
              <Select
                value={statusFromUrl}
                onValueChange={(v) =>
                  replaceQuery((n) => {
                    n.set("status", v ?? "all");
                    n.set("page", "1");
                  })
                }
              >
                <SelectTrigger className="h-9 w-full font-normal shadow-none">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="banned">Banned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Channels</span>
              <Select
                value={channelFromUrl}
                onValueChange={(v) =>
                  replaceQuery((n) => {
                    n.set("channel", v ?? "all");
                    n.set("page", "1");
                  })
                }
              >
                <SelectTrigger className="h-9 w-full font-normal shadow-none">
                  <SelectValue placeholder="Channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="connected">Connected</SelectItem>
                  <SelectItem value="not_connected">Not Connected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Plan</span>
              <Select
                value={planFromUrl}
                onValueChange={(v) =>
                  replaceQuery((n) => {
                    n.set("plan", v ?? "all");
                    n.set("page", "1");
                  })
                }
              >
                <SelectTrigger className="h-9 w-full font-normal shadow-none">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="scale">Scale</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasSearchActive && hasFilterParams ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Search and filters combine. Use the <span className="font-medium text-foreground">×</span> above to clear
              search only, or <span className="font-medium text-foreground">Reset filters</span> to clear date and
              dropdowns.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="border-b p-4">
            <p className="text-sm font-medium">
              Users ({total}
              {total !== users.length ? ` · showing ${users.length}` : ""})
            </p>
          </div>
          <ResultPendingShell pending={isPending} label="Loading users…">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Channels</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{highlightMatch(user.email)}</TableCell>
                      <TableCell>{user.full_name ? highlightMatch(user.full_name) : "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={user.status === "active" ? "default" : "destructive"}
                          className={
                            user.status === "active"
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                              : ""
                          }
                        >
                          {user.status === "active" ? "Active" : "Banned"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.channels.length === 0 ? (
                          <span className="text-xs text-muted-foreground">None</span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {user.channels.map((ch, i) => {
                              const config = CHANNEL_CONFIG[ch.platform as Platform];
                              return (
                                <span
                                  key={`${ch.platform}-${i}`}
                                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
                                  title={ch.name}
                                >
                                  <span
                                    className="size-1.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: config?.color ?? "#6B7280" }}
                                  />
                                  {config?.label ?? ch.platform}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(parseISO(user.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => router.push(`/admin/users/${user.id}`)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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
