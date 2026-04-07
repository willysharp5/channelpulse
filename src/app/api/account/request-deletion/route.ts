import { randomBytes, createHash } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendDeletionScheduledEmail } from "@/lib/account/deletion-emails";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const sb = createAdminClient();

  const { data: existing } = await sb
    .from("account_deletion_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Deletion already requested" }, { status: 409 });
  }

  const { data: profile } = await sb
    .from("profiles")
    .select("org_id, full_name, organizations(name)")
    .eq("id", user.id)
    .maybeSingle();

  const orgRaw = profile?.organizations as unknown;
  const org = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as { name?: string } | null;

  const { data: sub } = await sb
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const cancelToken = randomBytes(32).toString("hex");
  const cancelTokenHash = createHash("sha256").update(cancelToken).digest("hex");
  const purgeAfterAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
  const cancelTokenExpiresAt = purgeAfterAt;

  const { error: insertError } = await sb.from("account_deletion_requests").insert({
    user_id: user.id,
    org_id: profile?.org_id ?? null,
    email: user.email,
    business_name: org?.name ?? profile?.full_name ?? null,
    stripe_customer_id: sub?.stripe_customer_id ?? null,
    status: "pending",
    purge_after_at: purgeAfterAt,
    cancel_token_hash: cancelTokenHash,
    cancel_token_expires_at: cancelTokenExpiresAt,
  });

  if (insertError) {
    console.error("[request-deletion] insert error:", insertError);
    return NextResponse.json({ error: "Failed to create deletion request" }, { status: 500 });
  }

  await sb
    .from("profiles")
    .update({
      deletion_status: "pending_deletion",
      deletion_requested_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  try {
    await sendDeletionScheduledEmail(user.email!, purgeAfterAt, cancelToken);
  } catch (e) {
    console.error("[request-deletion] email failed:", e);
  }

  await supabase.auth.signOut();

  return NextResponse.json({ ok: true, purge_after_at: purgeAfterAt });
}
