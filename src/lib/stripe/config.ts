import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    });
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
    priceId: "price_1THYPt3G9zqJIlndIE69WiGH",
    productId: "prod_UG4YMa5euVWayk",
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
    priceId: "price_1THYPv3G9zqJIlndOOg4FltX",
    productId: "prod_UG4Y5idBw8IO0V",
    price: 39,
    channels: 5,
    ordersPerMonth: 25000,
    popular: true,
    features: [
      "5 sales channels",
      "25,000 orders/month",
      "90-day history",
      "P&L by channel",
      "CSV export",
      "Custom alerts",
    ],
  },
  scale: {
    name: "Scale",
    priceId: "price_1THYPy3G9zqJIlndzVmOWMvu",
    productId: "prod_UG4YyVoFWOMYKi",
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
