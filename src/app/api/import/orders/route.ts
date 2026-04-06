import { NextResponse } from "next/server";
import { rejectIfImportTooManyRows, requireOrgAndChannel } from "../_shared";
import { executeImportJob } from "@/lib/import/execute-import";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { channelId?: string; rows?: Record<string, string>[] };
    const channelId = body.channelId;
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (!channelId || rows.length === 0) {
      return NextResponse.json({ error: "channelId and rows required" }, { status: 400 });
    }

    const ctx = await requireOrgAndChannel(channelId);
    if (ctx.error || !ctx.supabase || !ctx.orgId || !ctx.channel) {
      return NextResponse.json({ error: ctx.error ?? "Forbidden" }, { status: ctx.status });
    }

    const tooMany = rejectIfImportTooManyRows(rows.length);
    if (tooMany) return tooMany;

    const platform = String(ctx.channel.platform);
    const result = await executeImportJob(ctx.supabase, {
      id: "",
      org_id: ctx.orgId,
      channel_id: channelId,
      import_type: "orders",
      rows,
    }, platform);

    if (result.error && result.imported === 0) {
      return NextResponse.json(
        { error: result.error, imported: result.imported, skipped: result.skipped },
        { status: 400 }
      );
    }

    if (result.error) {
      return NextResponse.json(
        { error: result.error, imported: result.imported, skipped: result.skipped },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imported: result.imported,
      skipped: result.skipped,
      inserted_new: result.insertedNew,
      updated_existing: result.updatedExisting,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Import failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
