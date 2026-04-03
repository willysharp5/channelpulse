"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TremorDonutChart } from "@/components/tremor/donut-chart";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCompactCurrency, formatCurrency } from "@/lib/formatters";
import type { ChannelRevenue } from "@/types";
import { cn } from "@/lib/utils";

interface ChannelBreakdownProps {
  data: ChannelRevenue[];
}

/** Scroll the list when there are many rows so the card stays a reasonable height. */
const SCROLL_AFTER_CHANNELS = 6;

export function ChannelBreakdown({ data }: ChannelBreakdownProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const sorted = useMemo(
    () => [...data].sort((a, b) => b.revenue - a.revenue),
    [data]
  );

  useEffect(() => {
    if (selectedIndex !== null && selectedIndex >= sorted.length) {
      setSelectedIndex(null);
    }
  }, [selectedIndex, sorted.length]);

  if (sorted.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Revenue by Channel</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">No channel data yet.</p>
        </CardContent>
      </Card>
    );
  }

  const donutData = sorted.map((entry) => ({
    name: entry.label,
    value: entry.revenue,
    color: entry.color,
  }));

  const listScroll =
    sorted.length >= SCROLL_AFTER_CHANNELS
      ? "max-h-[min(22rem,50vh)] overflow-y-auto overscroll-contain pr-1"
      : "";

  const toggleIndex = (index: number) => {
    setSelectedIndex((s) => (s === index ? null : index));
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Revenue by Channel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-5">
          <div className="flex justify-center pt-1">
            <TremorDonutChart
              data={donutData}
              label="Total"
              valueFormatter={formatCompactCurrency}
              className="mx-auto shrink-0"
              size={sorted.length <= 4 ? 200 : 184}
              selectedIndex={selectedIndex}
              onSliceClick={toggleIndex}
            />
          </div>

          <div className={cn("min-w-0 space-y-3", listScroll)}>
            {sorted.map((entry, idx) => (
              <Tooltip key={entry.channelId}>
                <TooltipTrigger
                  render={
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleIndex(idx)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleIndex(idx);
                        }
                      }}
                      className={cn(
                        "flex cursor-pointer gap-3 rounded-lg py-1.5 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring",
                        selectedIndex === idx && "bg-muted/60 ring-1 ring-border/80"
                      )}
                    >
                      <div
                        className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                          <p
                            className="min-w-0 text-sm font-medium leading-snug [overflow-wrap:anywhere]"
                            title={entry.label}
                          >
                            {entry.label}
                          </p>
                          <div className="flex shrink-0 items-baseline gap-2.5 tabular-nums sm:pt-0.5">
                            <span className="text-sm font-semibold">
                              {formatCompactCurrency(entry.revenue)}
                            </span>
                            <span className="min-w-[2.75rem] text-right text-xs font-medium text-muted-foreground">
                              {entry.percentage}%
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-[width]"
                            style={{
                              width: `${Math.min(100, Math.max(0, entry.percentage))}%`,
                              backgroundColor: entry.color,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  }
                />
                <TooltipContent side="left" className="max-w-[min(90vw,280px)]">
                  <div className="space-y-1 text-left text-xs">
                    <p className="font-semibold leading-snug">{entry.label}</p>
                    <p className="tabular-nums">Revenue: {formatCurrency(entry.revenue)}</p>
                    <p className="tabular-nums text-background/90">Share: {entry.percentage}%</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
