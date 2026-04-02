"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { PlanConfig } from "@/lib/plans";

interface Props {
  plans: PlanConfig[];
}

export function AdminPlanManager({ plans: initialPlans }: Props) {
  const router = useRouter();
  const [editingPlan, setEditingPlan] = useState<PlanConfig | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [priceAmount, setPriceAmount] = useState(0);
  const [channelsLimit, setChannelsLimit] = useState(1);
  const [ordersPerMonth, setOrdersPerMonth] = useState(100);
  const [historyDays, setHistoryDays] = useState(7);
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState("");
  const [isPopular, setIsPopular] = useState(false);

  function openEdit(plan: PlanConfig) {
    setEditingPlan(plan);
    setName(plan.name);
    setPriceAmount(plan.price_amount);
    setChannelsLimit(plan.channels_limit);
    setOrdersPerMonth(plan.orders_per_month);
    setHistoryDays(plan.history_days);
    setFeatures([...plan.features]);
    setNewFeature("");
    setIsPopular(plan.is_popular);
  }

  function addFeature() {
    if (newFeature.trim()) {
      setFeatures([...features, newFeature.trim()]);
      setNewFeature("");
    }
  }

  function removeFeature(index: number) {
    setFeatures(features.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!editingPlan) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/plans/${editingPlan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          price_amount: priceAmount,
          channels_limit: channelsLimit,
          orders_per_month: ordersPerMonth,
          history_days: historyDays,
          features,
          is_popular: isPopular,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${name} plan updated`);
      setEditingPlan(null);
      router.refresh();
    } catch {
      toast.error("Failed to save plan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Pricing Tiers</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Edit plan names, features, and limits. Price changes are display-only — update Stripe separately for billing.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {initialPlans.map((plan) => (
              <div
                key={plan.id}
                className="flex items-start justify-between gap-4 p-4"
              >
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{plan.name}</span>
                    {plan.is_popular && (
                      <Badge className="bg-zinc-900 text-white text-[10px]">
                        Popular
                      </Badge>
                    )}
                    {plan.id === "free" && (
                      <Badge variant="outline" className="text-[10px]">
                        Free
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>
                      ${(plan.price_amount / 100).toFixed(0)}/mo
                    </span>
                    <span>
                      {plan.channels_limit >= 999
                        ? "Unlimited channels"
                        : `${plan.channels_limit} channels`}
                    </span>
                    <span>
                      {plan.orders_per_month >= 999999
                        ? "Unlimited orders"
                        : `${plan.orders_per_month.toLocaleString()} orders/mo`}
                    </span>
                    <span>{plan.history_days >= 365 ? "1 year" : `${plan.history_days}d`} history</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {plan.features.map((f, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-muted px-2 py-0.5 text-[11px]"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(plan)}
                >
                  <Pencil className="mr-1.5 size-3" />
                  Edit
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!editingPlan}
        onOpenChange={(open) => !open && setEditingPlan(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit {editingPlan?.name} Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Plan Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Price (cents)</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    value={priceAmount}
                    onChange={(e) => setPriceAmount(parseInt(e.target.value) || 0)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    = ${(priceAmount / 100).toFixed(2)}/mo
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Channels Limit</Label>
                <Input
                  type="number"
                  value={channelsLimit}
                  onChange={(e) => setChannelsLimit(parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Orders/Month</Label>
                <Input
                  type="number"
                  value={ordersPerMonth}
                  onChange={(e) => setOrdersPerMonth(parseInt(e.target.value) || 100)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>History (days)</Label>
                <Input
                  type="number"
                  value={historyDays}
                  onChange={(e) => setHistoryDays(parseInt(e.target.value) || 7)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={isPopular}
                onCheckedChange={setIsPopular}
              />
              <Label>Mark as &quot;Most Popular&quot;</Label>
            </div>

            <div>
              <Label>Features</Label>
              <div className="mt-1.5 space-y-2">
                {features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={f}
                      onChange={(e) => {
                        const updated = [...features];
                        updated[i] = e.target.value;
                        setFeatures(updated);
                      }}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-red-600"
                      onClick={() => removeFeature(i)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Add a feature..."
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={addFeature}
                    disabled={!newFeature.trim()}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditingPlan(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
