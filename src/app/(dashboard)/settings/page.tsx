import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { SettingsContent } from "@/components/settings/settings-content";
import { getUserOrg, getChannels, getUserPlan } from "@/lib/queries";
import { getSession } from "@/lib/auth/actions";
import { mergeNotificationPrefs } from "@/lib/alerts";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [user, userOrg, channels, { plan }] = await Promise.all([
    getSession(),
    getUserOrg(),
    getChannels(),
    getUserPlan(),
  ]);

  const orgRaw = userOrg?.profile?.organizations as unknown;
  const org = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as {
    name?: string;
    notification_preferences?: unknown;
  } | null;

  return (
    <>
      <Header title="Settings" userEmail={user?.email ?? undefined} />
      <Suspense
        fallback={
          <div className="flex-1 space-y-4 p-6">
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        }
      >
        <SettingsContent
          email={user?.email ?? ""}
          businessName={org?.name ?? userOrg?.profile?.organizations?.name ?? ""}
          plan={plan}
          notificationPrefs={mergeNotificationPrefs(org?.notification_preferences)}
          channels={channels}
        />
      </Suspense>
    </>
  );
}
