"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ArrowLeft, Check, Loader2 } from "lucide-react";
import {
  RiPulseFill,
  RiStore2Fill,
  RiShoppingCart2Fill,
  RiBarChartBoxFill,
  RiLineChartFill,
} from "@remixicon/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CHANNEL_CONFIG } from "@/lib/constants";
import type { Platform } from "@/types";

const COMING_SOON_ONBOARDING: Platform[] = [
  "amazon",
  "etsy",
  "tiktok",
];

interface OnboardingWizardProps {
  userName?: string;
  onComplete?: () => void;
}

const STEPS = [
  { id: "welcome", title: "Welcome" },
  { id: "connect", title: "Connect Store" },
  { id: "ready", title: "You're Ready" },
];

const WELCOME_FEATURES = [
  {
    icon: RiStore2Fill,
    title: "Connect your stores",
    desc: "Link Shopify, Amazon, and more via secure OAuth",
  },
  {
    icon: RiShoppingCart2Fill,
    title: "Orders sync automatically",
    desc: "We pull your orders, products, and revenue data",
  },
  {
    icon: RiBarChartBoxFill,
    title: "See everything in one dashboard",
    desc: "Revenue, profit, trends — all channels combined",
  },
];

const READY_FEATURES = [
  {
    icon: RiLineChartFill,
    title: "Track revenue & orders",
    desc: "See daily, weekly, and monthly trends across all channels",
  },
  {
    icon: RiBarChartBoxFill,
    title: "Analyze your P&L",
    desc: "Set your costs and see real profit margins per channel",
  },
  {
    icon: RiStore2Fill,
    title: "Connect more channels anytime",
    desc: "Add Amazon, eBay, Etsy from Settings when you're ready",
  },
];

export function OnboardingWizard({ userName, onComplete }: OnboardingWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [shopDomain, setShopDomain] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [postConnectSync, setPostConnectSync] = useState<"idle" | "running" | "done" | "error">("idle");

  const syncingParam = searchParams.get("syncing") === "true";
  const syncChannelId = searchParams.get("channelId");

  useEffect(() => {
    if (!syncingParam || !syncChannelId) return;
    setPostConnectSync("running");
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/sync/shopify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelId: syncChannelId }),
        });
        if (cancelled) return;
        if (res.ok) {
          setPostConnectSync("done");
          router.replace("/onboarding");
          setStep(2);
        } else {
          setPostConnectSync("error");
          router.replace("/onboarding");
        }
      } catch {
        if (!cancelled) {
          setPostConnectSync("error");
          router.replace("/onboarding");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [syncingParam, syncChannelId, router]);

  if (syncingParam && syncChannelId && postConnectSync === "running") {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border/60 shadow-lg">
          <CardContent className="pt-10 pb-10 text-center space-y-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Syncing your store</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Pulling orders, line items, and inventory. This can take a minute for large catalogs.
              </p>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
        <div className="flex items-center justify-center gap-2.5 mb-8">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className="relative flex items-center justify-center"
            >
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step
                    ? "w-8 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                    : i < step
                      ? "w-2 bg-amber-500"
                      : "w-2 bg-muted"
                }`}
              />
            </div>
          ))}
        </div>

        {step === 0 && (
          <Card className="border-border/60 shadow-lg">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-amber-500/10">
                <RiPulseFill className="h-8 w-8 text-amber-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Welcome{userName ? `, ${userName}` : ""}!
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Let&apos;s get your multichannel analytics dashboard set up in under 3 minutes.
                </p>
              </div>

              <div className="grid gap-3 text-left">
                {WELCOME_FEATURES.map((feature, idx) => {
                  const Icon = feature.icon;
                  const isActive = idx === 0;
                  return (
                    <div
                      key={feature.title}
                      className={`flex items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                        isActive
                          ? "border-amber-300/60 bg-amber-50/50 dark:border-amber-700/40 dark:bg-amber-950/30"
                          : "border-border/60"
                      }`}
                      style={
                        isActive
                          ? { borderImage: "linear-gradient(135deg, rgb(251 191 36 / 0.5), rgb(245 158 11 / 0.3), rgb(217 119 6 / 0.5)) 1" }
                          : undefined
                      }
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 flex-shrink-0">
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{feature.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{feature.desc}</p>
                      </div>
                    </div>
                  );
                })}
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

        {step === 1 && (
          <Card className="border-border/60 shadow-lg">
            <CardContent className="pt-8 pb-8 space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold tracking-tight">Connect your first store</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Start with Shopify — it takes about 30 seconds. We only request read-only access.
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
                    style={{ backgroundColor: CHANNEL_CONFIG.shopify.color }}
                  >
                    S
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Shopify</p>
                    <p className="text-xs text-muted-foreground">Connect via secure OAuth — read-only access</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Your Shopify store domain</Label>
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

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">More channels coming soon:</p>
                <div className="flex max-h-36 gap-2 overflow-y-auto flex-wrap pr-1">
                  {COMING_SOON_ONBOARDING.map((platform) => (
                    <div
                      key={platform}
                      className="flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground"
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

        {step === 2 && (
          <Card className="border-border/60 shadow-lg">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/20">
                <Check className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">You&apos;re all set!</h2>
                <p className="mt-2 text-muted-foreground">
                  Your dashboard is ready. Here&apos;s what you can do:
                </p>
              </div>

              <div className="grid gap-3 text-left">
                {READY_FEATURES.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={feature.title}
                      className="flex items-start gap-3 rounded-xl border border-border/60 p-3.5"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 flex-shrink-0">
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{feature.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{feature.desc}</p>
                      </div>
                    </div>
                  );
                })}
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
