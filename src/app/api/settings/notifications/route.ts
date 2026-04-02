import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mergeNotificationPrefs, type NotificationPreferences } from "@/lib/alerts";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, organizations(notification_preferences)")
    .eq("id", user.id)
    .single();

  const orgRaw = profile?.organizations as unknown;
  const org = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as { notification_preferences?: unknown } | null;
  const prefs = mergeNotificationPrefs(org?.notification_preferences);

  return NextResponse.json(prefs);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
  if (!profile?.org_id) return NextResponse.json({ error: "No org" }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as NotificationPreferences;
  const merged = mergeNotificationPrefs(body);

  const { error } = await supabase
    .from("organizations")
    .update({ notification_preferences: merged as unknown as Record<string, unknown> })
    .eq("id", profile.org_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(merged);
}
