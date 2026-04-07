import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendDeletionCancelledEmail } from "@/lib/account/deletion-emails";

export async function POST(request: Request) {
  let body: { token?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = body.token;
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const sb = createAdminClient();

  const { data: req } = await sb
    .from("account_deletion_requests")
    .select("id, user_id, email, cancel_token_expires_at")
    .eq("cancel_token_hash", tokenHash)
    .eq("status", "pending")
    .maybeSingle();

  if (!req) {
    return NextResponse.json(
      { error: "Invalid or expired recovery link. The request may have already been processed." },
      { status: 404 }
    );
  }

  if (req.cancel_token_expires_at && new Date(req.cancel_token_expires_at) < new Date()) {
    return NextResponse.json(
      { error: "This recovery link has expired. Contact support for help." },
      { status: 410 }
    );
  }

  await sb
    .from("account_deletion_requests")
    .update({ status: "cancelled_by_user", cancel_token_hash: null })
    .eq("id", req.id);

  await sb
    .from("profiles")
    .update({ deletion_status: "none", deletion_requested_at: null })
    .eq("id", req.user_id);

  try {
    await sendDeletionCancelledEmail(req.email);
  } catch (e) {
    console.error("[cancel-deletion] email failed:", e);
  }

  return NextResponse.json({ ok: true });
}
