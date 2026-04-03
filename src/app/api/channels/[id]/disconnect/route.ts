import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  const { data: channel } = await supabase
    .from("channels")
    .select("id, org_id, name, platform")
    .eq("id", id)
    .single();

  if (!channel || channel.org_id !== profile?.org_id) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const sb = createAdminClient();

  await sb
    .from("channels")
    .update({
      status: "disconnected",
      credentials: {},
      last_sync_status: "disconnected",
    })
    .eq("id", id);

  return NextResponse.json({ ok: true, channel: channel.name });
}
