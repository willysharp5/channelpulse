import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.channelpulse.us";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const userId = searchParams.get("user");

  if (!token || !userId) {
    return NextResponse.redirect(`${APP_URL}/login?error=invalid_verification_link`);
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const sb = createAdminClient();

  const { data: profile } = await sb
    .from("profiles")
    .select("verification_token_hash, verification_token_expires_at, email_verified")
    .eq("id", userId)
    .single();

  if (!profile) {
    return NextResponse.redirect(`${APP_URL}/login?error=account_not_found`);
  }

  if (profile.email_verified) {
    return NextResponse.redirect(`${APP_URL}/login?verified=already`);
  }

  if (profile.verification_token_hash !== tokenHash) {
    return NextResponse.redirect(`${APP_URL}/login?error=invalid_verification_link`);
  }

  if (profile.verification_token_expires_at && new Date(profile.verification_token_expires_at) < new Date()) {
    return NextResponse.redirect(`${APP_URL}/login?error=verification_link_expired`);
  }

  await sb
    .from("profiles")
    .update({
      email_verified: true,
      verification_token_hash: null,
      verification_token_expires_at: null,
    })
    .eq("id", userId);

  return NextResponse.redirect(`${APP_URL}/login?verified=true`);
}
