import { NextResponse } from "next/server";
import crypto from "crypto";
import { generatePKCE, getEtsyAuthUrl } from "@/lib/etsy/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { codeVerifier, codeChallenge } = generatePKCE();
  const nonce = crypto.randomBytes(16).toString("hex");
  const state = `${nonce}:${user.id}:${codeVerifier}`;

  const authUrl = getEtsyAuthUrl(state, codeChallenge);
  return NextResponse.redirect(authUrl);
}
