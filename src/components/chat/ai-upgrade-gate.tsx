"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { RiSparklingFill } from "@remixicon/react";
import { Button } from "@/components/ui/button";

export function AiUpgradeGate({ currentPlan }: { currentPlan: string }) {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "growth", returnUrl: "/chat" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
            <RiSparklingFill className="h-5 w-5 text-amber-500" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">AI Insights</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Ask questions about your data in plain language, explore suggested
            reports, and uncover trends — powered by your real synced orders.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-5 space-y-4">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium">Growth plan</p>
            <p className="text-sm text-muted-foreground">$39/mo</p>
          </div>
          <ul className="space-y-2.5">
            {[
              "Natural language queries on orders & revenue",
              "Suggested reports tailored to your channels",
              "P&L analysis & trend detection",
              "Everything in Starter, plus more",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                {f}
              </li>
            ))}
          </ul>
          <Button
            className="h-10 w-full bg-amber-500 text-white shadow-sm hover:bg-amber-600"
            disabled={loading}
            onClick={handleUpgrade}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upgrade to Growth
          </Button>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <p>
            Current plan: <span className="font-medium capitalize text-foreground">{currentPlan}</span>
          </p>
          <Link
            href="/settings?tab=billing"
            className="font-medium text-amber-500 hover:text-amber-600"
          >
            View all plans
          </Link>
        </div>
      </div>
    </div>
  );
}
