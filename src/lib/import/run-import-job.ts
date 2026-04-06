import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { importJobsMissingOutcomeSummaryColumnError, importJobsMissingUpsertColumnsError } from "./import-jobs-column-compat";
import { executeImportJob, type ImportJobRow } from "./execute-import";
import { describeImportJobOutcome } from "./import-outcome-summary";
import type { ImportType } from "./templates";

export type RunImportJobOutcome = {
  jobId: string;
  status: "completed" | "failed";
  imported: number;
  skipped: number;
  insertedNew: number;
  updatedExisting: number;
  error: string | null;
  /** Same narrative as DB `outcome_summary` / admin detail — for toast and bell without recomputing client-side. */
  outcomeSummary: string | null;
};

async function finalizeJob(
  sb: SupabaseClient,
  jobId: string,
  meta: { channel_id: string; import_type: ImportType },
  result: {
    imported: number;
    skipped: number;
    insertedNew: number;
    updatedExisting: number;
    error?: string;
  }
): Promise<RunImportJobOutcome> {
  const done = new Date().toISOString();
  const status = result.error ? "failed" : "completed";
  const { data: chRow } = await sb
    .from("channels")
    .select("name")
    .eq("id", meta.channel_id)
    .maybeSingle();
  const channelName = String(chRow?.name ?? "").trim() || "this channel";
  const outcome_summary = describeImportJobOutcome({
    status,
    importType: meta.import_type,
    imported: result.imported,
    skipped: result.skipped,
    insertedNew: result.insertedNew,
    updatedExisting: result.updatedExisting,
    channelName,
    errorMessage: result.error ?? null,
  });

  /** Core completion fields only — `outcome_summary` is patched afterward so a missing column never fails the import. */
  const corePayload = {
    status,
    imported_count: result.imported,
    skipped_count: result.skipped,
    error_message: result.error ?? null,
    completed_at: done,
    updated_at: done,
    inserted_new_count: result.insertedNew,
    updated_existing_count: result.updatedExisting,
  };

  let payload = corePayload;
  let { error: baseErr } = await sb.from("import_jobs").update(payload).eq("id", jobId);

  let needsStandaloneCountUpdate = false;
  if (baseErr && importJobsMissingUpsertColumnsError(baseErr)) {
    const { inserted_new_count: _in, updated_existing_count: _ue, ...withoutCounts } = payload;
    needsStandaloneCountUpdate = true;
    ({ error: baseErr } = await sb.from("import_jobs").update(withoutCounts).eq("id", jobId));
  }

  if (baseErr) {
    throw new Error(baseErr.message);
  }

  if (needsStandaloneCountUpdate) {
    const { error: countErr } = await sb
      .from("import_jobs")
      .update({
        inserted_new_count: result.insertedNew,
        updated_existing_count: result.updatedExisting,
      })
      .eq("id", jobId);
    if (countErr && !importJobsMissingUpsertColumnsError(countErr)) {
      console.warn("[import] import_jobs upsert count columns:", countErr.message);
    }
  }

  const { error: summaryErr } = await sb
    .from("import_jobs")
    .update({ outcome_summary })
    .eq("id", jobId);
  if (summaryErr && !importJobsMissingOutcomeSummaryColumnError(summaryErr)) {
    console.warn("[import] import_jobs outcome_summary:", summaryErr.message);
  }

  return {
    jobId,
    status,
    imported: result.imported,
    skipped: result.skipped,
    insertedNew: result.insertedNew,
    updatedExisting: result.updatedExisting,
    error: result.error ?? null,
    outcomeSummary: outcome_summary,
  };
}

async function failJob(
  sb: SupabaseClient,
  jobId: string,
  message: string,
  ctx?: { channel_id: string; import_type: ImportType }
): Promise<RunImportJobOutcome> {
  const done = new Date().toISOString();
  let outcome_summary: string | null = null;
  if (ctx) {
    const { data: chRow } = await sb
      .from("channels")
      .select("name")
      .eq("id", ctx.channel_id)
      .maybeSingle();
    const channelName = String(chRow?.name ?? "").trim() || "this channel";
    outcome_summary = describeImportJobOutcome({
      status: "failed",
      importType: ctx.import_type,
      imported: 0,
      skipped: 0,
      insertedNew: 0,
      updatedExisting: 0,
      channelName,
      errorMessage: message,
    });
  }
  let { error: failErr } = await sb
    .from("import_jobs")
    .update({
      status: "failed" as const,
      error_message: message,
      completed_at: done,
      updated_at: done,
    })
    .eq("id", jobId);
  if (failErr) {
    console.warn("[import] failJob update:", failErr.message);
  } else if (outcome_summary != null) {
    const { error: sumErr } = await sb
      .from("import_jobs")
      .update({ outcome_summary })
      .eq("id", jobId);
    if (sumErr && !importJobsMissingOutcomeSummaryColumnError(sumErr)) {
      console.warn("[import] failJob outcome_summary:", sumErr.message);
    }
  }

  return {
    jobId,
    status: "failed",
    imported: 0,
    skipped: 0,
    insertedNew: 0,
    updatedExisting: 0,
    error: message,
    outcomeSummary: outcome_summary,
  };
}

