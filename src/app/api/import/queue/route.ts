import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgId } from "@/lib/queries";
import { processImportJobById } from "@/lib/import/run-import-job";
import { rejectIfImportTooManyRows } from "../_shared";
import type { ImportType } from "@/lib/import/templates";

const TYPES = new Set<ImportType>(["orders", "products", "inventory"]);

/** Allow long product/inventory imports on hosts that support it (e.g. Vercel Pro). */
export const maxDuration = 300;

function skipInlineWorker(): boolean {
  const v = process.env.IMPORT_SKIP_INLINE_WORKER;
  return v === "1" || v === "true";
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrgId();
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const body = (await request.json()) as {
      channelId?: string;
      importType?: string;
      rows?: Record<string, string>[];
    };
    const channelId = body.channelId;
    const importType = body.importType as ImportType | undefined;
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (!channelId || !importType || rows.length === 0) {
      return NextResponse.json({ error: "channelId, importType, and rows required" }, { status: 400 });
    }

    if (!TYPES.has(importType)) {
      return NextResponse.json({ error: "Invalid importType" }, { status: 400 });
    }

    const tooMany = rejectIfImportTooManyRows(rows.length);
    if (tooMany) return tooMany;

    const { data: channel, error: chErr } = await supabase
      .from("channels")
      .select("id, org_id")
      .eq("id", channelId)
      .maybeSingle();

    if (chErr || !channel || channel.org_id !== orgId) {
      return NextResponse.json({ error: "Invalid channel" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: job, error: insErr } = await admin
      .from("import_jobs")
      .insert({
        org_id: orgId,
        channel_id: channelId,
        user_id: user.id,
        import_type: importType,
        status: "queued",
        rows,
      })
      .select("id")
      .single();

    if (insErr || !job) {
      return NextResponse.json({ error: insErr?.message ?? "Failed to queue import" }, { status: 500 });
    }

    // By default, run this job in the same request so imports work without a separate cron.
    // Opt out with IMPORT_SKIP_INLINE_WORKER=true and schedule POST /api/import/cron (Bearer CRON_SECRET).
    if (!skipInlineWorker()) {
      const outcome = await processImportJobById(job.id);
      if (!outcome.processed) {
        return NextResponse.json(
          { error: outcome.reason, jobId: job.id },
          { status: 500 }
        );
      }
      if (outcome.status === "failed") {
        return NextResponse.json(
          {
            error: outcome.error ?? "Import failed",
            jobId: job.id,
          },
          { status: 500 }
        );
      }
      return NextResponse.json({
        jobId: job.id,
        message: "Import finished.",
        jobCompleted: true,
        imported: outcome.imported,
        skipped: outcome.skipped,
        insertedNew: outcome.insertedNew,
        updatedExisting: outcome.updatedExisting,
        outcomeSummary: outcome.outcomeSummary,
      });
    }

    return NextResponse.json({
      jobId: job.id,
      message:
        "Your import is in line and should start shortly. You’ll get a notice when it’s done.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Queue failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
