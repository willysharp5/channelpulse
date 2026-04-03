"use client";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface CategoryBarItem {
  /** Stable key when labels repeat (e.g. channel id) */
  id?: string;
  label: string;
  /** Second line in legend, e.g. platform */
  sublabel?: string;
  value: number;
  color: string;
}

interface CategoryBarProps {
  data: CategoryBarItem[];
  showLabels?: boolean;
  className?: string;
  /** Tooltip + legend value formatting (default: currency) */
  formatValue?: (value: number) => string;
  /** Tooltip line label, e.g. "Revenue", "Products", "Amount" */
  amountLabel?: string;
}

function SegmentTooltipBody({
  label,
  sublabel,
  value,
  pct,
  formatValue,
  amountLabel,
}: {
  label: string;
  sublabel?: string;
  value: number;
  pct: number;
  formatValue: (value: number) => string;
  amountLabel: string;
}) {
  return (
    <div className="space-y-1 text-left">
      <p className="font-semibold leading-tight">{label}</p>
      {sublabel ? (
        <p className="text-background/80 text-[11px] leading-tight">{sublabel}</p>
      ) : null}
      <p className="tabular-nums">
        {amountLabel}: {formatValue(value)}
      </p>
      <p className="tabular-nums text-background/90">Share: {pct.toFixed(1)}%</p>
    </div>
  );
}

export function CategoryBar({
  data,
  showLabels = true,
  className,
  formatValue = formatCurrency,
  amountLabel = "Revenue",
}: CategoryBarProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {data.map((item, i) => {
          const pct = (item.value / total) * 100;
          const rowKey = item.id ?? `bar-${i}-${item.label}`;
          return (
            <Tooltip key={rowKey}>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className={cn(
                      "h-full min-w-[6px] cursor-crosshair border-0 p-0 transition-[filter] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring",
                      i === 0 && "rounded-l-full",
                      i === data.length - 1 && "rounded-r-full",
                    )}
                    style={{
                      flexGrow: pct,
                      flexBasis: 0,
                      backgroundColor: item.color,
                    }}
                    aria-label={`${item.label}: ${formatValue(item.value)}, ${pct.toFixed(1)} percent of total`}
                  />
                }
              />
              <TooltipContent side="top" className="max-w-[240px]">
                <SegmentTooltipBody
                  label={item.label}
                  sublabel={item.sublabel}
                  value={item.value}
                  pct={pct}
                  formatValue={formatValue}
                  amountLabel={amountLabel}
                />
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      {showLabels && (
        <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((item, i) => {
            const pct = (item.value / total) * 100;
            const rowKey = item.id ?? `legend-${i}-${item.label}`;
            return (
              <div
                key={rowKey}
                className="flex min-w-0 items-start gap-2 rounded-md p-1 text-left"
              >
                <span
                  className="mt-1 size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">{item.label}</span>
                  {item.sublabel ? (
                    <span className="block truncate text-[11px] text-muted-foreground">{item.sublabel}</span>
                  ) : null}
                  <span className="mt-0.5 block font-semibold tabular-nums text-muted-foreground">
                    {formatValue(item.value)}{" "}
                    <span className="font-medium">({pct.toFixed(1)}%)</span>
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
