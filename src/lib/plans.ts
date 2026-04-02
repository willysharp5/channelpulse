import { createAdminClient } from "@/lib/supabase/admin";

export interface PlanConfig {
  id: string;
  name: string;
  display_order: number;
  price_amount: number;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  channels_limit: number;
  orders_per_month: number;
  history_days: number;
  features: string[];
  is_popular: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getPlans(): Promise<PlanConfig[]> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("plan_config")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  return (data ?? []).map((p: Record<string, unknown>) => ({
    ...p,
    features: Array.isArray(p.features) ? p.features : JSON.parse(p.features as string),
  })) as PlanConfig[];
}

export async function getAllPlans(): Promise<PlanConfig[]> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("plan_config")
    .select("*")
    .order("display_order", { ascending: true });

  return (data ?? []).map((p: Record<string, unknown>) => ({
    ...p,
    features: Array.isArray(p.features) ? p.features : JSON.parse(p.features as string),
  })) as PlanConfig[];
}

export async function getPlanLimits(planId: string): Promise<{ channels: number; ordersPerMonth: number }> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("plan_config")
    .select("channels_limit, orders_per_month")
    .eq("id", planId)
    .single();

  return {
    channels: data?.channels_limit ?? 1,
    ordersPerMonth: data?.orders_per_month ?? 100,
  };
}

export async function updatePlan(
  planId: string,
  updates: Partial<Pick<PlanConfig, "name" | "channels_limit" | "orders_per_month" | "history_days" | "features" | "is_popular" | "is_active" | "price_amount">>
) {
  const sb = createAdminClient();
  await sb
    .from("plan_config")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", planId);
}
