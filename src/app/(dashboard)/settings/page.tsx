import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { SettingsContent } from "@/components/settings/settings-content";
import { getUserOrg, getChannels, getUserPlan } from "@/lib/queries";
import { getSession } from "@/lib/auth/actions";
import { mergeNotificationPrefs } from "@/lib/alerts";
import { Skeleton } from "@/components/ui/skeleton";
import { getImpersonatedUserId } from "@/lib/admin/impersonate";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [realUser, userOrg, channels, { plan }, impersonatedUserId] = await Promise.all([
    getSession(),
    getUserOrg(),
    getChannels(),
    getUserPlan(),
    getImpersonatedUserId(),
  ]);

  let displayEmail = realUser?.email ?? "";
  let displayProviders: string[] = ["email"];

  if (impersonatedUserId) {
    const sb = createAdminClient();
    const { data: authUser } = await sb.auth.admin.getUserById(impersonatedUserId);
    if (authUser?.user) {
      displayEmail = authUser.user.email ?? "";
      displayProviders = Array.isArray(authUser.user.app_metadata?.providers)
        ? (authUser.user.app_metadata.providers as string[])
        : authUser.user.app_metadata?.provider
          ? [authUser.user.app_metadata.provider as string]
          : ["email"];
    }
  } else if (realUser) {
    displayProviders = Array.isArray(realUser.app_metadata?.providers)
      ? (realUser.app_metadata.providers as string[])
      : realUser.app_metadata?.provider
        ? [realUser.app_metadata.provider as string]
        : ["email"];
  }

  const orgRaw = userOrg?.profile?.organizations as unknown;
  const org = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as {
    name?: string;
    notification_preferences?: unknown;
  } | null;

  return (
    <>
      <Header title="Settings" userEmail={displayEmail || undefined} />
      <Suspense
        fallback={
          <div className="flex-1 space-y-4 p-6">
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        }
      >
        <SettingsContent
          email={displayEmail}
          businessName={org?.name ?? userOrg?.profile?.organizations?.name ?? ""}
          plan={plan}
          notificationPrefs={mergeNotificationPrefs(org?.notification_preferences)}
          channels={channels}
          authProviders={displayProviders}
        />
      </Suspense>
    </>
  );
}
