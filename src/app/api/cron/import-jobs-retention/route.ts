import { NextResponse } from "next/server";
import { IMPORT_JOBS_RETENTION_DAYS, purgeOldImportJobs } from "@/lib/import/cleanup-import-jobs";

/**
 * Deletes `import_jobs` rows older than 3 days (configurable via JSON body `{ "days": 5 }`).
 *
 * Schedule with the same secret as other crons, e.g. daily:
 *   POST /api/cron/import-jobs-retention
 *   Authorization: Bearer ${CRON_SECRET}
 *
 * Safe to run often: each run only removes rows past the retention window.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let days = IMPORT_JOBS_RETENTION_DAYS;
  try {
    const body = (await request.json().catch(() => ({}))) as { days?: unknown };
    if (typeof body.days === "number" && Number.isFinite(body.days)) {
      days = Math.max(1, Math.min(90, Math.floor(body.days)));
    }
  } catch {
    /* use default */
  }

  const { deleted, error } = await purgeOldImportJobs(days);

  if (error) {
    console.error("[import-jobs-retention]", error);
    return NextResponse.json({ ok: false, deleted, error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted, retentionDays: days });
}
