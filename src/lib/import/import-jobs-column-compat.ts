import type { PostgrestError } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Lowercased message + details + hint + code — use for “missing column” compatibility checks. */
export function postgrestErrorHaystack(err: PostgrestError | null): string {
  if (!err) return "";
  return `${err.message ?? ""} ${err.details ?? ""} ${err.hint ?? ""} ${(err as { code?: string }).code ?? ""}`.toLowerCase();
}

/** True when PostgREST rejects a read/write because `import_jobs.outcome_summary` is not in the schema cache. */
export function importJobsMissingOutcomeSummaryColumnError(err: PostgrestError | null): boolean {
  return postgrestErrorHaystack(err).includes("outcome_summary");
}

const DETAIL_CORE =
  "id, org_id, channel_id, user_id, import_type, status, imported_count, skipped_count, error_message, created_at, updated_at, started_at, completed_at, rows, channels(name, platform)";

/** Count columns + core detail fields. `outcome_summary` is fetched in a separate query when the column exists. */
export const IMPORT_JOBS_ADMIN_DETAIL_SELECT_FULL =
  `${DETAIL_CORE}, inserted_new_count, updated_existing_count`;

export const IMPORT_JOBS_ADMIN_DETAIL_SELECT_BASE = DETAIL_CORE;

/** Select list for admin import_jobs table + channel embed (with upsert breakdown columns). */
export const IMPORT_JOBS_ADMIN_LIST_SELECT_FULL =
  "id, org_id, channel_id, user_id, import_type, status, imported_count, skipped_count, inserted_new_count, updated_existing_count, error_message, created_at, started_at, completed_at, channels(name, platform)";

export const IMPORT_JOBS_ADMIN_LIST_SELECT_WITH_SUMMARY =
  `${IMPORT_JOBS_ADMIN_LIST_SELECT_FULL}, outcome_summary`;

export const IMPORT_JOBS_ADMIN_LIST_SELECT_BASE =
  "id, org_id, channel_id, user_id, import_type, status, imported_count, skipped_count, error_message, created_at, started_at, completed_at, channels(name, platform)";

/** User-facing job poll (no rows). */
export const IMPORT_JOBS_POLL_SELECT_FULL =
  "id, org_id, channel_id, import_type, status, imported_count, skipped_count, inserted_new_count, updated_existing_count, error_message, created_at, started_at, completed_at";

/** Same as FULL plus `outcome_summary` when that migration is applied. */
export const IMPORT_JOBS_POLL_SELECT_WITH_SUMMARY =
  `${IMPORT_JOBS_POLL_SELECT_FULL}, outcome_summary`;

export const IMPORT_JOBS_POLL_SELECT_BASE =
  "id, org_id, channel_id, import_type, status, imported_count, skipped_count, error_message, created_at, started_at, completed_at";

export function importJobsMissingUpsertColumnsError(err: PostgrestError | null): boolean {
  if (!err) return false;
  const hay = postgrestErrorHaystack(err);
  return (
    hay.includes("inserted_new_count") ||
    hay.includes("updated_existing_count") ||
    hay.includes("42703")
  );
}

/** Load import job for admin detail; falls back if optional columns are missing. Never selects `outcome_summary` in the main query so a missing column cannot break the request. */
export async function selectImportJobDetailRow(sb: SupabaseClient, id: string) {
  const attempts = [IMPORT_JOBS_ADMIN_DETAIL_SELECT_FULL, IMPORT_JOBS_ADMIN_DETAIL_SELECT_BASE];
  let lastErr: PostgrestError | null = null;
  for (const sel of attempts) {
    const { data, error } = await sb.from("import_jobs").select(sel).eq("id", id).maybeSingle();
    if (error) {
      lastErr = error;
      continue;
    }
    if (!data) {
      return { data: null, error: null as PostgrestError | null };
    }
    const { data: summaryRow, error: summaryErr } = await sb
      .from("import_jobs")
      .select("outcome_summary")
      .eq("id", id)
      .maybeSingle();
    if (
      !summaryErr &&
      summaryRow &&
      typeof summaryRow === "object" &&
      "outcome_summary" in summaryRow
    ) {
      const os = (summaryRow as { outcome_summary: string | null }).outcome_summary;
      const merged = { ...(data as unknown as Record<string, unknown>), outcome_summary: os };
      return { data: merged, error: null as PostgrestError | null };
    }
    return { data, error: null as PostgrestError | null };
  }
  return { data: null, error: lastErr };
}
