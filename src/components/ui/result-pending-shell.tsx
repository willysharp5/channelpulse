"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  pending: boolean;
  children: React.ReactNode;
  className?: string;
  /** Shown next to the spinner; keep short. */
  label?: string;
};

/**
 * Wraps result areas (counts + table) while a transition is in flight so users see clear loading feedback.
 */
export function ResultPendingShell({ pending, children, className, label = "Updating results…" }: Props) {
  return (
    <div className={cn("relative", className)}>
      {children}
      {pending ? (
        <div
          aria-busy="true"
          aria-live="polite"
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-[inherit] bg-background/60 backdrop-blur-[1px] dark:bg-background/55"
        >
          <div className="animate-shimmer flex items-center gap-2 rounded-full border border-border/80 bg-card/95 px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
            {label}
          </div>
          <div className="h-1 w-[min(240px,70%)] max-w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/3 rounded-full bg-primary/40 animate-slide-right" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
