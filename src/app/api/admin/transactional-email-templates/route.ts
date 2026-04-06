import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureTransactionalEmailTemplates } from "@/lib/email/transactional-seed";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const sb = createAdminClient();
  await ensureTransactionalEmailTemplates(sb);

  const { data, error } = await sb
    .from("transactional_email_templates")
    .select("*")
    .order("slug", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ templates: data ?? [] });
}
