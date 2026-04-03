import type { SupabaseClient } from "@supabase/supabase-js";

export type ReportingChannelsFilter =
  | { kind: "none" }
  | { kind: "include_only"; channelIds: string[] };

export function parseReportingPrefs(raw: unknown): { excluded_channel_ids: string[] } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { excluded_channel_ids: [] };
  }
  const o = raw as Record<string, unknown>;
  const xs = o.excluded_channel_ids;
  if (!Array.isArray(xs)) return { excluded_channel_ids: [] };
  return {
    excluded_channel_ids: xs.filter((x): x is string => typeof x === "string" && x.length > 0),
  };
}

export function mergeReportingPrefs(partial: { excluded_channel_ids?: unknown }): {
  excluded_channel_ids: string[];
} {
  const xs = partial.excluded_channel_ids;
  if (!Array.isArray(xs)) return { excluded_channel_ids: [] };
  return {
    excluded_channel_ids: xs.filter((x): x is string => typeof x === "string" && x.length > 0),
  };
}

/**
 * When some channels are excluded for reporting, returns `include_only` with remaining channel ids.
 * Empty list means every channel is excluded.
 */
export async function buildReportingChannelsFilter(
  supabase: SupabaseClient,
  orgId: string
): Promise<ReportingChannelsFilter> {
  const [{ data: org }, { data: channels }] = await Promise.all([
    supabase.from("organizations").select("reporting_preferences").eq("id", orgId).maybeSingle(),
    supabase.from("channels").select("id").eq("org_id", orgId),
  ]);
  const excluded = new Set(parseReportingPrefs(org?.reporting_preferences).excluded_channel_ids);
  const allIds = (channels ?? []).map((c) => String(c.id));
  if (excluded.size === 0) return { kind: "none" };
  const included = allIds.filter((id) => !excluded.has(id));
  return { kind: "include_only", channelIds: included };
}

/** Pass to RPCs: null = no filter, uuid[] = restrict to these channels */
export function rpcChannelIdsParam(filter: ReportingChannelsFilter): string[] | null {
  if (filter.kind === "none") return null;
  return filter.channelIds;
}
