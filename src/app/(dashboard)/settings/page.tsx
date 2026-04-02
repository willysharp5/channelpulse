import { Header } from "@/components/layout/header";
import { SettingsContent } from "@/components/settings/settings-content";
import { getUserOrg, getChannels, getUserPlan } from "@/lib/queries";
import { getSession } from "@/lib/auth/actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [user, userOrg, channels, { plan }] = await Promise.all([
    getSession(),
    getUserOrg(),
    getChannels(),
    getUserPlan(),
  ]);

  return (
    <>
      <Header title="Settings" userEmail={user?.email ?? undefined} />
      <SettingsContent
        email={user?.email ?? ""}
        businessName={userOrg?.profile?.organizations?.name ?? ""}
        plan={plan}
        channels={channels}
      />
    </>
  );
}
