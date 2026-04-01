"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Store,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  BarChart3,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CHANNEL_CONFIG } from "@/lib/constants";

interface OnboardingWizardProps {
  userName?: string;
  onComplete?: () => void;
}

const STEPS = [
  { id: "welcome", title: "Welcome" },
  { id: "connect", title: "Connect Store" },
  { id: "ready", title: "You're Ready" },
];

export function OnboardingWizard({ userName, onComplete }: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [shopDomain, setShopDomain] = useState("");
  const [connecting, setConnecting] = useState(false);

  function handleConnectShopify() {
    let domain = shopDomain.trim();
    if (!domain) return;
    domain = domain.replace(/^https?:\/\//, "").split("/")[0];
    if (!domain.includes(".myshopify.com")) {
      domain = domain + ".myshopify.com";
    }
    setConnecting(true);
    window.location.href = `/api/auth/shopify?shop=${encodeURIComponent(domain)}`;
  }

  function handleSkip() {
    markOnboardingComplete();
    router.push("/");
    router.refresh();
  }

  function handleFinish() {
    markOnboardingComplete();
    router.push("/");
    router.refresh();
  }

  async function markOnboardingComplete() {
    try {
      await fetch("/api/onboarding/complete", { method: "POST" });
    } catch {}
    onComplete?.();
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`h-2 rounded-full transition-all ${
                i === step
                  ? "w-8 bg-amber-500"
                  : i < step
                    ? "w-2 bg-amber-500"
                    : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 0 && (
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500 text-white">
                <Zap className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  Welcome{userName ? `, ${userName}` : ""}!
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Let&apos;s get your multichannel analytics dashboard set up in under 3 minutes.
                </p>
              </div>

              <div className="grid gap-3 text-left">
                <div className="flex items-start gap-3 rounded-lg border p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 flex-shrink-0">
                    <Store className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Connect your stores</p>
                    <p className="text-xs text-muted-foreground">Link Shopify, Amazon, and more via secure OAuth</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 flex-shrink-0">
                    <ShoppingCart className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Orders sync automatically</p>
                    <p className="text-xs text-muted-foreground">We pull your orders, products, and revenue data</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 flex-shrink-0">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">See everything in one dashboard</p>
                    <p className="text-xs text-muted-foreground">Revenue, profit, trends — all channels combined</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setStep(1)}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2"
                size="lg"
              >
                Let&apos;s Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Connect Store */}
        {step === 1 && (
          <Card>
            <CardContent className="pt-8 pb-8 space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold">Connect your first store</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start with Shopify — it takes about 30 seconds. We only request read-only access.
                </p>
              </div>

              {/* Shopify connect */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold text-white"
                    style={{ backgroundColor: CHANNEL_CONFIG.shopify.color }}
                  >
                    S
                  </div>
                  <div>
                    <p className="font-medium">Shopify</p>
                    <p className="text-xs text-muted-foreground">Connect via secure OAuth — read-only access</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Your Shopify store domain</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="your-store.myshopify.com"
                      value={shopDomain}
                      onChange={(e) => setShopDomain(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleConnectShopify()}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleConnectShopify}
                      disabled={!shopDomain.trim() || connecting}
                      className="bg-[#96BF48] hover:bg-[#7ea03c] text-white"
                    >
                      {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Other channels */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">More channels coming soon:</p>
                <div className="flex gap-2 flex-wrap">
                  {(["amazon", "ebay", "etsy"] as const).map((platform) => (
                    <div
                      key={platform}
                      className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs text-muted-foreground"
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: CHANNEL_CONFIG[platform].color }}
                      />
                      {CHANNEL_CONFIG[platform].label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={() => setStep(0)} className="gap-1">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
                    Skip for now
                  </Button>
                  <Button size="sm" onClick={() => setStep(2)} className="gap-1 bg-amber-500 hover:bg-amber-600 text-white">
                    Next <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Ready */}
        {step === 2 && (
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                <Check className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold">You&apos;re all set!</h2>
                <p className="mt-2 text-muted-foreground">
                  Your dashboard is ready. Here&apos;s what you can do:
                </p>
              </div>

              <div className="grid gap-3 text-left">
                <div className="flex items-start gap-3 rounded-lg border p-3">
                  <TrendingUp className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Track revenue & orders</p>
                    <p className="text-xs text-muted-foreground">See daily, weekly, and monthly trends across all channels</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-3">
                  <BarChart3 className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Analyze your P&L</p>
                    <p className="text-xs text-muted-foreground">Set your costs and see real profit margins per channel</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-3">
                  <Store className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Connect more channels anytime</p>
                    <p className="text-xs text-muted-foreground">Add Amazon, eBay, Etsy from Settings when you&apos;re ready</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="gap-1">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </Button>
                <Button
                  onClick={handleFinish}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white gap-2"
                  size="lg"
                >
                  Go to Dashboard <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
