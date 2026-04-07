import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { purgeUserAndOrg } from "@/lib/account/purge-user-and-org";
import { sendDeletionCompletedEmail } from "@/lib/account/deletion-emails";

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sb = createAdminClient();

  const { data: req } = await sb
    .from("account_deletion_requests")
    .select("*")
    .eq("id", id)
    .eq("status", "pending")
    .maybeSingle();

  if (!req) {
    return NextResponse.json(
      { error: "Deletion request not found or already processed" },
      { status: 404 }
    );
  }

  try {
    await purgeUserAndOrg(req.user_id);
  } catch (e) {
    console.error("[admin purge] purgeUserAndOrg failed:", e);
    return NextResponse.json(
      { error: `Purge failed: ${e instanceof Error ? e.message : "Unknown error"}` },
      { status: 500 }
    );
  }

  await sb
    .from("account_deletion_requests")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id);

  try {
    if (req.email) {
      await sendDeletionCompletedEmail(req.email);
    }
  } catch (e) {
    console.error("[admin purge] completion email failed:", e);
  }

  return NextResponse.json({ ok: true });
}
