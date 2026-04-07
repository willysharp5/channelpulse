import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { purgeUserAndOrg } from "@/lib/account/purge-user-and-org";

/** Legacy instant-delete endpoint. Now calls the shared purge service. */
export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await purgeUserAndOrg(user.id);
    await supabase.auth.signOut();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
