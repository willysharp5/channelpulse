import { NextResponse } from "next/server";
import { purgeOldImportJobs } from "@/lib/import/cleanup-import-jobs";
import { processNextQueuedImportJob } from "@/lib/import/run-import-job";

/**
 * Same auth pattern as POST /api/sync/cron — Supabase (or Vercel) cron calls with:
 *   Authorization: Bearer ${CRON_SECRET}
 *
 * Default: POST /api/import/queue runs each job inline (no cron needed). Use this route when
 * IMPORT_SKIP_INLINE_WORKER=true, or to drain a backlog / retry stuck queued jobs.
 *
 * Each call also purges `import_jobs` older than 3 days (same as POST /api/cron/import-jobs-retention).
 */
export async function POST(_request: Request) {
  const authHeader = _request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { deleted: purgedImportJobs, error: purgeError } = await purgeOldImportJobs();
  if (purgeError) {
    console.warn("[import/cron] retention purge:", purgeError);
  }

  const result = await processNextQueuedImportJob();

  if (!result.processed) {
    return NextResponse.json({
      processed: false,
      reason: result.reason,
      purgedImportJobs,
      purgeError: purgeError ?? null,
    });
  }

  const statusCode = result.status === "failed" ? 500 : 200;
  return NextResponse.json(
    {
      processed: true,
      jobId: result.jobId,
      status: result.status,
      imported: result.imported,
      skipped: result.skipped,
      inserted_new: result.insertedNew,
      updated_existing: result.updatedExisting,
      error: result.error,
      outcome_summary: result.outcomeSummary,
      purgedImportJobs,
      purgeError: purgeError ?? null,
    },
    { status: statusCode }
  );
}
