import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/queries";
import { exceedsImportRowLimit, importRowLimitMessage } from "@/lib/import/limits";

export async function requireOrgAndChannel(channelId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Unauthorized" as const, status: 401 as const, supabase: null, orgId: null, channel: null };
  }

  const orgId = await getOrgId();
  if (!orgId) {
    return { error: "No organization" as const, status: 400 as const, supabase, orgId: null, channel: null };
  }

  const { data: channel, error: chErr } = await supabase
    .from("channels")
    .select("id, org_id, platform")
    .eq("id", channelId)
    .maybeSingle();

  if (chErr || !channel || channel.org_id !== orgId) {
    return { error: "Invalid channel" as const, status: 403 as const, supabase, orgId, channel: null };
  }

  return { error: null, status: 200 as const, supabase, orgId, channel };
}

/** Reject if the request body contains too many rows (must run after auth). */
export function rejectIfImportTooManyRows(rowCount: number): NextResponse | null {
  if (!exceedsImportRowLimit(rowCount)) return null;
  return NextResponse.json({ error: importRowLimitMessage(rowCount) }, { status: 400 });
}
