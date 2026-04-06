import { createAdminClient } from "@/lib/supabase/admin";

/** Default age after which import_jobs rows are deleted (bell deep links stop working). */
export const IMPORT_JOBS_RETENTION_DAYS = 3;

/**
 * Deletes `import_jobs` older than `days` (by `created_at`).
 * Prefers DB RPC `purge_import_jobs_older_than` when the migration is applied; otherwise falls back to client delete.
 */
export async function purgeOldImportJobs(
  days: number = IMPORT_JOBS_RETENTION_DAYS
): Promise<{ deleted: number; error?: string }> {
  const d = Math.max(1, Math.floor(days));
  const sb = createAdminClient();

  const { data: rpcData, error: rpcError } = await sb.rpc("purge_import_jobs_older_than", { p_days: d });

  if (!rpcError && rpcData != null) {
    const deleted = typeof rpcData === "number" ? rpcData : Number(rpcData);
    return { deleted: Number.isFinite(deleted) ? deleted : 0 };
  }

  const cutoff = new Date(Date.now() - d * 86_400_000).toISOString();
  const { data: delRows, error: delErr } = await sb.from("import_jobs").delete().lt("created_at", cutoff).select("id");

  if (delErr) {
    return {
      deleted: 0,
      error: rpcError?.message ?? delErr.message,
    };
  }

  return { deleted: delRows?.length ?? 0 };
}
