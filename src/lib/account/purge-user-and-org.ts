import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Permanently deletes all data for a user and their organization.
 * Uses the service-role client (no RLS). Tables deleted in FK-safe order.
 */
export async function purgeUserAndOrg(userId: string) {
  const sb = createAdminClient();

  const { data: profile } = await sb
    .from("profiles")
    .select("org_id")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.org_id) {
    const orgId = profile.org_id;

    await sb.from("alerts").delete().eq("org_id", orgId);
    await sb.from("import_jobs").delete().eq("org_id", orgId);
    await sb.from("chat_threads").delete().eq("org_id", orgId);
    await sb.from("daily_stats").delete().eq("org_id", orgId);
    await sb.from("orders").delete().eq("org_id", orgId);
    await sb.from("products").delete().eq("org_id", orgId);
    await sb.from("channels").delete().eq("org_id", orgId);
    await sb.from("cost_settings").delete().eq("org_id", orgId);
    await sb.from("channel_pnl_settings").delete().eq("org_id", orgId);
    await sb.from("organizations").delete().eq("id", orgId);
  }

  await sb.from("subscriptions").delete().eq("user_id", userId);
  await sb.from("account_deletion_requests").update({ status: "completed", completed_at: new Date().toISOString() }).eq("user_id", userId).eq("status", "pending");
  await sb.from("profiles").delete().eq("id", userId);

  const { error } = await sb.auth.admin.deleteUser(userId);
  if (error) {
    console.error("[purgeUserAndOrg] Failed to delete auth user:", error);
    throw new Error(`Auth user deletion failed: ${error.message}`);
  }
}
