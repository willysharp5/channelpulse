"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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

const POPOVER_MAX_W = 380;
const VIEW_PAD = 16;
const GAP = 12;

export function DashboardTour({ initialShow }: { initialShow: boolean }) {
  const [open, setOpen] = useState(initialShow);
  const [step, setStep] = useState(0);
  const [box, setBox] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(null);

  /** Measure target + popover in one layout pass so step changes never use a stale highlight rect. */
  const measureAndPlace = useCallback(() => {
    if (!open) {
      setBox(null);
      setCardPos(null);
      return;
    }
    const sel = STEPS[step]?.selector;
    if (!sel) return;
    const target = document.querySelector(sel);
    if (!target) {
      setBox(null);
      setCardPos(null);
      return;
    }
    const r = target.getBoundingClientRect();
    setBox({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
    });

    const cardEl = cardRef.current;
    if (!cardEl) return;

    const { height: h, width: w } = cardEl.getBoundingClientRect();
    const centerX = r.left + r.width / 2;
    const maxW = Math.min(POPOVER_MAX_W, window.innerWidth - VIEW_PAD * 2);
    const halfW = Math.min(w, maxW) / 2;
    const left = Math.max(VIEW_PAD + halfW, Math.min(centerX, window.innerWidth - VIEW_PAD - halfW));

    const spaceAbove = r.top - VIEW_PAD;
    const fitsAbove = h + GAP <= spaceAbove;
    let top = fitsAbove ? r.top - GAP - h : r.top + r.height + GAP;
    top = Math.max(VIEW_PAD, Math.min(top, window.innerHeight - h - VIEW_PAD));

    setCardPos({ top, left });
  }, [open, step]);

  useLayoutEffect(() => {
    measureAndPlace();
  }, [measureAndPlace]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", measureAndPlace);
    window.addEventListener("scroll", measureAndPlace, true);
    return () => {
      window.removeEventListener("resize", measureAndPlace);
      window.removeEventListener("scroll", measureAndPlace, true);
    };
  }, [open, measureAndPlace]);

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
      <div className="absolute inset-0 z-[100] bg-black/40 pointer-events-auto" aria-hidden />
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
      <div
        ref={cardRef}
        className="pointer-events-auto fixed z-[110] w-[min(92vw,380px)] -translate-x-1/2 rounded-xl border bg-background p-4 shadow-xl"
        style={
          cardPos
            ? { top: cardPos.top, left: cardPos.left }
            : { top: VIEW_PAD, left: "50%", visibility: "hidden" as const }
        }
      >
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
