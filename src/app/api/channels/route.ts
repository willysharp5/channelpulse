import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getChannels, getOrgId } from "@/lib/queries";
import { parseReportingPrefs } from "@/lib/reporting-channel-filter";

export async function GET() {
  try {
    const channels = await getChannels();
    const orgId = await getOrgId();
    let excluded_channel_ids: string[] = [];
    if (orgId) {
      const supabase = await createClient();
      const { data: org, error: prefErr } = await supabase
        .from("organizations")
        .select("reporting_preferences")
        .eq("id", orgId)
        .maybeSingle();
      if (!prefErr) {
        excluded_channel_ids = parseReportingPrefs(org?.reporting_preferences).excluded_channel_ids;
      }
    }
    return NextResponse.json({ channels, excluded_channel_ids });
  } catch {
    return NextResponse.json({ channels: [], excluded_channel_ids: [] });
  }
}
