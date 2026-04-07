import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendVerificationEmail } from "@/lib/auth/verification-email";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await sendVerificationEmail(user.id, user.email);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[resend-verification] Failed:", e);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
