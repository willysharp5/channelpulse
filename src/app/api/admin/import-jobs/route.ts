import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  IMPORT_JOBS_ADMIN_LIST_SELECT_BASE,
  IMPORT_JOBS_ADMIN_LIST_SELECT_FULL,
  IMPORT_JOBS_ADMIN_LIST_SELECT_WITH_SUMMARY,
  importJobsMissingOutcomeSummaryColumnError,
  importJobsMissingUpsertColumnsError,
} from "@/lib/import/import-jobs-column-compat";

const PAGE_SIZE = 20;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function escapeIlike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

type ChannelEmbed = { name: string; platform: string };

type ImportJobRow = {
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
  started_at: string | null;
  completed_at: string | null;
  outcome_summary?: string | null;
  channels: ChannelEmbed | ChannelEmbed[] | null;
};

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const sb = createAdminClient();
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const searchRaw = searchParams.get("search")?.trim() ?? "";
    const statusFilter = searchParams.get("status")?.trim() ?? "";
    const importTypeFilter = searchParams.get("import_type")?.trim() ?? "";

    const offset = (page - 1) * PAGE_SIZE;

    async function runListQuery(selectColumns: string) {
      let q = sb.from("import_jobs").select(selectColumns, { count: "exact" });

      if (statusFilter && ["queued", "running", "completed", "failed"].includes(statusFilter)) {
        q = q.eq("status", statusFilter);
      }

      if (
        importTypeFilter &&
        ["orders", "products", "inventory"].includes(importTypeFilter)
      ) {
        q = q.eq("import_type", importTypeFilter);
      }

      if (searchRaw) {
        const esc = escapeIlike(searchRaw);
        const lowerSearch = searchRaw.toLowerCase();
        const ors: string[] = [];

        if (UUID_RE.test(searchRaw)) {
          ors.push(`id.eq.${searchRaw}`);
          ors.push(`org_id.eq.${searchRaw}`);
          ors.push(`channel_id.eq.${searchRaw}`);
          ors.push(`user_id.eq.${searchRaw}`);
        }

        ors.push(`error_message.ilike.%${esc}%`);
        ors.push(`import_type.ilike.%${esc}%`);
        ors.push(`status.ilike.%${esc}%`);

        const { data: chMatch } = await sb
          .from("channels")
          .select("id")
          .or(`name.ilike.%${esc}%,platform.ilike.%${esc}%`);

        const chIds = (chMatch ?? []).map((c: { id: string }) => c.id);
        if (chIds.length > 0) {
          ors.push(`channel_id.in.(${chIds.join(",")})`);
        }

        /** Match jobs by profile full_name (stored in DB). */
        const { data: profMatch } = await sb
          .from("profiles")
          .select("id")
          .ilike("full_name", `%${esc}%`);
        const userIdsFromName = (profMatch ?? []).map((p: { id: string }) => p.id);

        /** Match jobs by auth email (not on import_jobs row — resolve user ids). */
        const userIdsFromEmail = new Set<string>();
        let authPage = 1;
        for (;;) {
          const {
            data: { users: authUsers },
            error: listErr,
          } = await sb.auth.admin.listUsers({ page: authPage, perPage: 1000 });
          if (listErr) break;
          const batch = authUsers ?? [];
          for (const u of batch) {
            if (u.email?.toLowerCase().includes(lowerSearch)) {
              userIdsFromEmail.add(u.id);
            }
          }
          if (batch.length < 1000) break;
          authPage += 1;
          if (authPage > 50) break;
        }

        const userIdsForOr = [...new Set([...userIdsFromName, ...userIdsFromEmail])];
        if (userIdsForOr.length > 0) {
          ors.push(`user_id.in.(${userIdsForOr.join(",")})`);
        }

        q = q.or(ors.join(","));
      }

      return q.order("created_at", { ascending: false }).range(offset, offset + PAGE_SIZE - 1);
    }

    let { data: rows, error, count } = await runListQuery(IMPORT_JOBS_ADMIN_LIST_SELECT_WITH_SUMMARY);
    if (error && importJobsMissingOutcomeSummaryColumnError(error)) {
      ({ data: rows, error, count } = await runListQuery(IMPORT_JOBS_ADMIN_LIST_SELECT_FULL));
    }
    if (error && importJobsMissingUpsertColumnsError(error)) {
      ({ data: rows, error, count } = await runListQuery(IMPORT_JOBS_ADMIN_LIST_SELECT_BASE));
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const list = (rows ?? []) as unknown as ImportJobRow[];
    const userIds = [...new Set(list.map((r) => r.user_id).filter(Boolean))] as string[];

    const emailById = new Map<string, string>();
    const nameById = new Map<string, string>();

    function normalizeChannel(
      ch: ChannelEmbed | ChannelEmbed[] | null | undefined
    ): ChannelEmbed | null {
      if (!ch) return null;
      return Array.isArray(ch) ? ch[0] ?? null : ch;
    }

    if (userIds.length > 0) {
      const { data: profiles } = await sb
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      for (const p of profiles ?? []) {
        const row = p as { id: string; full_name: string | null };
        if (row.full_name) nameById.set(row.id, row.full_name);
      }

      await Promise.all(
        userIds.map(async (uid) => {
          const { data } = await sb.auth.admin.getUserById(uid);
          const email = data?.user?.email;
          if (email) emailById.set(uid, email);
        })
      );
    }

    const jobs = list.map((r) => {
      const uid = r.user_id;
      const ch = normalizeChannel(r.channels);
      return {
        id: r.id,
        org_id: r.org_id,
        channel_id: r.channel_id,
        user_id: r.user_id,
        user_email: uid ? emailById.get(uid) ?? null : null,
        user_full_name: uid ? nameById.get(uid) ?? null : null,
        import_type: r.import_type,
        status: r.status,
        imported_count: r.imported_count,
        skipped_count: r.skipped_count,
        inserted_new_count: r.inserted_new_count ?? 0,
        updated_existing_count: r.updated_existing_count ?? 0,
        error_message: r.error_message,
        created_at: r.created_at,
        started_at: r.started_at,
        completed_at: r.completed_at,
        channel_name: ch?.name ?? null,
        channel_platform: ch?.platform ?? null,
        outcome_summary: r.outcome_summary ?? null,
      };
    });

    return NextResponse.json({
      jobs,
      total: count ?? 0,
      page,
      pageSize: PAGE_SIZE,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}
