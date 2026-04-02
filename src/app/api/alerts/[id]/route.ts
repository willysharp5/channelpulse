import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
  if (!profile?.org_id) return NextResponse.json({ error: "No org" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const patch: Record<string, boolean> = {};
  if (typeof body.is_read === "boolean") patch.is_read = body.is_read;
  if (typeof body.is_dismissed === "boolean") patch.is_dismissed = body.is_dismissed;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Provide is_read and/or is_dismissed" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("alerts")
    .update(patch)
    .eq("id", id)
    .eq("org_id", profile.org_id)
    .select("id, is_read, is_dismissed")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
