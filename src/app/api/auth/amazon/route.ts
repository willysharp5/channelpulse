import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAmazonAuthUrl } from "@/lib/amazon/config";
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
  const authUrl = getAmazonAuthUrl(state);
  return NextResponse.redirect(authUrl);
}
