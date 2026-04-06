import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { selectImportJobDetailRow } from "@/lib/import/import-jobs-column-compat";

type ChannelEmbed = { name: string; platform: string };

type ImportJobDetailRaw = {
  id: string;
  org_id: string;
  channel_id: string;
  user_id: string | null;
  import_type: string;
  status: string;
  imported_count: number;
  skipped_count: number;
  inserted_new_count?: number;
  updated_existing_count?: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  rows: unknown;
  outcome_summary?: string | null;
  channels: ChannelEmbed | ChannelEmbed[] | null;
};

function normalizeChannel(
  ch: ChannelEmbed | ChannelEmbed[] | null | undefined
): ChannelEmbed | null {
  if (!ch) return null;
  return Array.isArray(ch) ? ch[0] ?? null : ch;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const sb = createAdminClient();
    const { data: raw, error } = await selectImportJobDetailRow(sb, id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const row = raw as unknown as ImportJobDetailRaw | null;
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const ch = normalizeChannel(row.channels);
    let user_email: string | null = null;
    let user_full_name: string | null = null;

    if (row.user_id) {
      const { data: profile } = await sb
        .from("profiles")
        .select("full_name")
        .eq("id", row.user_id)
        .maybeSingle();
      const p = profile as { full_name: string | null } | null;
      if (p?.full_name) user_full_name = p.full_name;

      const { data: auth } = await sb.auth.admin.getUserById(row.user_id);
      user_email = auth?.user?.email ?? null;
    }

    const job = {
      id: row.id,
      org_id: row.org_id,
      channel_id: row.channel_id,
      user_id: row.user_id,
      user_email,
      user_full_name,
      import_type: row.import_type,
      status: row.status,
      imported_count: row.imported_count,
      skipped_count: row.skipped_count,
      inserted_new_count: row.inserted_new_count ?? 0,
      updated_existing_count: row.updated_existing_count ?? 0,
      error_message: row.error_message,
      created_at: row.created_at,
      updated_at: row.updated_at,
      started_at: row.started_at,
      completed_at: row.completed_at,
      channel_name: ch?.name ?? null,
      channel_platform: ch?.platform ?? null,
      outcome_summary: row.outcome_summary ?? null,
      rows: row.rows,
    };

    return NextResponse.json({ job });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}
