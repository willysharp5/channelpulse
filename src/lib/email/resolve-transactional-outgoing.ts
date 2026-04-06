import type { SupabaseClient } from "@supabase/supabase-js";
import { emailLayout } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/resend";

export async function resolveTransactionalOutgoing(
  supabase: SupabaseClient,
  slug: string,
  buildDefault: () => { subject: string; html: string }
): Promise<{ skip: true } | { skip: false; subject: string; html: string }> {
  const { data: row } = await supabase
    .from("transactional_email_templates")
    .select("is_active, subject, body_html")
    .eq("slug", slug)
    .maybeSingle();

  if (row?.is_active === false) {
    return { skip: true };
  }

  const def = buildDefault();
  const hasSubj = Boolean(row?.subject?.trim());
  const hasBody = Boolean(row?.body_html?.trim());

  if (!hasSubj && !hasBody) {
    return { skip: false, subject: def.subject, html: def.html };
  }

  const subject = hasSubj ? row!.subject!.trim() : def.subject;
  const html = hasBody ? emailLayout(subject, row!.body_html!.trim()) : def.html;
  return { skip: false, subject, html };
}

export async function sendTransactionalIfEnabled(
  supabase: SupabaseClient,
  slug: string,
  to: string,
  buildDefault: () => { subject: string; html: string }
): Promise<boolean> {
  const resolved = await resolveTransactionalOutgoing(supabase, slug, buildDefault);
  if (resolved.skip) return false;
  const result = await sendEmail({
    to,
    subject: resolved.subject,
    html: resolved.html,
  });
  return Boolean(result);
}
