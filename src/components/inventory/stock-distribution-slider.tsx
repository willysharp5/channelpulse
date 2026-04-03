"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const BINS = 18;

function binOverlapsRange(
  binIndex: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number
): boolean {
  if (domainMax < 1) return true;
  const width = (domainMax + 1) / BINS;
  const start = binIndex * width;
  const end = (binIndex + 1) * width;
  return end > rangeMin && start <= rangeMax;
}

type Props = {
  histogramCounts: number[];
  /** Upper bound of the axis (same scale as histogram bins). */
  domainMax: number;
  min: number;
  max: number;
  onLiveChange: (min: number, max: number) => void;
  onCommit: (min: number, max: number) => void;
  /** Server refresh after committing range — avoids a “snap back” with no feedback. */
  isUpdating?: boolean;
};

export function StockDistributionSlider({
  histogramCounts,
  domainMax,
  min: minProp,
  max: maxProp,
  onLiveChange,
  onCommit,
  isUpdating = false,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ min: minProp, max: maxProp });
  const draggingRef = useRef<"min" | "max" | null>(null);
  const [dragging, setDragging] = useState<"min" | "max" | null>(null);
  const [localMin, setLocalMin] = useState(minProp);
  const [localMax, setLocalMax] = useState(maxProp);

  const histPeak = Math.max(1, ...histogramCounts);

  const sliderMax = Math.max(1, domainMax);

  useEffect(() => {
    stateRef.current = { min: minProp, max: maxProp };
    if (!dragging) {
      setLocalMin(minProp);
      setLocalMax(maxProp);
    }
  }, [minProp, maxProp, dragging]);

  const clientXToValue = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.width <= 0) return null;
      const t = (clientX - r.left) / r.width;
      const clamped = Math.max(0, Math.min(1, t));
      return Math.round(clamped * sliderMax);
    },
    [sliderMax]
  );

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      const v = clientXToValue(e.clientX);
      if (v === null) return;
      const { min: curMin, max: curMax } = stateRef.current;
      if (draggingRef.current === "min") {
        const lo = Math.min(v, curMax);
        stateRef.current = { min: lo, max: curMax };
        setLocalMin(lo);
        onLiveChange(lo, curMax);
      } else if (draggingRef.current === "max") {
        const hi = Math.max(v, curMin);
        stateRef.current = { min: curMin, max: hi };
        setLocalMax(hi);
        onLiveChange(curMin, hi);
      }
    };

    const onUp = () => {
      const { min: lo, max: hi } = stateRef.current;
      draggingRef.current = null;
      setDragging(null);
      onCommit(lo, hi);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, clientXToValue, onLiveChange, onCommit]);

  const startDrag = (which: "min" | "max") => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = which;
    setDragging(which);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onTrackPointerDown = (e: React.PointerEvent) => {
    if (!trackRef.current?.contains(e.target as Node)) return;
    if ((e.target as HTMLElement).closest("[data-thumb]")) return;
    const v = clientXToValue(e.clientX);
    if (v === null) return;
    const { min: curMin, max: curMax } = stateRef.current;
    const distMin = Math.abs(v - curMin);
    const distMax = Math.abs(v - curMax);
    const which = distMin <= distMax ? "min" : "max";
    draggingRef.current = which;
    setDragging(which);
    if (which === "min") {
      const lo = Math.min(v, curMax);
      stateRef.current = { min: lo, max: curMax };
      setLocalMin(lo);
      onLiveChange(lo, curMax);
    } else {
      const hi = Math.max(v, curMin);
      stateRef.current = { min: curMin, max: hi };
      setLocalMax(hi);
      onLiveChange(curMin, hi);
    }
  };

  const pMin = sliderMax > 0 ? (localMin / sliderMax) * 100 : 0;
  const pMax = sliderMax > 0 ? (localMax / sliderMax) * 100 : 100;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Distribution (current filters)</p>
      <div className="relative px-1">
        {isUpdating ? (
          <div
            aria-busy="true"
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-md bg-popover/85 px-2 py-6 backdrop-blur-[2px]"
          >
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-center text-[11px] font-medium text-muted-foreground animate-shimmer">
              Applying range…
            </span>
            <div className="h-1 w-full max-w-[140px] overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/3 rounded-full bg-primary/45 animate-slide-right" />
            </div>
          </div>
        ) : null}
        <div className="flex h-14 items-end gap-px rounded-md bg-muted/40 px-0.5 pt-1">
          {Array.from({ length: BINS }, (_, i) => {
            const c = histogramCounts[i] ?? 0;
            const active = binOverlapsRange(i, sliderMax, localMin, localMax);
            return (
              <div
                key={i}
                className={cn(
                  "min-w-0 flex-1 rounded-sm transition-colors",
                  active
                    ? "bg-blue-500 dark:bg-blue-400"
                    : "bg-blue-500/35 dark:bg-blue-400/25"
                )}
                style={{ height: `${Math.max(10, (c / histPeak) * 100)}%` }}
                title={`${c} items`}
              />
            );
          })}
        </div>

        <div
          ref={trackRef}
          role="presentation"
          className="relative mt-2 h-8 cursor-pointer touch-none select-none"
          onPointerDown={onTrackPointerDown}
        >
          <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted" />
          <div
            className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-blue-500 dark:bg-blue-400"
            style={{
              left: `${pMin}%`,
              width: `${Math.max(pMax - pMin, 0)}%`,
              transition: dragging ? "none" : "left 0.2s ease-out, width 0.2s ease-out",
            }}
          />
          <button
            type="button"
            data-thumb="min"
            aria-label="Minimum stock"
            className="absolute top-1/2 z-10 flex h-[14px] w-[14px] -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full border-2 border-background bg-white shadow-md ring-1 ring-blue-500/40 active:cursor-grabbing dark:bg-zinc-100"
            style={{ left: `${pMin}%`, transition: dragging ? "none" : "left 0.2s ease-out" }}
            onPointerDown={startDrag("min")}
          />
          <button
            type="button"
            data-thumb="max"
            aria-label="Maximum stock"
            className="absolute top-1/2 z-10 flex h-[14px] w-[14px] -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full border-2 border-background bg-white shadow-md ring-1 ring-blue-500/40 active:cursor-grabbing dark:bg-zinc-100"
            style={{ left: `${pMax}%`, transition: dragging ? "none" : "left 0.2s ease-out" }}
            onPointerDown={startDrag("max")}
          />
        </div>
        <p className="mt-1 text-center text-xs tabular-nums text-muted-foreground">
          {localMin} – {localMax} units
        </p>
      </div>
    </div>
  );
}
