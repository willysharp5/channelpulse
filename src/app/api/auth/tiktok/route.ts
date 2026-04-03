import { NextResponse } from "next/server";
import crypto from "crypto";
import { getTikTokAuthUrl } from "@/lib/tiktok/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const state = crypto.randomBytes(16).toString("hex") + ":" + user.id;
  const authUrl = getTikTokAuthUrl(state);
  return NextResponse.redirect(authUrl);
}
