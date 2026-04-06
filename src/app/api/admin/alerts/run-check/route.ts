import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAnomalyAlerts, generateLowStockAlerts } from "@/lib/alerts";

/** Admin only: run the same low-stock + anomaly checks as post-sync, for every organization. */
export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const sb = createAdminClient();
  const { data: orgs, error: orgErr } = await sb.from("organizations").select("id");
  if (orgErr) {
    return NextResponse.json({ error: orgErr.message }, { status: 500 });
  }

  const ids = (orgs ?? []).map((o) => o.id);
  let failed = 0;
  for (const orgId of ids) {
    try {
      await generateLowStockAlerts(orgId, sb);
      await generateAnomalyAlerts(orgId, sb);
    } catch {
      failed += 1;
    }
  }

  return NextResponse.json({
    success: true,
    orgCount: ids.length,
    failedOrgs: failed,
  });
}
