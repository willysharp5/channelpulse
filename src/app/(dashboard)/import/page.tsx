import { Header } from "@/components/layout/header";
import { ImportWizardClient } from "@/components/import/import-wizard-client";
import { getChannels } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const raw = await getChannels();
  const channels = (raw ?? []).map((c: { id: string; name: string; platform: string }) => ({
    id: c.id,
    name: c.name,
    platform: c.platform,
  }));

  return (
    <>
      <Header title="Import data" userEmail={user?.email ?? undefined} />
      <div className="flex-1 p-6">
        <ImportWizardClient channels={channels} />
      </div>
    </>
  );
}
