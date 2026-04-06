import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/queries";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const sb = createAdminClient();
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const search = searchParams.get("search")?.trim() ?? "";
    const statusFilter = searchParams.get("status") ?? "";

    const offset = (page - 1) * PAGE_SIZE;

    let jobsQuery = sb
      .from("sync_jobs")
      .select("id, channel_id, type, status, started_at, completed_at, records_synced, error", { count: "exact" });

    if (statusFilter) {
      jobsQuery = jobsQuery.eq("status", statusFilter);
    }

    jobsQuery = jobsQuery
      .order("started_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    const [{ data: channels }, jobsResult, { data: cronJobsRaw, error: cronErr }] = await Promise.all([
      sb
        .from("channels")
        .select("id, name, platform, status, last_sync_at, last_sync_status")
        .in("status", ["active", "syncing", "error"])
        .order("last_sync_at", { ascending: false, nullsFirst: false }),
      jobsQuery,
      sb.rpc("get_cron_jobs_admin"),
    ]);

    const cronJobs = cronErr ? [] : (cronJobsRaw ?? []);

    const allChannels = channels ?? [];
    let filteredJobs = jobsResult.data ?? [];

    if (search) {
      const lower = search.toLowerCase();
      const matchingChannelIds = new Set(
        allChannels
          .filter(
            (c) =>
              c.name.toLowerCase().includes(lower) ||
              c.platform.toLowerCase().includes(lower)
          )
          .map((c) => c.id)
      );
      filteredJobs = filteredJobs.filter(
        (j) =>
          matchingChannelIds.has(j.channel_id) ||
          j.status.toLowerCase().includes(lower) ||
          (j.error ?? "").toLowerCase().includes(lower)
      );
    }

    return NextResponse.json({
      channels: allChannels,
      recentJobs: filteredJobs,
      totalJobs: jobsResult.count ?? 0,
      page,
      pageSize: PAGE_SIZE,
      cronJobs,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const sb = createAdminClient();
    const body = await request.json();
    const { action } = body as { action?: string; jobName?: string };

    const allowedJobs = new Set([
      "sync-all-channels",
      "purge_import_jobs_retention",
      "weekly-digest-email",
    ]);
    const jobName =
      typeof body.jobName === "string" && allowedJobs.has(body.jobName)
        ? body.jobName
        : "sync-all-channels";

    if (action === "trigger_now") {
      if (jobName === "purge_import_jobs_retention") {
        return NextResponse.json(
          {
            error:
              "Manual retention purge was removed from the admin UI. Use the import_jobs Cleanup popover or wait for the scheduled pg_cron job.",
          },
          { status: 400 }
        );
      }

      if (jobName === "weekly-digest-email") {
        const { error: wErr } = await sb.rpc("trigger_weekly_digest_email");
        if (wErr) {
          return NextResponse.json({ error: wErr.message }, { status: 500 });
        }
        return NextResponse.json({
          ok: true,
          message:
            "Weekly digest HTTP trigger invoked (check Vault secrets and Supabase net._http_response if no email sent).",
        });
      }

      await sb.rpc("trigger_channel_syncs");
      return NextResponse.json({ ok: true, message: "Sync triggered for all active channels" });
    }

    if (action === "pause") {
      await sb.rpc("set_admin_cron_job_active", {
        p_job_name: jobName,
        p_is_active: false,
      });
      return NextResponse.json({ ok: true, message: "Cron job paused" });
    }

    if (action === "resume") {
      await sb.rpc("set_admin_cron_job_active", {
        p_job_name: jobName,
        p_is_active: true,
      });
      return NextResponse.json({ ok: true, message: "Cron job resumed" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}
