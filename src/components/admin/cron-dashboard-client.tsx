"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  Store,
  Archive,
  Eye,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ImportJobDetailSheet } from "@/components/admin/import-job-detail-sheet";
import { TremorDateTimePicker } from "@/components/tremor/datetime-picker";
import {
  SUPABASE_DASHBOARD_CRON_JOBS,
  SUPABASE_DASHBOARD_SQL_EDITOR_TABLE,
} from "@/lib/supabase-dashboard-links";
import { cn } from "@/lib/utils";

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

interface CronJobAdminRow {
  job_name: string;
  jobid: number;
  schedule: string;
  active: boolean;
  command: string;
  last_run: string | null;
  last_status: string | null;
}

interface CronData {
  channels: ChannelSync[];
  recentJobs: SyncJob[];
  totalJobs: number;
  page: number;
  pageSize: number;
  cronJobs: CronJobAdminRow[];
}

interface AdminImportJobRow {
  id: string;
  org_id: string;
  channel_id: string;
  user_id: string | null;
  user_email: string | null;
  user_full_name: string | null;
  import_type: string;
  status: string;
  imported_count: number;
  skipped_count: number;
  inserted_new_count?: number;
  updated_existing_count?: number;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  channel_name: string | null;
  channel_platform: string | null;
  outcome_summary?: string | null;
}

interface ImportJobsApiResponse {
  jobs: AdminImportJobRow[];
  total: number;
  page: number;
  pageSize: number;
}

const CRON_TITLES: Record<string, string> = {
  "sync-all-channels": "Channel sync (all stores)",
  "purge_import_jobs_retention": "Import jobs retention",
};

const TAB_CHANNEL = "channel-sync";
const TAB_RETENTION = "import-retention";

/** URL query key so the Sync & Cron top tab survives refresh and shareable links work. */
const SYNC_TAB_QUERY = "syncTab";

function mainTabFromSearchParams(searchParams: URLSearchParams): string {
  const v = searchParams.get(SYNC_TAB_QUERY);
  if (v === TAB_RETENTION) return TAB_RETENTION;
  return TAB_CHANNEL;
}

function cronTitle(name: string): string {
  return CRON_TITLES[name] ?? name;
}

