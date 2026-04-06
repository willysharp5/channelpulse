import type { SupabaseClient } from "@supabase/supabase-js";
import {
  TRANSACTIONAL_EMAIL_LABELS,
  TRANSACTIONAL_EMAIL_TEST_TYPES,
} from "@/lib/email/transactional-email-meta";

/** Ensure one row per transactional slug (idempotent). */
export async function ensureTransactionalEmailTemplates(sb: SupabaseClient): Promise<void> {
  for (const slug of TRANSACTIONAL_EMAIL_TEST_TYPES) {
    const { data } = await sb
      .from("transactional_email_templates")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (data) continue;

    const meta = TRANSACTIONAL_EMAIL_LABELS[slug];
    await sb.from("transactional_email_templates").insert({
      slug,
      name: meta.title,
      description: meta.description,
      subject: "",
      body_html: "",
      sections: [],
      is_active: true,
    });
  }
}
