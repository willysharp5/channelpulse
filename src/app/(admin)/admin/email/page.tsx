import { createAdminClient } from "@/lib/supabase/admin";
import { EmailTemplatesClient } from "@/components/admin/email-templates-client";

export const dynamic = "force-dynamic";

export default async function AdminEmailPage() {
  const sb = createAdminClient();

  const { data: templates } = await sb
    .from("email_templates")
    .select("*")
    .order("slug", { ascending: true });

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email Templates</h1>
        <p className="text-muted-foreground">
          Edit email templates and send test emails. Changes take effect
          immediately for all users.
        </p>
      </div>
      <EmailTemplatesClient initialTemplates={templates ?? []} />
    </div>
  );
}
