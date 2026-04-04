"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  RefreshCw,
  Play,
  Pause,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface ChannelSync {
  id: string;
  name: string;
  platform: string;
  status: string;
  last_sync_at: string | null;
  last_sync_status: string | null;
}

interface SyncJob {
  id: string;
  channel_id: string;
  type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  records_synced: number | null;
  error: string | null;
}

interface CronJobStatus {
  jobid: number;
  schedule: string;
  active: boolean;
  last_run: string | null;
  last_status: string | null;
}

interface CronData {
  channels: ChannelSync[];
  recentJobs: SyncJob[];
  totalJobs: number;
  page: number;
  pageSize: number;
  cronJob: CronJobStatus | null;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function durationStr(start: string, end: string | null): string {
  if (!end) return "Running…";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function highlightMatch(text: string, query: string): ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-yellow-200/70 px-0.5 dark:bg-yellow-500/30">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function CronDashboardClient() {
  const [data, setData] = useState<CronData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fetching, setFetching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchData = useCallback(
    async (p = page, s = search, sf = statusFilter) => {
      setFetching(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(p));
        if (s) params.set("search", s);
        if (sf && sf !== "all") params.set("status", sf);

        const res = await fetch(`/api/admin/cron?${params}`);
        if (res.ok) setData(await res.json());
      } catch {
        /* ignore */
      } finally {
        setFetching(false);
        setLoading(false);
      }
    },
    [page, search, statusFilter]
  );

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchDraft);
      setPage(1);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchDraft]);

  function clearSearch() {
    setSearchDraft("");
    setSearch("");
    setPage(1);
  }

  async function handleAction(action: string, label: string) {
    setActionLoading(action);
    try {
      const res = await fetch("/api/admin/cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();
      toast.success(label);
      setTimeout(() => fetchData(), 2000);
    } catch {
      toast.error(`Failed to ${action}`);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const cronJob = data?.cronJob;
  const channels = data?.channels ?? [];
  const recentJobs = data?.recentJobs ?? [];
  const totalJobs = data?.totalJobs ?? 0;
  const pageSize = data?.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(totalJobs / pageSize));
  const channelMap = new Map(channels.map((c) => [c.id, c]));
  const hasSearchActive = searchDraft.trim().length > 0;
  const hasFilters = hasSearchActive || statusFilter !== "all";
  const searchTypingPending = searchDraft !== search;
  const showSearchLoader = searchTypingPending || fetching;

  return (
    <>
      {/* Cron Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-blue-500" />
              <CardTitle className="text-base">Cron Scheduler</CardTitle>
              {cronJob && (
                <Badge
                  variant="outline"
                  className={
                    cronJob.active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }
                >
                  {cronJob.active ? "Active" : "Paused"}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleAction(
                    "trigger_now",
                    "Sync triggered for all active channels"
                  )
                }
                disabled={!!actionLoading}
              >
                {actionLoading === "trigger_now" ? (
                  <Loader2 className="mr-1 size-3 animate-spin" />
                ) : (
                  <Zap className="mr-1 size-3" />
                )}
                Sync All Now
              </Button>
              {cronJob?.active ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction("pause", "Cron job paused")}
                  disabled={!!actionLoading}
                >
                  {actionLoading === "pause" ? (
                    <Loader2 className="mr-1 size-3 animate-spin" />
                  ) : (
                    <Pause className="mr-1 size-3" />
                  )}
                  Pause
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction("resume", "Cron job resumed")}
                  disabled={!!actionLoading}
                >
                  {actionLoading === "resume" ? (
                    <Loader2 className="mr-1 size-3 animate-spin" />
                  ) : (
                    <Play className="mr-1 size-3" />
                  )}
                  Resume
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => fetchData()}
              >
                <RefreshCw className="size-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                Schedule
              </p>
              <p className="text-sm font-semibold mt-0.5 font-mono">
                {cronJob?.schedule ?? "—"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Every 15 minutes
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                Last Run
              </p>
              <p className="text-sm font-semibold mt-0.5">
                {timeAgo(cronJob?.last_run ?? null)}
              </p>
              {cronJob?.last_run && (
                <p className="text-[11px] text-muted-foreground">
                  {new Date(cronJob.last_run).toLocaleString()}
                </p>
              )}
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                Last Status
              </p>
              <p className="text-sm font-semibold mt-0.5 flex items-center gap-1.5">
                {cronJob?.last_status === "succeeded" ? (
                  <>
                    <CheckCircle2 className="size-3.5 text-emerald-500" />{" "}
                    Succeeded
                  </>
                ) : cronJob?.last_status === "failed" ? (
                  <>
                    <XCircle className="size-3.5 text-red-500" /> Failed
                  </>
                ) : (
                  cronJob?.last_status ?? "—"
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Channel Sync Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Channel Sync Status</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {channels.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No active channels
              </p>
            )}
            {channels.map((ch) => (
              <div
                key={ch.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono w-16 justify-center"
                  >
                    {ch.platform}
                  </Badge>
                  <span className="text-sm font-medium">{ch.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(ch.last_sync_at)}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      ch.status === "active"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : ch.status === "syncing"
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : ch.status === "error"
                            ? "border-red-200 bg-red-50 text-red-700"
                            : ""
                    }
                  >
                    {ch.status === "syncing" && (
                      <Loader2 className="mr-1 size-2.5 animate-spin" />
                    )}
                    {ch.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sync Jobs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Sync Jobs</CardTitle>
              <Badge variant="outline" className="text-[10px]">
                {totalJobs.toLocaleString()} total
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search + filters */}
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="relative w-full">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                placeholder="Search channel, platform, or error…"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                className="h-10 w-full pl-10 pr-16 text-sm shadow-none"
                autoComplete="off"
              />
              <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                {hasSearchActive && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={clearSearch}
                  >
                    <X className="size-3.5" />
                  </Button>
                )}
                {showSearchLoader && (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-[140px] text-sm shadow-none">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 text-xs"
                  onClick={() => {
                    clearSearch();
                    setStatusFilter("all");
                  }}
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Jobs list */}
          <div className="rounded-lg border divide-y">
            {recentJobs.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">
                {hasFilters
                  ? "No jobs match your filters"
                  : "No sync jobs yet"}
              </p>
            )}
            {recentJobs.map((job) => {
              const channel = channelMap.get(job.channel_id);
              const channelName =
                channel?.name ?? job.channel_id.slice(0, 8);
              const platform = channel?.platform ?? "";

              return (
                <div
                  key={job.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {job.status === "completed" ? (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                    ) : job.status === "failed" ? (
                      <XCircle className="size-4 shrink-0 text-red-500" />
                    ) : job.status === "running" ? (
                      <Loader2 className="size-4 shrink-0 text-blue-500 animate-spin" />
                    ) : (
                      <AlertTriangle className="size-4 shrink-0 text-amber-500" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {highlightMatch(channelName, search)}
                        </p>
                        {platform && (
                          <Badge
                            variant="outline"
                            className="text-[9px] font-mono shrink-0"
                          >
                            {highlightMatch(platform, search)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(job.started_at).toLocaleString()}
                        {" · "}
                        {durationStr(job.started_at, job.completed_at)}
                        {job.records_synced != null &&
                          ` · ${job.records_synced} records`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge
                      variant="outline"
                      className={
                        job.status === "completed"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px]"
                          : job.status === "failed"
                            ? "border-red-200 bg-red-50 text-red-700 text-[10px]"
                            : job.status === "running"
                              ? "border-blue-200 bg-blue-50 text-blue-700 text-[10px]"
                              : "text-[10px]"
                      }
                    >
                      {job.status}
                    </Badge>
                    {job.error && (
                      <p
                        className="mt-0.5 max-w-[220px] truncate text-[10px] text-red-500"
                        title={job.error}
                      >
                        {highlightMatch(job.error, search)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages} · {totalJobs.toLocaleString()}{" "}
                jobs
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
