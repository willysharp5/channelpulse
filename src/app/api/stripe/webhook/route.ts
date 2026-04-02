import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe, getPlanByPriceId } from "@/lib/stripe/config";
import { createAdminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";

function getSubPeriod(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  return {
    start: item?.current_period_start
      ? new Date(item.current_period_start * 1000).toISOString()
      : null,
    end: item?.current_period_end
      ? new Date(item.current_period_end * 1000).toISOString()
      : null,
  };
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  let event: Stripe.Event;

  try {
    if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const sb = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const userId = session.metadata?.supabase_user_id;
        const planKey = session.metadata?.plan;
        if (!userId || !planKey) break;

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        const period = getSubPeriod(subscription);

        await sb.from("subscriptions").upsert(
          {
            user_id: userId,
            plan: planKey,
            status: "active",
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription.id,
            amount: subscription.items.data[0]?.price?.unit_amount ?? 0,
            currency: subscription.currency,
            current_period_start: period.start,
            current_period_end: period.end,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const period = getSubPeriod(subscription);

        const priceId = subscription.items.data[0]?.price?.id;
        const plan = priceId ? getPlanByPriceId(priceId) : null;

        const statusMap: Record<string, string> = {
          active: "active",
          past_due: "past_due",
          canceled: "cancelled",
          trialing: "trialing",
          incomplete: "past_due",
          unpaid: "past_due",
        };

        await sb
          .from("subscriptions")
          .update({
            status: statusMap[subscription.status] ?? "active",
            plan: plan ?? undefined,
            amount: subscription.items.data[0]?.price?.unit_amount ?? 0,
            current_period_start: period.start,
            current_period_end: period.end,
            cancelled_at: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await sb
          .from("subscriptions")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }
    }
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
