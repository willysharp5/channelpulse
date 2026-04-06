import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/queries";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Super admin only.
 * - mode "retention": same as daily pg_cron — RPC purge_import_jobs_older_than(days)
 * - mode "since": delete rows with created_at >= `since` (ISO 8601) — from that moment through now
 * - mode "all": delete every row in import_jobs (destructive)
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json()) as {
      mode?: string;
      days?: number;
      since?: string;
    };

    const mode: "retention" | "all" | "since" =
      body.mode === "all"
        ? "all"
        : body.mode === "since"
          ? "since"
          : "retention";

    const days =
      typeof body.days === "number" && body.days >= 1 && body.days <= 365
        ? Math.floor(body.days)
        : 3;

    const sb = createAdminClient();

    if (mode === "since") {
      const raw = typeof body.since === "string" ? body.since.trim() : "";
      if (!raw) {
        return NextResponse.json(
          { error: "since is required (ISO 8601 date-time)" },
          { status: 400 }
        );
      }
      const sinceDate = new Date(raw);
      if (!Number.isFinite(sinceDate.getTime())) {
        return NextResponse.json({ error: "Invalid since date-time" }, { status: 400 });
      }
      const cutoff = sinceDate.toISOString();
      const { data: deletedRows, error } = await sb
        .from("import_jobs")
        .delete()
        .gte("created_at", cutoff)
        .select("id");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        deleted: deletedRows?.length ?? 0,
        mode: "since" as const,
        since: cutoff,
      });
    }

    if (mode === "retention") {
      const { data, error } = await sb.rpc("purge_import_jobs_older_than", {
        p_days: days,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const deleted = typeof data === "number" ? data : 0;
      return NextResponse.json({ deleted, mode: "retention" as const });
    }

    const { data: deletedRows, error } = await sb
      .from("import_jobs")
      .delete()
      .gte("created_at", "1970-01-01T00:00:00.000Z")
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      deleted: deletedRows?.length ?? 0,
      mode: "all" as const,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}
