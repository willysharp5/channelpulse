import { createAdminClient } from "@/lib/supabase/admin";
import { AiSettingsClient } from "@/components/admin/ai-settings-client";

export const dynamic = "force-dynamic";

export default async function AdminAiSettingsPage() {
  const sb = createAdminClient();

  const [{ data: aiConfig }, { data: reports }, { data: presets }] =
    await Promise.all([
      sb.from("ai_config").select("*").limit(1).single(),
      sb
        .from("suggested_reports")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      sb
        .from("ai_model_presets")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Settings</h1>
        <p className="text-muted-foreground">
          Configure the AI model, system prompt, and suggested questions users
          see in AI Insights.
        </p>
      </div>
      <AiSettingsClient
        initialConfig={aiConfig}
        initialReports={reports ?? []}
        initialPresets={presets ?? []}
      />
    </div>
  );
}
