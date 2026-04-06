"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ChannelBadge } from "@/components/layout/channel-badge";
import { Loader2 } from "lucide-react";
import type { Platform } from "@/types";
import {
  describeImportJobOutcome,
  shouldShowImportOutcomeMigrationHint,
} from "@/lib/import/import-outcome-summary";
import { cn } from "@/lib/utils";

export type AdminImportJobDetail = {
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
  /** Present on jobs after migration `20260409130000_import_jobs_upsert_counts`. */
  inserted_new_count?: number;
  updated_existing_count?: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  channel_name: string | null;
  channel_platform: string | null;
  /** Persisted at job completion — same copy as the import toast. */
  outcome_summary?: string | null;
  rows: unknown;
};

type Props = {
  jobId: string | null;
  /** From admin list row when present — same field as `outcome_summary` on the job. */
  prefetchedOutcomeSummary?: string | null;
  onDismiss: () => void;
};

function formatTs(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function ImportJobDetailSheet({
  jobId,
  prefetchedOutcomeSummary = null,
  onDismiss,
}: Props) {
  const [job, setJob] = useState<AdminImportJobDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setJob(null);

    void (async () => {
      try {
        const res = await fetch(`/api/admin/import-jobs/${jobId}`);
        const body = (await res.json()) as { job?: AdminImportJobDetail; error?: string };
        if (!cancelled) {
          if (res.ok && body.job) setJob(body.job);
          else setJob(null);
        }
      } catch {
        if (!cancelled) setJob(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const rowsJson =
    job?.rows === undefined
      ? ""
      : (() => {
          try {
            return JSON.stringify(job.rows, null, 2);
          } catch {
            return String(job.rows);
          }
        })();

  const insertedNew = job?.inserted_new_count ?? 0;
  const updatedExisting = job?.updated_existing_count ?? 0;
  const hasUpsertBreakdown = insertedNew + updatedExisting > 0;
  const storedOutcomeSummary =
    job != null
      ? (job.outcome_summary?.trim() || prefetchedOutcomeSummary?.trim() || null)
      : null;
  const whatHappenedText =
    job != null
      ? (storedOutcomeSummary ||
          describeImportJobOutcome({
            status: job.status,
            importType: job.import_type,
            imported: job.imported_count,
            skipped: job.skipped_count,
            insertedNew,
            updatedExisting,
            channelName: job.channel_name?.trim() || "this channel",
            errorMessage: job.error_message,
          }))
      : "";
  const showOutcomeMigrationHint =
    job != null &&
    shouldShowImportOutcomeMigrationHint({
      status: job.status,
      imported: job.imported_count,
      skipped: job.skipped_count,
      insertedNew,
      updatedExisting,
      hasStoredOutcomeSummary: storedOutcomeSummary != null && storedOutcomeSummary.length > 0,
    });

  return (
    <Sheet
      open={jobId != null}
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
    >
      <SheetContent
        side="right"
        showCloseButton
        className={cn(
          "flex w-full flex-col gap-0 overflow-y-auto border-l bg-background p-0 sm:max-w-2xl"
        )}
      >
        {jobId && (
          <>
            <SheetHeader className="space-y-1 border-b border-border px-6 py-5 text-left">
              <SheetTitle className="pr-10 font-mono text-sm font-semibold leading-snug tracking-tight break-all">
                {loading ? "Loading…" : job?.id ?? jobId}
              </SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground">
                {job
                  ? `${job.import_type} import · ${job.channel_name ?? "Channel"}`
                  : "Full import job record and CSV row payload"}
              </SheetDescription>
              {job ? (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Badge
                    variant="outline"
                    className={
                      job.status === "completed"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800 text-xs"
                        : job.status === "failed"
                          ? "border-red-200 bg-red-50 text-red-800 text-xs"
                          : job.status === "running"
                            ? "border-blue-200 bg-blue-50 text-blue-800 text-xs"
                            : "text-xs"
                    }
                  >
                    {job.status}
                  </Badge>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {job.imported_count} saved · {job.skipped_count} skipped
                    {hasUpsertBreakdown
                      ? ` · ${insertedNew} new · ${updatedExisting} updated`
                      : job.imported_count > 0
                        ? " (new/updated breakdown not stored for this job)"
                        : ""}
                  </span>
                </div>
              ) : null}
            </SheetHeader>

            <div className="space-y-6 px-6 py-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
              ) : !job ? (
                <p className="text-sm text-muted-foreground">Could not load this import job.</p>
              ) : (
                <>
                  <div className="rounded-lg border border-border/80 bg-muted/25 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      What happened
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-foreground">{whatHappenedText}</p>
                    {showOutcomeMigrationHint ? (
                      <p className="mt-2.5 border-t border-border/60 pt-2.5 text-xs leading-relaxed text-muted-foreground">
                        The import toast shows the full line computed when the job finishes. This record does not store that
                        summary or a new/updated split yet. On your hosted Supabase project, run the SQL in{" "}
                        <code className="rounded bg-background px-1 py-px text-[11px]">
                          supabase/migrations/20260409130000_import_jobs_upsert_counts.sql
                        </code>{" "}
                        and{" "}
                        <code className="rounded bg-background px-1 py-px text-[11px]">
                          supabase/migrations/20260409140000_import_jobs_outcome_summary.sql
                        </code>
                        , then new imports will match the toast and this panel.
                      </p>
                    ) : null}
                  </div>
                  <dl className="grid gap-0 text-sm">
                    <DetailRow label="Job id">
                      <span className="break-all font-mono text-xs">{job.id}</span>
                    </DetailRow>
                    <DetailRow label="Organization id">
                      <span className="break-all font-mono text-xs">{job.org_id}</span>
                    </DetailRow>
                    <DetailRow label="Channel id">
                      <span className="break-all font-mono text-xs">{job.channel_id}</span>
                    </DetailRow>
                    <DetailRow label="Channel">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-right font-medium">
                          {job.channel_name ?? "—"}
                        </span>
                        {job.channel_platform ? (
                          <ChannelBadge
                            platform={job.channel_platform as Platform}
                            className="text-[10px]"
                          />
                        ) : null}
                      </div>
                    </DetailRow>
                    <DetailRow label="User id">
                      <span className="break-all font-mono text-xs">
                        {job.user_id ?? "—"}
                      </span>
                    </DetailRow>
                    <DetailRow label="User email">{job.user_email ?? "—"}</DetailRow>
                    <DetailRow label="User name">{job.user_full_name ?? "—"}</DetailRow>
                    <DetailRow label="Import type">{job.import_type}</DetailRow>
                    <DetailRow label="Status">{job.status}</DetailRow>
                    <DetailRow label="Rows saved">{String(job.imported_count)}</DetailRow>
                    <DetailRow label="New (unique key)">
                      {hasUpsertBreakdown
                        ? String(insertedNew)
                        : job.imported_count > 0
                          ? "—"
                          : "0"}
                    </DetailRow>
                    <DetailRow label="Updated (existing key)">
                      {hasUpsertBreakdown
                        ? String(updatedExisting)
                        : job.imported_count > 0
                          ? "—"
                          : "0"}
                    </DetailRow>
                    <DetailRow label="Skipped">{String(job.skipped_count)}</DetailRow>
                    <DetailRow label="Created">{formatTs(job.created_at)}</DetailRow>
                    <DetailRow label="Updated">{formatTs(job.updated_at)}</DetailRow>
                    <DetailRow label="Started">{formatTs(job.started_at)}</DetailRow>
                    <DetailRow label="Completed">{formatTs(job.completed_at)}</DetailRow>
                    <DetailRow label="Error">
                      {job.error_message ? (
                        <span className="whitespace-pre-wrap break-words text-right text-red-600 dark:text-red-400">
                          {job.error_message}
                        </span>
                      ) : (
                        "—"
                      )}
                    </DetailRow>
                  </dl>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Rows payload (JSON)
                    </p>
                    <pre className="max-h-[min(50vh,480px)] overflow-auto rounded-lg border bg-muted/40 p-3 text-[11px] leading-relaxed">
                      {rowsJson || "[]"}
                    </pre>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/80 py-3 last:border-0">
      <dt className="shrink-0 font-semibold text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-foreground">{children}</dd>
    </div>
  );
}
