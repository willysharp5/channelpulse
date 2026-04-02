import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, organizations(onboarding_completed, name)")
    .eq("id", user.id)
    .single();

  const orgRaw = profile?.organizations as unknown;
  const org = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as { onboarding_completed: boolean; name: string } | null;

  if (org?.onboarding_completed) {
    redirect("/");
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center p-4">
          <Skeleton className="h-[320px] w-full max-w-lg rounded-xl" />
        </div>
      }
    >
      <OnboardingWizard userName={org?.name || user.user_metadata?.business_name} />
    </Suspense>
  );
}
