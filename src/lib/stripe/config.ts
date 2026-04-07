import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim());
  }
  return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const STRIPE_PLANS = {
  starter: {
    name: "Starter",
    priceId: "price_1TJPYM3G9zqJIlndVp1yrTbz",
    productId: "prod_UHzXVCWp8rsT2J",
    price: 19,
    channels: 3,
    ordersPerMonth: 5000,
    features: [
      "3 sales channels",
      "5,000 orders/month",
      "30-day history",
      "Low stock alerts",
      "Top products view",
      "Basic inventory",
    ],
  },
  growth: {
    name: "Growth",
    priceId: "price_1TJPYN3G9zqJIlndkGXJjkaV",
    productId: "prod_UHzXU6mwQaQjkO",
    price: 39,
    channels: 5,
    ordersPerMonth: 25000,
    popular: true,
    features: [
      "5 sales channels",
      "25,000 orders/month",
      "90-day history",
      "AI Insights on your synced data",
      "P&L by channel",
      "CSV export",
      "Custom alerts",
    ],
  },
  scale: {
    name: "Scale",
    priceId: "price_1TJPYO3G9zqJIlndoPeUEGPS",
    productId: "prod_UHzXUvKGnWS7P0",
    price: 79,
    channels: 999,
    ordersPerMonth: 999999,
    features: [
      "Highest channel & order limits",
      "1-year history",
      "Full multichannel dashboard & P&L",
      "AI Insights on your synced data",
      "Inventory, products & CSV exports",
      "Alerts & automations",
    ],
  },
} as const;

export type StripePlan = keyof typeof STRIPE_PLANS;

export function getPlanByPriceId(priceId: string): StripePlan | null {
  for (const [key, plan] of Object.entries(STRIPE_PLANS)) {
    if (plan.priceId === priceId) return key as StripePlan;
  }
  return null;
}
