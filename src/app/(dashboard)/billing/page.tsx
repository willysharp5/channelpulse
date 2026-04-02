import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlans } from "@/lib/plans";
import { BillingClient } from "@/components/billing/billing-page";
import { CheckoutSync } from "@/components/billing/checkout-sync";
import { Header } from "@/components/layout/header";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currentPlan = "free";
  let subscription = null;

  if (user) {
    const sb = createAdminClient();
    const { data: sub } = await sb
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (sub) {
      currentPlan = sub.plan;
      subscription = sub;
    }
  }

  const allPlans = await getPlans();
  const paidPlans = allPlans
    .filter((p) => p.id !== "free")
    .map((p) => ({
      key: p.id,
      name: p.name,
      price: p.price_amount / 100,
      features: p.features,
      popular: p.is_popular,
      stripePriceId: p.stripe_price_id,
    }));

  const freePlan = allPlans.find((p) => p.id === "free");

  return (
    <>
      <Header title="Billing" userEmail={user?.email ?? undefined} />
      <div className="flex-1 p-6">
        {params.checkout === "success" && (
          <CheckoutSync currentPlan={currentPlan} />
        )}
        {params.checkout === "cancelled" && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Checkout was cancelled. No charges were made.
            </p>
          </div>
        )}
        <BillingClient
          plans={paidPlans}
          currentPlan={currentPlan}
          subscription={subscription}
          freeFeatures={freePlan?.features ?? []}
        />
      </div>
    </>
  );
}
