import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  IMPORT_JOBS_POLL_SELECT_BASE,
  IMPORT_JOBS_POLL_SELECT_FULL,
  IMPORT_JOBS_POLL_SELECT_WITH_SUMMARY,
  importJobsMissingOutcomeSummaryColumnError,
  importJobsMissingUpsertColumnsError,
} from "@/lib/import/import-jobs-column-compat";

type ImportJobApiRow = {
  id: string;
  org_id: string;
  channel_id: string;
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
  outcome_summary?: string | null;
  rows?: unknown;
};

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const includeRows = searchParams.get("include_rows") === "1";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const selectWithSummary = includeRows
      ? `${IMPORT_JOBS_POLL_SELECT_WITH_SUMMARY}, rows`
      : IMPORT_JOBS_POLL_SELECT_WITH_SUMMARY;
    const selectFull = includeRows
      ? `${IMPORT_JOBS_POLL_SELECT_FULL}, rows`
      : IMPORT_JOBS_POLL_SELECT_FULL;
    const selectBase = includeRows
      ? `${IMPORT_JOBS_POLL_SELECT_BASE}, rows`
      : IMPORT_JOBS_POLL_SELECT_BASE;

    let { data: jobRaw, error } = await supabase
      .from("import_jobs")
      .select(selectWithSummary as never)
      .eq("id", id)
      .maybeSingle();

    if (error && importJobsMissingOutcomeSummaryColumnError(error)) {
      ({ data: jobRaw, error } = await supabase
        .from("import_jobs")
        .select(selectFull as never)
        .eq("id", id)
        .maybeSingle());
    }

    if (error && importJobsMissingUpsertColumnsError(error)) {
      ({ data: jobRaw, error } = await supabase
        .from("import_jobs")
        .select(selectBase as never)
        .eq("id", id)
        .maybeSingle());
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const job = jobRaw as ImportJobApiRow | null;

    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (includeRows && job.status !== "failed" && "rows" in job) {
      const { rows: _rows, ...rest } = job;
      return NextResponse.json({ job: rest });
    }

    return NextResponse.json({ job });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
