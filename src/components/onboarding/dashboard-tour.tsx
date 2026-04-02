"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    selector: '[data-tour="kpis"]',
    title: "Your KPIs",
    body: "Track revenue, orders, units, and profit at a glance. Limits reflect your current plan.",
  },
  {
    selector: '[data-tour="revenue-chart"]',
    title: "Revenue trend",
    body: "See how sales move over time across all connected channels.",
  },
  {
    selector: '[data-tour="channel-breakdown"]',
    title: "Channel mix",
    body: "Compare how each marketplace contributes to total revenue.",
  },
  {
    selector: '[data-tour="date-range"]',
    title: "Date range",
    body: "Switch presets or pick a custom range — it applies across the dashboard.",
  },
] as const;

export function DashboardTour({ initialShow }: { initialShow: boolean }) {
  const [open, setOpen] = useState(initialShow);
  const [step, setStep] = useState(0);
  const [box, setBox] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const updateBox = useCallback(() => {
    if (!open) return;
    const sel = STEPS[step]?.selector;
    if (!sel) return;
    const el = document.querySelector(sel);
    if (!el) {
      setBox(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setBox({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
    });
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    updateBox();
    window.addEventListener("resize", updateBox);
    window.addEventListener("scroll", updateBox, true);
    return () => {
      window.removeEventListener("resize", updateBox);
      window.removeEventListener("scroll", updateBox, true);
    };
  }, [open, updateBox]);

  async function finish() {
    try {
      await fetch("/api/settings/tour-complete", { method: "POST" });
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step >= STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" aria-hidden />
      {box && (
        <div
          className="pointer-events-none fixed z-[101] rounded-lg ring-2 ring-amber-400 ring-offset-2 ring-offset-background shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] transition-all duration-200"
          style={{
            top: box.top - 6,
            left: box.left - 6,
            width: box.width + 12,
            height: box.height + 12,
          }}
        />
      )}
      <div className="absolute bottom-6 left-1/2 w-[min(92vw,380px)] -translate-x-1/2 pointer-events-auto rounded-xl border bg-background p-4 shadow-xl">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Quick tour · {step + 1}/{STEPS.length}
        </p>
        <p className="mt-1 text-base font-semibold">{current.title}</p>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{current.body}</p>
        <div className="mt-4 flex justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={finish}>
            Skip
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => {
                if (isLast) void finish();
                else setStep((s) => s + 1);
              }}
            >
              {isLast ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
