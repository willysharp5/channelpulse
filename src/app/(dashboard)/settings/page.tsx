import { Header } from "@/components/layout/header";
import { SettingsContent } from "@/components/settings/settings-content";
import { getUserOrg, getChannels } from "@/lib/queries";
import { getSession } from "@/lib/auth/actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [user, userOrg, channels] = await Promise.all([
    getSession(),
    getUserOrg(),
    getChannels(),
  ]);

  return (
    <>
      <Header title="Settings" userEmail={user?.email ?? undefined} />
      <SettingsContent
        email={user?.email ?? ""}
        businessName={userOrg?.profile?.organizations?.name ?? ""}
        plan={userOrg?.profile?.organizations?.plan ?? "free"}
        channels={channels}
      />
    </>
  );
}