function cronScheduleHint(name: string): string {
  if (name === "sync-all-channels") return "Every 15 minutes";
  if (name === "purge_import_jobs_retention") {
    return "Daily at 06:00 UTC — deletes import_jobs rows with created_at older than 3 days";
  }
  return "";
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

function shortId(id: string, keep = 8): string {
  if (id.length <= keep) return id;
  return `${id.slice(0, keep)}…`;
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  /** Top-level tab — driven by `?syncTab=` so it survives refresh. */
  const mainTab = useMemo(
    () => mainTabFromSearchParams(searchParams),
    [searchParams],
  );
  const setMainTab = useCallback(
    (next: string) => {
      if (next !== TAB_CHANNEL && next !== TAB_RETENTION) return;
      const params = new URLSearchParams(searchParams.toString());
      if (next === TAB_CHANNEL) {
        params.delete(SYNC_TAB_QUERY);
      } else {
        params.set(SYNC_TAB_QUERY, next);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const [importJobsData, setImportJobsData] = useState<ImportJobsApiResponse | null>(null);
  const [importPage, setImportPage] = useState(1);
  const [importSearchDraft, setImportSearchDraft] = useState("");
  const [importSearch, setImportSearch] = useState("");
  const [importStatusFilter, setImportStatusFilter] = useState("all");
  const [importTypeFilter, setImportTypeFilter] = useState("all");
  const [importFetching, setImportFetching] = useState(false);
  const importDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [importDetailJobId, setImportDetailJobId] = useState<string | null>(null);
  const [importDetailOutcomePrefetch, setImportDetailOutcomePrefetch] = useState<string | null>(null);
  const [importPurgeOpen, setImportPurgeOpen] = useState(false);
  const [purgeLoading, setPurgeLoading] = useState(false);
  /** Cutoff for “delete from this time onward” (local date/time from Tremor-style picker). */
  const [importCleanupSince, setImportCleanupSince] = useState<Date | undefined>(undefined);
  const [retentionCronRefreshing, setRetentionCronRefreshing] = useState(false);

  const fetchData = useCallback(
    async (
      p = page,
      s = search,
      sf = statusFilter,
      opts?: { quiet?: boolean }
    ) => {
      setFetching(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(p));
        if (s) params.set("search", s);
        if (sf && sf !== "all") params.set("status", sf);

        const res = await fetch(`/api/admin/cron?${params}`);
        if (res.ok) {
          setData(await res.json());
        } else if (!opts?.quiet) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          toast.error(j.error ?? "Could not refresh scheduler / cron data");
        }
      } catch {
        if (!opts?.quiet) {
          toast.error("Could not refresh scheduler / cron data");
        }
      } finally {
        setFetching(false);
        setLoading(false);
      }
    },
    [page, search, statusFilter]
  );

  const fetchImportJobs = useCallback(
    async (
      p = importPage,
      s = importSearch,
      st = importStatusFilter,
      it = importTypeFilter
    ) => {
      setImportFetching(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(p));
        if (s) params.set("search", s);
        if (st && st !== "all") params.set("status", st);
        if (it && it !== "all") params.set("import_type", it);
        const res = await fetch(`/api/admin/import-jobs?${params}`);
        if (res.ok) {
          setImportJobsData(await res.json());
        } else {
          toast.error("Could not load import jobs");
          setImportJobsData({ jobs: [], total: 0, page: 1, pageSize: 20 });
        }
      } catch {
        toast.error("Could not load import jobs");
        setImportJobsData({ jobs: [], total: 0, page: 1, pageSize: 20 });
      } finally {
        setImportFetching(false);
      }
    },
    [importPage, importSearch, importStatusFilter, importTypeFilter]
  );

  useEffect(() => {
    void fetchData(page, search, statusFilter, { quiet: true });
    const interval = setInterval(
      () => void fetchData(page, search, statusFilter, { quiet: true }),
      30000
    );
    return () => clearInterval(interval);
  }, [fetchData, page, search, statusFilter]);

  useEffect(() => {
    if (mainTab !== TAB_RETENTION) return;
    void fetchImportJobs();
    const interval = setInterval(() => void fetchImportJobs(), 30000);
    return () => clearInterval(interval);
  }, [mainTab, fetchImportJobs]);

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

  useEffect(() => {
    if (importDebounceRef.current) clearTimeout(importDebounceRef.current);
    importDebounceRef.current = setTimeout(() => {
      setImportSearch(importSearchDraft);
      setImportPage(1);
    }, 400);
    return () => {
      if (importDebounceRef.current) clearTimeout(importDebounceRef.current);
    };
  }, [importSearchDraft]);

  function clearSearch() {
    setSearchDraft("");
    setSearch("");
    setPage(1);
  }

  function clearImportSearch() {
    setImportSearchDraft("");
    setImportSearch("");
    setImportPage(1);
  }

  async function runImportCleanup(mode: "all" | "since", opts?: { sinceIso?: string }) {
    setPurgeLoading(true);
    try {
      const payload =
        mode === "all"
          ? { mode: "all" as const }
          : { mode: "since" as const, since: opts?.sinceIso ?? "" };
      const res = await fetch("/api/admin/import-jobs/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = (await res.json()) as {
        deleted?: number;
        error?: string;
        since?: string;
      };
      if (!res.ok) {
        toast.error(j.error ?? "Cleanup failed");
        return;
      }
      const n = j.deleted ?? 0;
      toast.success(
        mode === "since"
          ? `Removed ${n} row${n === 1 ? "" : "s"} with created_at on or after your chosen time`
          : `Deleted all ${n} import job row${n === 1 ? "" : "s"}`
      );
      setImportPurgeOpen(false);
      void fetchImportJobs();
      void fetchData();
    } catch {
      toast.error("Cleanup failed");
    } finally {
      setPurgeLoading(false);
    }
  }

  function runImportCleanupSinceFromPicker() {
    if (!importCleanupSince || !Number.isFinite(importCleanupSince.getTime())) {
      toast.error("Pick a date and time first");
      return;
    }
    void runImportCleanup("since", {
      sinceIso: importCleanupSince.toISOString(),
    });
  }

  async function handleCronAction(
    action: "pause" | "resume" | "trigger_now",
    successMessage: string,
    jobName?: string,
  ) {
    const triggerTarget = jobName ?? "sync-all-channels";
    const loadingKey =
      action === "trigger_now"
        ? `trigger_now:${triggerTarget}`
        : `${action}:${jobName ?? "sync-all-channels"}`;
    setActionLoading(loadingKey);
    try {
      const body =
        action === "trigger_now"
          ? { action, jobName: triggerTarget }
          : { action, jobName: jobName ?? "sync-all-channels" };
      const res = await fetch("/api/admin/cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok) {
        toast.error(j.error ?? `Failed to ${action}`);
        return;
      }
      const msg =
        typeof j.message === "string" && j.message.trim()
          ? j.message
          : successMessage.trim() || "Done";
      toast.success(msg, { duration: 5_000 });
      setTimeout(() => {
        void fetchData();
        void fetchImportJobs();
      }, 2000);
    } catch {
      toast.error(`Failed to ${action}`);
    } finally {
      setActionLoading(null);
    }
  }

  function renderCronJobPanel(
    job: CronJobAdminRow | undefined,
    emptyMessage: string
  ): ReactNode {
    if (!job) {
      return (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      );
    }
    const pauseKey = `pause:${job.job_name}`;
    const resumeKey = `resume:${job.job_name}`;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge
            variant="outline"
            className={
              job.active
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
            }
          >
            {job.active ? "Scheduled" : "Inactive"}
          </Badge>
          <div className="flex flex-wrap items-center gap-2">
            {job.job_name === "sync-all-channels" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleCronAction(
                    "trigger_now",
                    "Sync triggered for all active channels",
                    "sync-all-channels",
                  )
                }
                disabled={!!actionLoading}
              >
                {actionLoading === "trigger_now:sync-all-channels" ? (
                  <Loader2 className="mr-1 size-3 animate-spin" />
                ) : (
                  <Zap className="mr-1 size-3" />
                )}
                Sync All Now
              </Button>
            )}
            {job.active ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleCronAction(
                    "pause",
                    `${cronTitle(job.job_name)} paused`,
                    job.job_name
                  )
                }
                disabled={!!actionLoading}
              >
                {actionLoading === pauseKey ? (
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
                onClick={() =>
                  handleCronAction(
                    "resume",
                    `${cronTitle(job.job_name)} scheduled`,
                    job.job_name
                  )
                }
                disabled={!!actionLoading}
              >
                {actionLoading === resumeKey ? (
                  <Loader2 className="mr-1 size-3 animate-spin" />
                ) : (
                  <Play className="mr-1 size-3" />
                )}
                Resume
              </Button>
            )}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Schedule
            </p>
            <p className="mt-0.5 font-mono text-sm font-semibold">
              {job.schedule || "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {cronScheduleHint(job.job_name)}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Last run
            </p>
            <p className="mt-0.5 text-sm font-semibold">
              {timeAgo(job.last_run)}
            </p>
            {job.last_run && (
              <p className="text-[11px] text-muted-foreground">
                {new Date(job.last_run).toLocaleString()}
              </p>
            )}
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Last status
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold">
              {job.last_status === "succeeded" ? (
                <>
                  <CheckCircle2 className="size-3.5 text-emerald-500" />{" "}
                  Succeeded
                </>
              ) : job.last_status === "failed" ? (
                <>
                  <XCircle className="size-3.5 text-red-500" /> Failed
                </>
              ) : (
                job.last_status ?? (job.active ? "—" : "No runs yet")
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const cronJobsList = data?.cronJobs ?? [];
  const syncCronJob = cronJobsList.find((j) => j.job_name === "sync-all-channels");
  const retentionCronJob = cronJobsList.find(
    (j) => j.job_name === "purge_import_jobs_retention"
  );
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

  const importJobs = importJobsData?.jobs ?? [];
  const importTotal = importJobsData?.total ?? 0;
  const importPageSize = importJobsData?.pageSize ?? 20;
  const importTotalPages = Math.max(1, Math.ceil(importTotal / importPageSize));
  const importRowStart =
    importTotal === 0 ? 0 : (importPage - 1) * importPageSize + 1;
  const importRowEnd = Math.min(importPage * importPageSize, importTotal);
  const hasImportSearchActive = importSearchDraft.trim().length > 0;
  const importTypingPending = importSearchDraft !== importSearch;
  const showImportSearchLoader = importTypingPending || importFetching;
  const hasImportFilters =
    hasImportSearchActive ||
    importStatusFilter !== "all" ||
    importTypeFilter !== "all";

  return (
    <>
    <Tabs value={mainTab} onValueChange={setMainTab} className="flex flex-col gap-6">
      <TabsList className="grid h-auto w-full max-w-lg grid-cols-2 gap-1 bg-muted/50 p-1 sm:inline-flex sm:w-auto sm:max-w-none">
        <TabsTrigger value={TAB_CHANNEL} className="gap-1.5 px-3 py-2.5 sm:py-2">
          <Store className="size-3.5 shrink-0 opacity-70" />
          Channel sync
        </TabsTrigger>
        <TabsTrigger value={TAB_RETENTION} className="gap-1.5 px-3 py-2.5 sm:py-2">
          <Archive className="size-3.5 shrink-0 opacity-70" />
          CSV imports &amp; retention
        </TabsTrigger>
      </TabsList>

      <TabsContent value={TAB_CHANNEL} className="mt-0 flex flex-col gap-6 outline-none">
        {/* Channel sync — explanations and tools only (no CSV / import_jobs content) */}
        <Card className="border-blue-200/50 bg-blue-50/30 dark:border-blue-900/50 dark:bg-blue-950/20">
          <CardContent className="py-4">
            <div className="space-y-3 text-sm">
              <p className="font-semibold text-blue-900 dark:text-blue-300">How automatic syncing works</p>
              <div className="grid gap-3 sm:grid-cols-2 text-blue-800/80 dark:text-blue-300/70">
                <div className="space-y-2">
                  <p>
                    <strong>Every 15 minutes</strong>, the cron job checks all connected channels and syncs
                    any that haven&apos;t been updated recently. Each channel syncs in parallel — a slow
                    Amazon sync won&apos;t block a fast Shopify sync.
                  </p>
                  <p>
                    <strong>Etsy</strong> syncs every 60 minutes instead of 15 due to tighter API rate limits.
                  </p>
                </div>
                <div className="space-y-2">
                  <p>
                    <strong>If a sync fails</strong>, the channel is marked as &quot;error&quot; and retried automatically
                    on the next cycle. The user gets one email alert. No manual action is needed — it keeps
                    retrying until it succeeds.
                  </p>
                  <p>
                    <strong>If a channel keeps failing</strong>, the user should reconnect their account
                    from Settings (expired tokens are the most common cause).
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-blue-700/60 dark:text-blue-400/50 pt-1">
                <span><strong>Sync All Now</strong> — triggers all channels immediately</span>
                <span><strong>Pause / Resume</strong> — pg_cron card below on this tab</span>
                <span><strong>Inactive</strong> jobs still show their intended schedule</span>
                <span><strong>Disconnected</strong> channels are always skipped</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <a
                  href="https://supabase.com/dashboard/project/ixbvakwxuwayzfvnxucl/integrations/cron/jobs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white/60 px-2.5 py-1 text-[11px] font-medium text-blue-700 hover:bg-white dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/50"
                >
                  Supabase Cron Jobs ↗
                </a>
                <a
                  href="https://supabase.com/dashboard/project/ixbvakwxuwayzfvnxucl/editor/17714?schema=public"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white/60 px-2.5 py-1 text-[11px] font-medium text-blue-700 hover:bg-white dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/50"
                >
                  Sync Jobs Table ↗
                </a>
                <a
                  href="https://vercel.com/edowilliams-projects/channelpulse/logs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white/60 px-2.5 py-1 text-[11px] font-medium text-blue-700 hover:bg-white dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/50"
                >
                  Vercel Function Logs ↗
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-blue-500" />
                <CardTitle className="text-base">Channel sync scheduler (pg_cron)</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => fetchData()}
              >
                <RefreshCw className="size-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Pulls marketplace data on a timer. Pausing stops the recurring schedule;{" "}
              <strong>Sync all now</strong> still runs a one-off sync.
            </p>
          </CardHeader>
          <CardContent>
            {cronJobsList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Could not load pg_cron jobs. If you just deployed, run the latest Supabase migration
                (adds <code className="rounded bg-muted px-1 text-xs">get_cron_jobs_admin</code>).
              </p>
            ) : (
              renderCronJobPanel(
                syncCronJob,
                "Channel sync job was not returned by the server."
              )
            )}
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
                  setStatusFilter(v ?? "all");
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
      </TabsContent>

      <TabsContent value={TAB_RETENTION} className="mt-0 flex flex-col gap-6 outline-none">
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-amber-600 dark:text-amber-500" />
                <CardTitle className="text-base">Import retention (pg_cron)</CardTitle>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Daily purge of old <code className="rounded bg-muted px-1 text-[11px]">import_jobs</code> rows. Independent of
              channel sync. Use <strong className="text-foreground">Pause / Resume</strong> to control the schedule. For
              one-off cleanup or an immediate table refresh, use <strong className="text-foreground">Cleanup</strong> and{" "}
              <strong className="text-foreground">Refresh</strong> on the <code className="rounded bg-muted px-1 text-[11px]">import_jobs</code> card below. This tab also auto-refreshes about every 30 seconds. You can run jobs from the Supabase Cron UI.
            </p>
          </CardHeader>
          <CardContent>
            {cronJobsList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Could not load pg_cron jobs. If you just deployed, run the latest Supabase migration
                (adds <code className="rounded bg-muted px-1 text-xs">get_cron_jobs_admin</code>).
              </p>
            ) : (
              renderCronJobPanel(
                retentionCronJob,
                "Import retention job was not returned by the server."
              )
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">CSV imports &amp; retention</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <span className="text-foreground font-medium">Queue worker:</span> Your host (e.g. Supabase Cron) POSTs to{" "}
                <code className="rounded bg-muted px-1 py-px text-xs">/api/import/cron</code> on the{" "}
                <strong className="text-foreground">live</strong> deployment URL with{" "}
                <code className="rounded bg-muted px-1 py-px text-xs">Authorization: Bearer CRON_SECRET</code>. One queued row
                per successful call.
              </li>
              <li>
                <span className="text-foreground font-medium">Retention:</span> Daily pg_cron runs{" "}
                <code className="rounded bg-muted px-1 py-px text-xs">purge_import_jobs_older_than(3)</code> — removes rows
                with <code className="rounded bg-muted px-1 py-px text-xs">created_at</code> older than 3 days. Pausing this
                does <strong className="text-foreground">not</strong> stop the queue worker.
              </li>
              <li>
                <span className="text-foreground font-medium">Cron test mode:</span> Migration{" "}
                <code className="rounded bg-muted px-1 py-px text-xs">20260406180000_test_cron_purge_import_jobs_all</code>{" "}
                points the job at <code className="rounded bg-muted px-1 py-px text-xs">purge_import_jobs_all()</code> (deletes{" "}
                <strong className="text-foreground">every</strong> row) so “Run job” in Supabase clears the table. Revert with{" "}
                <code className="rounded bg-muted px-1 py-px text-xs">supabase/manual/revert_import_jobs_cron_three_day.sql</code>.
              </li>
              <li>
                <span className="text-foreground font-medium">Not</span> marketplace sync — use the Channel sync tab.
              </li>
              <li>
                <span className="text-foreground font-medium">Table actions:</span> On the <code className="rounded bg-muted px-1 py-px text-xs">import_jobs</code> card,{" "}
                <strong className="text-foreground">Refresh</strong> (next to Cleanup) reloads the table and pg_cron panel;{" "}
                <strong className="text-foreground">Cleanup</strong> opens the popover to delete from a chosen date/time or empty the table.
              </li>
            </ul>
            <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border pt-3">
              <a
                href={SUPABASE_DASHBOARD_CRON_JOBS}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-md border border-orange-200/80 bg-orange-50/40 px-2 py-1 text-xs font-medium text-orange-600 transition-colors hover:border-orange-300 hover:bg-orange-50 dark:border-orange-500/35 dark:bg-orange-950/25 dark:text-orange-400 dark:hover:border-orange-400/50 dark:hover:bg-orange-950/40"
              >
                Supabase cron jobs
              </a>
              <span className="text-muted-foreground" aria-hidden>
                ·
              </span>
              <a
                href={SUPABASE_DASHBOARD_SQL_EDITOR_TABLE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-md border border-orange-200/80 bg-orange-50/40 px-2 py-1 text-xs font-medium text-orange-600 transition-colors hover:border-orange-300 hover:bg-orange-50 dark:border-orange-500/35 dark:bg-orange-950/25 dark:text-orange-400 dark:hover:border-orange-400/50 dark:hover:bg-orange-950/40"
              >
                Table in SQL editor
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">import_jobs</CardTitle>
                <Badge variant="outline" className="w-fit text-[10px]">
                  {importTotal.toLocaleString()} total
                </Badge>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  disabled={retentionCronRefreshing || purgeLoading}
                  aria-label="Refresh pg_cron jobs and import_jobs table"
                  onClick={async () => {
                    setRetentionCronRefreshing(true);
                    try {
                      await Promise.all([fetchData(), fetchImportJobs()]);
                    } finally {
                      setRetentionCronRefreshing(false);
                    }
                  }}
                >
                  <RefreshCw
                    className={cn(
                      "size-3.5",
                      retentionCronRefreshing && "animate-spin"
                    )}
                  />
                </Button>
                <Popover open={importPurgeOpen} onOpenChange={setImportPurgeOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={purgeLoading}
                        className="shrink-0 gap-1.5 border-amber-800/30 text-amber-950 hover:bg-amber-50 dark:border-amber-600/40 dark:text-amber-100 dark:hover:bg-amber-950/40"
                      />
                    }
                  >
                    <Trash2 className="size-3.5" />
                    Cleanup
                  </PopoverTrigger>
                <PopoverContent
                  align="end"
                  side="bottom"
                  sideOffset={8}
                  className="z-[200] max-h-[min(85vh,40rem)] w-[min(100vw-1rem,26rem)] space-y-3 overflow-y-auto overscroll-contain p-4 shadow-lg"
                >
                  <PopoverHeader>
                    <PopoverTitle>Clean up import_jobs</PopoverTitle>
                    <PopoverDescription className="text-xs leading-relaxed">
                      These actions permanently delete rows in Postgres. They cannot be undone.
                    </PopoverDescription>
                  </PopoverHeader>
                  <div className="space-y-3 text-xs">
                    <div className="rounded-lg border-2 border-blue-400/50 bg-blue-50/50 p-3 dark:border-blue-500/40 dark:bg-blue-950/35">
                      <p className="text-sm font-semibold text-foreground">1 · Delete from date &amp; time</p>
                      <p className="mt-1.5 leading-relaxed text-muted-foreground">
                        Removes every row whose{" "}
                        <code className="rounded bg-background px-1 py-px text-[11px]">created_at</code> is{" "}
                        <strong className="text-foreground">on or after</strong> the moment you pick (your local timezone). Not
                        the same as pg_cron retention (which removes <em>old</em> rows).
                      </p>
                      <div className="mt-3 space-y-2">
                        <TremorDateTimePicker
                          value={importCleanupSince}
                          onChange={setImportCleanupSince}
                          disabled={purgeLoading}
                          placeholder="Choose cutoff date & time"
                          className="shadow-none"
                        />
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="w-full gap-2"
                          disabled={
                            purgeLoading ||
                            !importCleanupSince ||
                            !Number.isFinite(importCleanupSince.getTime())
                          }
                          onClick={() => void runImportCleanupSinceFromPicker()}
                        >
                          {purgeLoading ? (
                            <Loader2 className="size-3.5 shrink-0 animate-spin" />
                          ) : null}
                          Delete rows from this time onward
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-lg border border-destructive/35 bg-destructive/5 p-3">
                      <p className="text-sm font-semibold text-destructive">2 · Empty entire table</p>
                      <p className="mt-1.5 leading-relaxed text-muted-foreground">
                        Deletes <strong className="text-foreground">every</strong> row — queued, running, completed, or failed.
                        Users lose import history and &quot;review import&quot; links for all jobs.
                      </p>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="mt-3 w-full gap-2"
                        disabled={purgeLoading}
                        onClick={() => void runImportCleanup("all")}
                      >
                        {purgeLoading ? (
                          <Loader2 className="size-3.5 shrink-0 animate-spin" />
                        ) : null}
                        Delete all rows
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
                </Popover>
              </div>
            </div>
            <CardDescription className="text-xs leading-relaxed">
              This card only appears on <strong className="text-foreground">CSV imports &amp; retention</strong> (not Channel
              sync). <strong className="text-foreground">Refresh</strong> reloads this list and the pg_cron panel above;{" "}
              <strong className="text-foreground">Cleanup</strong> opens delete-from-datetime and empty-table actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  placeholder="Search email, name, id, channel, type, status, error…"
                  value={importSearchDraft}
                  onChange={(e) => setImportSearchDraft(e.target.value)}
                  className="h-10 w-full pl-10 pr-14 text-sm shadow-none"
                  autoComplete="off"
                />
                <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                  {hasImportSearchActive && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={clearImportSearch}
                    >
                      <X className="size-3.5" />
                    </Button>
                  )}
                  {showImportSearchLoader && (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
              <Select
                value={importStatusFilter}
                onValueChange={(v) => {
                  setImportStatusFilter(v ?? "all");
                  setImportPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-full min-w-[140px] text-sm shadow-none sm:w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={importTypeFilter}
                onValueChange={(v) => {
                  setImportTypeFilter(v ?? "all");
                  setImportPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-full min-w-[140px] text-sm shadow-none sm:w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="orders">Orders</SelectItem>
                  <SelectItem value="products">Products</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                </SelectContent>
              </Select>
              {hasImportFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 text-xs"
                  onClick={() => {
                    clearImportSearch();
                    setImportStatusFilter("all");
                    setImportTypeFilter("all");
                  }}
                >
                  Reset filters
                </Button>
              )}
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Created</TableHead>
                    <TableHead className="whitespace-nowrap">User</TableHead>
                    <TableHead className="whitespace-nowrap">Channel</TableHead>
                    <TableHead className="whitespace-nowrap">Type</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Saved / new / upd / skip</TableHead>
                    <TableHead className="w-12 text-center px-0">
                      <span className="sr-only">View details</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importJobsData === null && importFetching ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center">
                        <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {importJobsData !== null && importJobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        {hasImportFilters
                          ? "No rows match your search or filters"
                          : "No import jobs yet"}
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {importJobs.map((row) => {
                    const userLabel =
                      row.user_email ??
                      row.user_full_name ??
                      (row.user_id ? shortId(row.user_id) : "—");
                    const chLabel =
                      row.channel_name && row.channel_platform
                        ? `${row.channel_name} (${row.channel_platform})`
                        : row.channel_name ?? row.channel_platform ?? "—";
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(row.created_at).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate text-xs" title={userLabel}>
                          {highlightMatch(userLabel, importSearch)}
                        </TableCell>
                        <TableCell className="max-w-[120px] truncate text-xs" title={chLabel}>
                          {highlightMatch(chLabel, importSearch)}
                        </TableCell>
                        <TableCell className="text-xs capitalize">
                          {highlightMatch(row.import_type, importSearch)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              row.status === "completed"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px]"
                                : row.status === "failed"
                                  ? "border-red-200 bg-red-50 text-red-800 text-[10px]"
                                  : row.status === "running"
                                    ? "border-blue-200 bg-blue-50 text-blue-800 text-[10px]"
                                    : "text-[10px]"
                            }
                          >
                            {row.status === "running" && (
                              <Loader2 className="mr-1 inline size-2.5 animate-spin" />
                            )}
                            {highlightMatch(row.status, importSearch)}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right text-xs tabular-nums">
                          {(() => {
                            const n = row.inserted_new_count ?? 0;
                            const u = row.updated_existing_count ?? 0;
                            const has = n + u > 0;
                            return has
                              ? `${row.imported_count} / ${n} / ${u} / ${row.skipped_count}`
                              : `${row.imported_count} / — / — / ${row.skipped_count}`;
                          })()}
                        </TableCell>
                        <TableCell className="px-0 text-center" onClick={(e) => e.stopPropagation()}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-foreground"
                            aria-label="View full import job"
                            onClick={() => {
                              setImportDetailJobId(row.id);
                              setImportDetailOutcomePrefetch(row.outcome_summary ?? null);
                            }}
                          >
                            <Eye className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {importJobsData !== null && (
              <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  {importTotal === 0 ? (
                    <>0 rows · page {importPage} of {importTotalPages}</>
                  ) : (
                    <>
                      Showing {importRowStart.toLocaleString()}–{importRowEnd.toLocaleString()} of{" "}
                      {importTotal.toLocaleString()} · page {importPage} of {importTotalPages}
                    </>
                  )}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    disabled={importPage <= 1 || importTotal === 0}
                    onClick={() => setImportPage(importPage - 1)}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="size-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    disabled={importPage >= importTotalPages || importTotal === 0}
                    onClick={() => setImportPage(importPage + 1)}
                    aria-label="Next page"
                  >
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
    <ImportJobDetailSheet
      jobId={importDetailJobId}
      prefetchedOutcomeSummary={importDetailOutcomePrefetch}
      onDismiss={() => {
        setImportDetailJobId(null);
        setImportDetailOutcomePrefetch(null);
      }}
    />
    </>
  );
}
