import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mergeReportingPrefs, parseReportingPrefs } from "@/lib/reporting-channel-filter";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
  if (!profile?.org_id) return NextResponse.json({ excluded_channel_ids: [] });

  const { data: org, error } = await supabase
    .from("organizations")
    .select("reporting_preferences")
    .eq("id", profile.org_id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(parseReportingPrefs(org?.reporting_preferences));
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
  if (!profile?.org_id) return NextResponse.json({ error: "No org" }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as { excluded_channel_ids?: unknown };
  const merged = mergeReportingPrefs({ excluded_channel_ids: body.excluded_channel_ids });

  const { data: channelRows } = await supabase.from("channels").select("id").eq("org_id", profile.org_id);
  const validIds = new Set((channelRows ?? []).map((r) => String(r.id)));
  const sanitized = {
    excluded_channel_ids: merged.excluded_channel_ids.filter((id) => validIds.has(id)),
  };

  const { data: orgRow } = await supabase
    .from("organizations")
    .select("reporting_preferences")
    .eq("id", profile.org_id)
    .maybeSingle();
  const prev =
    orgRow?.reporting_preferences && typeof orgRow.reporting_preferences === "object" && !Array.isArray(orgRow.reporting_preferences)
      ? (orgRow.reporting_preferences as Record<string, unknown>)
      : {};
  const mergedPrefs = { ...prev, ...sanitized };

  const { error } = await supabase
    .from("organizations")
    .update({ reporting_preferences: mergedPrefs as unknown as Record<string, unknown> })
    .eq("id", profile.org_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(sanitized);
}