type JobRow = {
  id: string;
  org_id: string;
  channel_id: string;
  import_type: string;
  rows: unknown;
};

/** Execute import for a row already in `running` state (caller claimed). */
export async function executeRunningImportJob(sb: SupabaseClient, next: JobRow): Promise<RunImportJobOutcome> {
  const { data: channel } = await sb
    .from("channels")
    .select("platform")
    .eq("id", next.channel_id)
    .maybeSingle();

  const platform = String(channel?.platform ?? "");

  const jobRow: ImportJobRow = {
    id: next.id,
    org_id: next.org_id,
    channel_id: next.channel_id,
    import_type: next.import_type as ImportType,
    rows: next.rows,
  };

  const meta = {
    channel_id: next.channel_id,
    import_type: next.import_type as ImportType,
  };
  try {
    const result = await executeImportJob(sb, jobRow, platform);
    return await finalizeJob(sb, next.id, meta, result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return await failJob(sb, next.id, message, meta);
  }
}

type ClaimResult = { ok: true; row: JobRow } | { ok: false; reason: string };

async function claimNextQueued(sb: SupabaseClient): Promise<ClaimResult> {
  const { data: next, error: pickErr } = await sb
    .from("import_jobs")
    .select("id, org_id, channel_id, import_type, rows")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (pickErr) return { ok: false, reason: pickErr.message };
  if (!next) return { ok: false, reason: "no_queued_jobs" };

  const now = new Date().toISOString();
  const { data: claimed, error: claimErr } = await sb
    .from("import_jobs")
    .update({ status: "running", started_at: now, updated_at: now })
    .eq("id", next.id)
    .eq("status", "queued")
    .select("id, org_id, channel_id, import_type, rows")
    .maybeSingle();

  if (claimErr) return { ok: false, reason: claimErr.message };
  if (!claimed) return { ok: false, reason: "already_claimed" };

  return { ok: true, row: claimed };
}

async function claimJobById(sb: SupabaseClient, jobId: string): Promise<ClaimResult> {
  const { data: next, error: fetchErr } = await sb
    .from("import_jobs")
    .select("id, org_id, channel_id, import_type, rows")
    .eq("id", jobId)
    .maybeSingle();

  if (fetchErr) return { ok: false, reason: fetchErr.message };
  if (!next) return { ok: false, reason: "not_found" };

  const now = new Date().toISOString();
  const { data: claimed, error: claimErr } = await sb
    .from("import_jobs")
    .update({ status: "running", started_at: now, updated_at: now })
    .eq("id", jobId)
    .eq("status", "queued")
    .select("id, org_id, channel_id, import_type, rows")
    .maybeSingle();

  if (claimErr) return { ok: false, reason: claimErr.message };
  if (!claimed) return { ok: false, reason: "already_claimed" };

  return { ok: true, row: claimed };
}

export type ProcessImportWorkerResult =
  | {
      processed: true;
      jobId: string;
      status: "completed" | "failed";
      imported: number;
      skipped: number;
      insertedNew: number;
      updatedExisting: number;
      error: string | null;
      outcomeSummary: string | null;
    }
  | { processed: false; reason: string };

/** Oldest queued job — used by POST /api/import/cron (production). */
export async function processNextQueuedImportJob(): Promise<ProcessImportWorkerResult> {
  const sb = createAdminClient();
  const claim = await claimNextQueued(sb);
  if (!claim.ok) {
    return { processed: false, reason: claim.reason };
  }
  const outcome = await executeRunningImportJob(sb, claim.row);
  return {
    processed: true,
    jobId: outcome.jobId,
    status: outcome.status,
    imported: outcome.imported,
    skipped: outcome.skipped,
    insertedNew: outcome.insertedNew,
    updatedExisting: outcome.updatedExisting,
    error: outcome.error,
    outcomeSummary: outcome.outcomeSummary,
  };
}

/** Run a specific queued job — used in local dev right after enqueue. */
export async function processImportJobById(jobId: string): Promise<ProcessImportWorkerResult> {
  const sb = createAdminClient();
  const claim = await claimJobById(sb, jobId);
  if (!claim.ok) {
    return { processed: false, reason: claim.reason };
  }
  const outcome = await executeRunningImportJob(sb, claim.row);
  return {
    processed: true,
    jobId: outcome.jobId,
    status: outcome.status,
    imported: outcome.imported,
    skipped: outcome.skipped,
    insertedNew: outcome.insertedNew,
    updatedExisting: outcome.updatedExisting,
    error: outcome.error,
    outcomeSummary: outcome.outcomeSummary,
  };
}
