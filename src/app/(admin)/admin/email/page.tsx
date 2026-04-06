import { Suspense } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmailTemplatesClient } from "@/components/admin/email-templates-client";
import { ensureTransactionalEmailTemplates } from "@/lib/email/transactional-seed";

export const dynamic = "force-dynamic";

export default async function AdminEmailPage() {
  const sb = createAdminClient();

  await ensureTransactionalEmailTemplates(sb);

  const [{ data: templates }, { data: transactionalTemplates }] = await Promise.all([
    sb.from("email_templates").select("*").order("slug", { ascending: true }),
    sb.from("transactional_email_templates").select("*").order("slug", { ascending: true }),
  ]);

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email templates</h1>
        <ul className="mt-2 max-w-2xl list-disc space-y-1 pl-5 text-sm leading-snug text-muted-foreground">
          <li>
            <strong>Transactional</strong> — alert emails ChannelPulse sends automatically (inventory, sync, digest,
            revenue/order notices). Edited via <span className="font-mono text-xs">transactional_email_templates</span>.
          </li>
          <li>
            <strong>Database templates</strong> — marketing-style content in{" "}
            <span className="font-mono text-xs">email_templates</span> for flows that read that table.
          </li>
        </ul>
      </div>
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">Loading email admin…</p>}
      >
        <EmailTemplatesClient
          initialTemplates={templates ?? []}
          initialTransactional={transactionalTemplates ?? []}
        />
      </Suspense>
    </div>
  );
}
