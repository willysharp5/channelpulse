import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/queries";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    await requireAdmin();
    const sb = createAdminClient();

    const [{ data: channels }, { data: recentJobs }, { data: cronJob }] = await Promise.all([
      sb
        .from("channels")
        .select("id, name, platform, status, last_sync_at, last_sync_status")
        .in("status", ["active", "syncing", "error"])
        .order("last_sync_at", { ascending: false, nullsFirst: false }),
      sb
        .from("sync_jobs")
        .select("id, channel_id, type, status, started_at, completed_at, records_synced, error")
        .order("started_at", { ascending: false })
        .limit(30),
      sb.rpc("get_cron_job_status").maybeSingle(),
    ]);

    return NextResponse.json({
      channels: channels ?? [],
      recentJobs: recentJobs ?? [],
      cronJob: cronJob ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const sb = createAdminClient();
    const { action } = await request.json();

    if (action === "trigger_now") {
      await sb.rpc("trigger_channel_syncs");
      return NextResponse.json({ ok: true, message: "Sync triggered for all active channels" });
    }

    if (action === "pause") {
      await sb.rpc("update_cron_job_active", { is_active: false });
      return NextResponse.json({ ok: true, message: "Cron job paused" });
    }

    if (action === "resume") {
      await sb.rpc("update_cron_job_active", { is_active: true });
      return NextResponse.json({ ok: true, message: "Cron job resumed" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}
