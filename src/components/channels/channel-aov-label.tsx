"use client";

import { CircleQuestionMark } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const AOV_TIP =
  "Average order value (AOV) is the average revenue per order for this channel. It is calculated as this store's revenue for the selected date range divided by its order count in that range.";

export function ChannelAovMetricLabel() {
  return (
    <div className="flex justify-center">
      <span className="inline-flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <span>Avg order value</span>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                className="inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted/50 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="What is average order value?"
              >
                <CircleQuestionMark className="size-2.5" strokeWidth={2} aria-hidden />
              </button>
            }
          />
          <TooltipContent side="top" className="max-w-[280px] text-xs leading-snug">
            {AOV_TIP}
          </TooltipContent>
        </Tooltip>
      </span>
    </div>
  );
}
