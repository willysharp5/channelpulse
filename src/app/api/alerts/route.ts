import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
  if (!profile?.org_id) return NextResponse.json({ alerts: [], unreadCount: 0 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "50")));

  const { data: alerts, error } = await supabase
    .from("alerts")
    .select("id, type, severity, title, message, metadata, is_read, is_dismissed, created_at")
    .eq("org_id", profile.org_id)
    .eq("is_dismissed", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[alerts GET]", error.message);
    return NextResponse.json({ alerts: [], unreadCount: 0 });
  }

  const list = alerts ?? [];
  const unreadCount = list.filter((a) => !a.is_read).length;

  return NextResponse.json({ alerts: list, unreadCount });
}
